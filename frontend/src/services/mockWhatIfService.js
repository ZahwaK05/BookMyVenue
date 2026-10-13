/**
 * @file mockWhatIfService.js
 * @description Service adapter for the What-If Simulation Dashboard.
 *
 * NOTE: The backend API has NOT been finalized.
 * UI components must call functions in this service instead of calling fetch() directly.
 * Evaluates hypothetical campus disruptions against mock timetable & venue availability
 * and calculates compatible alternative venue recommendations with explainable rationales.
 */

import { MOCK_CAMPUS_BLOCKS } from './mockCampusData';

/**
 * Pre-configured Demonstration Scenarios
 */
export const MOCK_SIMULATION_PRESETS = [
  {
    id: 'preset-ab1-outage',
    name: '⚡ AB1 Electrical Transformer Maintenance',
    description: 'Complete shutdown of Academic Block 1 (all 4 floors) between 10:00 AM – 02:00 PM.',
    payload: {
      type: 'BLOCK_UNAVAILABLE',
      scopeId: 'AB1',
      scopeLabel: 'Academic Block 1 (AB1)',
      targetDate: '2026-10-08',
      startTime: '10:00',
      endTime: '14:00',
      reason: 'Scheduled electrical transformer inspection and grid maintenance.',
    },
  },
  {
    id: 'preset-proj-failure',
    name: '📽️ AB1-204 Projector Hardware Failure',
    description: 'Blown optical lamp unit in Smart Classroom 204 disrupting scheduled AV lectures.',
    payload: {
      type: 'AMENITY_FAILURE',
      scopeId: 'AB1-204',
      scopeLabel: 'Classroom 204 (AB1-204) — 4K Laser Projector',
      targetDate: '2026-10-08',
      startTime: '11:00',
      endTime: '16:00',
      reason: 'Primary optical lamp blown; room lacks projection capabilities for slides.',
    },
  },
  {
    id: 'preset-aud-ac',
    name: '❄️ CIR Main Auditorium Climate Failure',
    description: 'Centralized AC chiller trip in CIR Auditorium during corporate placement drive.',
    payload: {
      type: 'VENUE_UNAVAILABLE',
      scopeId: 'CIR-Auditorium',
      scopeLabel: 'Amriteshwari Central Auditorium (CIR-Auditorium)',
      targetDate: '2026-10-08',
      startTime: '09:00',
      endTime: '13:00',
      reason: 'HVAC chiller unit coolant leakage; hall unventilated for 400 persons.',
    },
  },
  {
    id: 'preset-surge',
    name: '📈 WeCode Inter-Campus Hackathon Surge',
    description: 'Immediate demand for 3 parallel smart classrooms (60+ capacity, projectors) for coding tracks.',
    payload: {
      type: 'DEMAND_SURGE',
      scopeId: 'CAMPUS_WIDE',
      scopeLabel: 'Campus-wide Venue Surge (3 Classrooms)',
      targetDate: '2026-10-08',
      startTime: '13:00',
      endTime: '17:00',
      reason: 'Spontaneous round-2 technical evaluation requiring 3 isolated presentation spaces.',
      surgeParams: {
        venueType: 'classroom',
        neededCount: 3,
        minCapacity: 60,
        requiredAmenities: ['Projector', 'Audio System'],
      },
    },
  },
];

/**
 * Helper: Find all candidate venues across campus that are NOT in the affected scope
 */
function getAvailableAlternativePool(excludedScopeId, scenarioType) {
  const pool = [];
  MOCK_CAMPUS_BLOCKS.forEach((block) => {
    // If block outage, skip entire block
    if (scenarioType === 'BLOCK_UNAVAILABLE' && block.code === excludedScopeId) {
      return;
    }

    block.floors.forEach((floor) => {
      floor.venues.forEach((v) => {
        // If venue outage, skip this venue
        if (scenarioType === 'VENUE_UNAVAILABLE' && (v.id === excludedScopeId || v.code === excludedScopeId)) {
          return;
        }

        // Only consider operational or slightly degraded venues
        if (v.operationalStatus === 'OPERATIONAL' || v.operationalStatus === 'DEGRADED') {
          pool.push({
            venueId: v.id,
            venueCode: v.code,
            venueName: v.name,
            blockCode: v.blockId,
            floorNumber: v.floorNumber,
            venueType: v.type,
            capacity: v.capacity,
            amenities: v.amenities || [],
            operationalStatus: v.operationalStatus,
            upcomingSchedule: v.upcomingSchedule || [],
            occupancyState: v.occupancyState,
          });
        }
      });
    });
  });
  return pool;
}

