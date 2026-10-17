/**
 * @file realWhatIfService.js
 * @description Live service adapter for the What-If Simulation Dashboard.
 *
 * Calls the real admin.whatifVenue / whatifBlock / whatifAmenity endpoints and
 * transforms their { summary, details } response into the SimulationResultReport
 * shape expected by WhatIfContext and its UI components.
 *
 * Real API response shape:
 *   summary: { affected_bookings: number, reassignable: number, needs_admin_action: number }
 *   details: [{
 *     booking_id, booking_range, booking_status, purpose,
 *     requester_email, alternatives_found, suggested_venue
 *   }]
 *
 * Expected UI SimulationResultReport shape:
 *   {
 *     scenarioId, scenario, executedAt,
 *     metrics: {
 *       totalAffectedSessions, affectedTimetableClasses, affectedApprovedBookings,
 *       autoReallocatableCount, unresolvableCriticalCount, campusCapacityStrainPercentage
 *     },
 *     reallocations: [{
 *       bookingId,
 *       affectedItem: { bookingId, title, requesterName, requesterRole,
 *                       originalVenueName, startTime, endTime, impactReason,
 *                       conflictType, expectedAttendees, originalVenueType, originalCapacity },
 *       recommendedAlternative: { venueCode, venueName, blockCode, capacity,
 *                                  compatibilityScore, conflictFree, recommendationReason } | null,
 *       fallbackCandidates: [],
 *       resolutionStatus: 'RESOLVABLE' | 'UNRESOLVABLE_TIMETABLE_COLLISION' | 'REQUIRES_ADMIN'
 *     }]
 *   }
 */

import { admin } from '../api';

// ─── Exported Presets (kept for scenario builder dropdown) ──────────────────

/**
 * Presets are now stub records pointing at live IDs from the database seed.
 * scopeId is set to empty string so the ScenarioBuilderForm renders blank inputs
 * that the user fills with real UUIDs from the venue/block pickers.
 */
export const REAL_SIMULATION_PRESETS = [
  {
    id: 'preset-venue-closure',
    name: '🏛️ Venue Closure',
    description: 'Simulate a single venue being unavailable on a chosen date.',
    payload: {
      type: 'VENUE_UNAVAILABLE',
      scopeId: '',
      scopeLabel: 'Select a venue…',
      targetDate: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '17:00',
      reason: 'Emergency repair or infrastructure failure.',
    },
  },
  {
    id: 'preset-block-closure',
    name: '🏢 Block Closure',
    description: 'Simulate an entire block being closed on a chosen date.',
    payload: {
      type: 'BLOCK_UNAVAILABLE',
      scopeId: '',
      scopeLabel: 'Select a block…',
      targetDate: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '17:00',
      reason: 'Scheduled maintenance or power shutdown.',
    },
  },
  {
    id: 'preset-amenity-failure',
    name: '🔌 Amenity / Equipment Failure',
    description: 'Simulate an amenity (e.g. projector) failing in a specific venue.',
    payload: {
      type: 'AMENITY_FAILURE',
      scopeId: '',
      scopeLabel: 'Select a venue…',
      targetDate: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '17:00',
      reason: 'Equipment hardware failure.',
      amenityId: '',
    },
  },
];

// ─── Response Transformer ───────────────────────────────────────────────────

/**
 * Parse a booking_range string like "2026-10-14T09:00 – 2026-10-14T11:00"
 * into { startTime, endTime } display strings.
 * @param {string} range
 * @returns {{ startTime: string, endTime: string }}
 */
function parseBookingRange(range) {
  if (!range) return { startTime: '--:--', endTime: '--:--' };
  const parts = range.split(/[–—-]{1,3}/); // en-dash, em-dash, or hyphen
  const start = (parts[0] || '').trim();
  const end = (parts[1] || '').trim();
  return {
    startTime: start.length >= 16 ? start.slice(11, 16) : start,
    endTime: end.length >= 16 ? end.slice(11, 16) : end,
  };
}

/**
 * Transforms the real API response into the SimulationResultReport shape.
 *
 * @param {{ summary: Object, details: Array }} apiResponse
 * @param {Object} scenario  The WhatIfScenarioPayload that was submitted
 * @returns {import('../types/whatIf').SimulationResultReport}
 */
function transformApiResponse(apiResponse, scenario) {
  const { summary = {}, details = [] } = apiResponse || {};

  const totalAffected = parseInt(summary.affected_bookings, 10) || details.length;
  const reassignable = parseInt(summary.reassignable, 10) || 0;
  const needsAdmin = parseInt(summary.needs_admin_action, 10) || 0;
  const unresolvable = totalAffected - reassignable - needsAdmin;

  const reallocations = details.map((row, idx) => {
    const bookingId = row.booking_id || `detail-${idx}`;
    const { startTime, endTime } = parseBookingRange(row.booking_range);
    const hasAlternative = !!row.suggested_venue;

    // Build the affectedItem in the shape UI ReallocationCard expects
    const affectedItem = {
      bookingId,
      title: row.purpose || 'Campus Booking',
      requesterName: row.requester_email || 'Unknown',
      requesterRole: 'student',
      originalVenueName: scenario.scopeLabel || 'Affected Venue',
      originalVenueCode: scenario.scopeId || '',
      originalVenueType: 'classroom',
      originalCapacity: 0,
      startTime,
      endTime,
      expectedAttendees: null,
      requiredAmenities: [],
      conflictType: 'APPROVED_EVENT',
      impactReason: scenario.reason || `Venue unavailable: ${scenario.type}`,
    };

    // Build recommendedAlternative from suggested_venue (may be a string name or null)
    let recommendedAlternative = null;
    if (hasAlternative) {
      recommendedAlternative = {
        venueCode: row.suggested_venue,
        venueName: row.suggested_venue,
        blockCode: '',
        floorNumber: null,
        capacity: null,
        compatibilityScore: reassignable > 0 ? 85 : 60,
        matchedAmenities: [],
        missingAmenities: [],
        operationalStatus: 'OPERATIONAL',
        conflictFree: true,
        recommendationReason: `Suggested by What-If engine as a compatible alternative for ${row.purpose || 'this booking'}.`,
      };
    }

    const resolutionStatus = hasAlternative
      ? 'RESOLVABLE'
      : needsAdmin > 0
      ? 'REQUIRES_ADMIN'
      : 'UNRESOLVABLE_TIMETABLE_COLLISION';

    return {
      bookingId,
      affectedItem,
      recommendedAlternative,
      fallbackCandidates: [],
      resolutionStatus,
    };
  });

  // If no details but summary shows affected bookings, create placeholder rows
  if (reallocations.length === 0 && totalAffected > 0) {
    for (let i = 0; i < totalAffected; i++) {
      reallocations.push({
        bookingId: `affected-${i}`,
        affectedItem: {
          bookingId: `affected-${i}`,
          title: `Affected Booking #${i + 1}`,
          requesterName: '—',
          requesterRole: 'student',
          originalVenueName: scenario.scopeLabel || '—',
          originalVenueCode: scenario.scopeId || '',
          originalVenueType: 'classroom',
          originalCapacity: 0,
          startTime: scenario.startTime || '—',
          endTime: scenario.endTime || '—',
          expectedAttendees: null,
          requiredAmenities: [],
          conflictType: 'APPROVED_EVENT',
          impactReason: scenario.reason || `Disruption: ${scenario.type}`,
        },
        recommendedAlternative: i < reassignable ? {
          venueCode: 'TBD',
          venueName: 'Alternative pending admin review',
          blockCode: '',
          floorNumber: null,
          capacity: null,
          compatibilityScore: 70,
          matchedAmenities: [],
          missingAmenities: [],
          operationalStatus: 'OPERATIONAL',
          conflictFree: true,
          recommendationReason: 'Engine found a compatible venue — admin review required.',
        } : null,
        fallbackCandidates: [],
        resolutionStatus: i < reassignable ? 'RESOLVABLE' : 'REQUIRES_ADMIN',
      });
    }
  }

  return {
    scenarioId: `sim-${scenario.type}-${Date.now()}`,
    scenario,
    executedAt: new Date().toISOString(),
    metrics: {
      totalAffectedSessions: totalAffected,
      affectedTimetableClasses: 0,
      affectedApprovedBookings: totalAffected,
      autoReallocatableCount: reassignable,
      unresolvableCriticalCount: Math.max(0, unresolvable),
      campusCapacityStrainPercentage: Math.min(100, Math.round((totalAffected / 20) * 100)),
    },
    reallocations,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Run a What-If simulation against the real backend PostgreSQL functions.
 * Routes to the correct endpoint based on scenario.type.
 *
 * Supported types:
 *   VENUE_UNAVAILABLE  → admin.whatifVenue(venueId, date)
 *   BLOCK_UNAVAILABLE  → admin.whatifBlock(blockId, date)
 *   AMENITY_FAILURE    → admin.whatifAmenity(venueId, amenityId, date)
 *
 * @param {import('../types/whatIf').WhatIfScenarioPayload} scenario
 * @returns {Promise<import('../types/whatIf').SimulationResultReport>}
 */
export async function runWhatIfSimulation(scenario) {
  const { type, scopeId, targetDate, amenityId } = scenario;

  let apiResponse;

  switch (type) {
    case 'VENUE_UNAVAILABLE':
      apiResponse = await admin.whatifVenue(scopeId, targetDate);
      break;

    case 'BLOCK_UNAVAILABLE':
      apiResponse = await admin.whatifBlock(scopeId, targetDate);
      break;

    case 'AMENITY_FAILURE':
      apiResponse = await admin.whatifAmenity(
        scopeId,
        amenityId || scenario.scopeAmenityId || '',
        targetDate
      );
      break;

    default:
      // DEMAND_SURGE and any future types fall through to venue closure
      // (no dedicated backend function yet — surface the summary as-is)
      throw new Error(
        `Scenario type "${type}" is not yet supported by the live backend. ` +
          `Please use VENUE_UNAVAILABLE, BLOCK_UNAVAILABLE, or AMENITY_FAILURE.`
      );
  }

  return transformApiResponse(apiResponse, scenario);
}