/**
 * Searches and scores candidate alternative rooms for an affected session
 */
function findAndRankAlternatives(session, candidatePool) {
  const ranked = [];

  candidatePool.forEach((candidate) => {
    // 1. Capacity check: must satisfy expected attendees
    if (candidate.capacity < session.expectedAttendees) return;

    // 2. Type compatibility: classroom -> classroom; hall -> hall/auditorium
    const isExactType = candidate.venueType === session.originalVenueType;
    const isAcceptableFallback =
      session.originalVenueType === 'classroom'
        ? candidate.venueType === 'classroom' || candidate.venueType === 'hall'
        : candidate.venueType === session.originalVenueType;

    if (!isAcceptableFallback) return;

    // 3. Timetable / booking collision check:
    // Candidate cannot be occupied right now if session begins now, or have collision in upcomingSchedule
    const hasCollision = candidate.upcomingSchedule.some((s) => {
      // Overlap check (s.startTime < session.endTime && session.startTime < s.endTime)
      return s.startTime < session.endTime && session.startTime < s.endTime;
    });

    if (hasCollision) return;

    // 4. Amenities check
    const candidateAmenityNames = candidate.amenities
      .filter((a) => a.health === 'FUNCTIONAL')
      .map((a) => a.name.toLowerCase());

    const matchedAmenities = [];
    const missingAmenities = [];

    session.requiredAmenities.forEach((req) => {
      const found = candidateAmenityNames.some((c) => c.includes(req.toLowerCase()));
      if (found) {
        matchedAmenities.push(req);
      } else {
        missingAmenities.push(req);
      }
    });

    // If session required projector and candidate lacks it, skip
    if (session.requiredAmenities.includes('Projector') && missingAmenities.includes('Projector')) {
      return;
    }

    // 5. Score computation (0 - 100)
    let score = 70;

    // Capacity fit (closer to needed size = higher score; too large = slight penalty)
    const capacityRatio = candidate.capacity / session.expectedAttendees;
    if (capacityRatio >= 1.0 && capacityRatio <= 1.3) score += 18;
    else if (capacityRatio > 1.3 && capacityRatio <= 1.8) score += 12;
    else score += 5;

    // Type match
    if (isExactType) score += 8;

    // Proximity: same floor/adjacent block
    if (candidate.blockCode === 'AB2' && session.originalVenueCode.startsWith('AB1')) score += 4;

    // Operational health
    if (candidate.operationalStatus === 'OPERATIONAL') score += 5;

    // Rationale construction
    const reasonParts = [
      `Sufficient capacity of ${candidate.capacity} seats (needed: ${session.expectedAttendees})`,
      missingAmenities.length === 0 ? 'All required amenities functional' : `Missing: ${missingAmenities.join(', ')}`,
      `Conflict-free slot confirmed on campus schedule`,
      `Located on ${candidate.blockCode} Level ${candidate.floorNumber}`,
    ];

    ranked.push({
      venueId: candidate.venueId,
      venueCode: candidate.venueCode,
      venueName: candidate.venueName,
      blockCode: candidate.blockCode,
      floorNumber: candidate.floorNumber,
      venueType: candidate.venueType,
      capacity: candidate.capacity,
      compatibilityScore: Math.min(99, score),
      matchedAmenities,
      missingAmenities,
      operationalStatus: candidate.operationalStatus,
      conflictFree: true,
      recommendationReason: reasonParts.join('; '),
    });
  });

  // Sort descending by compatibility score
  return ranked.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
}

/**
 * Main What-If Simulation Runner
 * @param {import('../types/whatIf').WhatIfScenarioPayload} scenario
 * @returns {Promise<import('../types/whatIf').SimulationResultReport>}
 */
export async function runWhatIfSimulation(scenario) {
  // Simulate heavy constraint solving with artificial latency (650ms)
  await new Promise((resolve) => setTimeout(resolve, 650));

  const candidatePool = getAvailableAlternativePool(scenario.scopeId, scenario.type);
  const affectedSessions = [];

  // 1. Gather affected sessions based on scenario type
  if (scenario.type === 'BLOCK_UNAVAILABLE') {
    const targetBlock = MOCK_CAMPUS_BLOCKS.find((b) => b.code === scenario.scopeId);
    if (targetBlock) {
      targetBlock.floors.forEach((f) => {
        f.venues.forEach((v) => {
          if (v.currentOccupant) {
            affectedSessions.push({
              bookingId: `aff-${v.code}-curr`,
              originalVenueId: v.id,
              originalVenueCode: v.code,
              originalVenueName: v.name,
              originalVenueType: v.type,
              originalCapacity: v.capacity,
              title: v.currentOccupant.title,
              requesterName: v.currentOccupant.host,
              requesterRole: v.currentOccupant.type === 'timetable_class' ? 'faculty' : 'student',
              expectedAttendees: v.currentOccupant.attendeeCount,
              startTime: scenario.startTime || '10:00',
              endTime: scenario.endTime || '11:30',
              requiredAmenities: ['Projector', 'Audio System'],
              conflictType: v.currentOccupant.type === 'timetable_class' ? 'TIMETABLE_CLASS' : 'APPROVED_EVENT',
              impactReason: `Entire Block ${scenario.scopeId} is shut down for: ${scenario.reason}`,
            });
          }

          // Also check upcoming schedule
          (v.upcomingSchedule || []).forEach((sched) => {
            affectedSessions.push({
              bookingId: `aff-${v.code}-${sched.id}`,
              originalVenueId: v.id,
              originalVenueCode: v.code,
              originalVenueName: v.name,
              originalVenueType: v.type,
              originalCapacity: v.capacity,
              title: sched.title,
              requesterName: sched.organizer,
              requesterRole: sched.type === 'class' ? 'faculty' : 'student',
              expectedAttendees: Math.round(v.capacity * 0.9),
              startTime: sched.startTime,
              endTime: sched.endTime,
              requiredAmenities: ['Projector'],
              conflictType: sched.type === 'class' ? 'TIMETABLE_CLASS' : 'APPROVED_EVENT',
              impactReason: `Block ${scenario.scopeId} outage during scheduled session window.`,
            });
          });
        });
      });
    }
  } else if (scenario.type === 'VENUE_UNAVAILABLE') {
    // Single room disruption (e.g. CIR-Auditorium)
    let foundVenue = null;
    MOCK_CAMPUS_BLOCKS.forEach((b) => {
      b.floors.forEach((f) => {
        const match = f.venues.find((v) => v.code === scenario.scopeId || v.id === scenario.scopeId);
        if (match) foundVenue = match;
      });
    });

    if (foundVenue) {
      if (foundVenue.currentOccupant) {
        affectedSessions.push({
          bookingId: `aff-${foundVenue.code}-curr`,
          originalVenueId: foundVenue.id,
          originalVenueCode: foundVenue.code,
          originalVenueName: foundVenue.name,
          originalVenueType: foundVenue.type,
          originalCapacity: foundVenue.capacity,
          title: foundVenue.currentOccupant.title,
          requesterName: foundVenue.currentOccupant.host,
          requesterRole: foundVenue.currentOccupant.type === 'timetable_class' ? 'faculty' : 'student',
          expectedAttendees: foundVenue.currentOccupant.attendeeCount,
          startTime: scenario.startTime,
          endTime: scenario.endTime,
          requiredAmenities: ['Projector', 'Audio System', 'AC'],
          conflictType: foundVenue.currentOccupant.type === 'timetable_class' ? 'TIMETABLE_CLASS' : 'APPROVED_EVENT',
          impactReason: `Venue ${foundVenue.code} closed: ${scenario.reason}`,
        });
      }

      (foundVenue.upcomingSchedule || []).forEach((sched) => {
        affectedSessions.push({
          bookingId: `aff-${foundVenue.code}-${sched.id}`,
          originalVenueId: foundVenue.id,
          originalVenueCode: foundVenue.code,
          originalVenueName: foundVenue.name,
          originalVenueType: foundVenue.type,
          originalCapacity: foundVenue.capacity,
          title: sched.title,
          requesterName: sched.organizer,
          requesterRole: sched.type === 'class' ? 'faculty' : 'student',
          expectedAttendees: Math.round(foundVenue.capacity * 0.9),
          startTime: sched.startTime,
          endTime: sched.endTime,
          requiredAmenities: ['Projector', 'Audio System'],
          conflictType: sched.type === 'class' ? 'TIMETABLE_CLASS' : 'APPROVED_EVENT',
          impactReason: `Venue ${foundVenue.code} outage: ${scenario.reason}`,
        });
      });
    }
  } else if (scenario.type === 'AMENITY_FAILURE') {
    // Equipment failure in target room (e.g. AB1-204)
    let foundVenue = null;
    MOCK_CAMPUS_BLOCKS.forEach((b) => {
      b.floors.forEach((f) => {
        const match = f.venues.find((v) => v.code === scenario.scopeId || v.id === scenario.scopeId);
        if (match) foundVenue = match;
      });
    });

    if (foundVenue) {
      (foundVenue.upcomingSchedule || []).forEach((sched) => {
        affectedSessions.push({
          bookingId: `aff-${foundVenue.code}-${sched.id}`,
          originalVenueId: foundVenue.id,
          originalVenueCode: foundVenue.code,
          originalVenueName: foundVenue.name,
          originalVenueType: foundVenue.type,
          originalCapacity: foundVenue.capacity,
          title: sched.title,
          requesterName: sched.organizer,
          requesterRole: sched.type === 'class' ? 'faculty' : 'student',
          expectedAttendees: Math.round(foundVenue.capacity * 0.85),
          startTime: sched.startTime,
          endTime: sched.endTime,
          requiredAmenities: ['Projector'],
          conflictType: sched.type === 'class' ? 'TIMETABLE_CLASS' : 'APPROVED_EVENT',
          impactReason: `Critical Projector failure in ${foundVenue.code}. Session requires multimedia projection.`,
        });
      });
    }
  } else if (scenario.type === 'DEMAND_SURGE') {
    // Generate synthetic surge demands
    const surgeCount = scenario.surgeParams?.neededCount || 3;
    const minCap = scenario.surgeParams?.minCapacity || 60;

    for (let i = 1; i <= surgeCount; i++) {
      affectedSessions.push({
        bookingId: `aff-surge-${i}`,
        originalVenueId: 'SURGE_REQUEST',
        originalVenueCode: `Surge Track #${i}`,
        originalVenueName: `Unallocated Surge Requirement #${i}`,
        originalVenueType: scenario.surgeParams?.venueType || 'classroom',
        originalCapacity: minCap,
        title: `WeCode Hackathon Track ${i}`,
        requesterName: 'WeCode Club Organizing Committee',
        requesterRole: 'student',
        expectedAttendees: minCap,
        startTime: scenario.startTime || '13:00',
        endTime: scenario.endTime || '17:00',
        requiredAmenities: scenario.surgeParams?.requiredAmenities || ['Projector', 'Audio System'],
        conflictType: 'APPROVED_EVENT',
        impactReason: `Unplanned demand surge for ${scenario.surgeParams?.venueType || 'classroom'} (Cap: ${minCap}+).`,
      });
    }
  }

  // 2. Compute Reallocation Recommendations for each affected session
  let autoReallocatableCount = 0;
  let unresolvableCount = 0;
  let affectedClasses = 0;
  let affectedBookings = 0;

  const reallocations = affectedSessions.map((session) => {
    if (session.conflictType === 'TIMETABLE_CLASS') affectedClasses += 1;
    else affectedBookings += 1;

    const alternatives = findAndRankAlternatives(session, candidatePool);
    const topMatch = alternatives[0] || null;

    if (topMatch) {
      autoReallocatableCount += 1;
      return {
        bookingId: session.bookingId,
        affectedItem: session,
        recommendedAlternative: topMatch,
        fallbackCandidates: alternatives.slice(1, 4),
        resolutionStatus: 'RESOLVABLE',
      };
    } else {
      unresolvableCount += 1;
      return {
        bookingId: session.bookingId,
        affectedItem: session,
        recommendedAlternative: null,
        fallbackCandidates: [],
        resolutionStatus:
          session.expectedAttendees > 300
            ? 'UNRESOLVABLE_NO_CAPACITY'
            : 'UNRESOLVABLE_TIMETABLE_COLLISION',
      };
    }
  });

  return {
    scenarioId: `sim-run-${Date.now()}`,
    scenario,
    executedAt: new Date().toISOString(),
    metrics: {
      totalAffectedSessions: affectedSessions.length,
      affectedTimetableClasses: affectedClasses,
      affectedApprovedBookings: affectedBookings,
      autoReallocatableCount,
      unresolvableCriticalCount: unresolvableCount,
      campusCapacityStrainPercentage: Math.min(100, Math.round((affectedSessions.length / 32) * 100)),
    },
    reallocations,
  };
}
