/**
 * @file mockDigitalTwinService.js
 * @description Service adapter for the Digital Twin Campus Dashboard.
 *
 * NOTE: The backend API has NOT been finalized.
 * UI components must call functions in this service instead of calling fetch() directly.
 * When real Azure endpoints are ready, this adapter will map to `GET /api/digital-twin/state`.
 */

import {
  computeCampusTelemetry,
  getInitialCampusGraph,
} from './mockCampusData';

// Maintain in-memory twin state across interactions in the session
let currentTwinState = getInitialCampusGraph('current');

/**
 * Adjusts occupancy and health based on temporal mode
 */
function applyTemporalLens(graph, mode, predictionHours) {
  const cloned = JSON.parse(JSON.stringify(graph));
  cloned.temporalMode = mode;
  cloned.predictionWindowHours = predictionHours;
  cloned.timestamp = new Date().toISOString();

  if (mode === 'predicted') {
    // Simulate near-future state: upcoming sessions transition into active sessions
    cloned.blocks.forEach((block) => {
      block.floors.forEach((floor) => {
        floor.venues.forEach((v) => {
          if (v.upcomingSchedule && v.upcomingSchedule.length > 0) {
            const nextSession = v.upcomingSchedule[0];
            v.occupancyState = nextSession.type === 'class' ? 'CLASS_IN_SESSION' : 'EVENT_OCCUPIED';
            v.currentOccupant = {
              type: nextSession.type === 'class' ? 'timetable_class' : 'booking_event',
              title: `[Predicted] ${nextSession.title}`,
              host: nextSession.organizer,
              attendeeCount: Math.round(v.capacity * 0.85),
              startsAt: nextSession.startTime,
              endsAt: nextSession.endTime,
            };
          } else if (v.occupancyState !== 'VACANT') {
            // Free up currently occupied rooms that have no upcoming session
            v.occupancyState = 'VACANT';
            v.currentOccupant = null;
          }

          // If room has degraded equipment, predict slight health risk degradation
          if (v.operationalStatus === 'DEGRADED') {
            v.healthScore = Math.max(50, v.healthScore - (predictionHours >= 24 ? 12 : 5));
          }
        });
      });
    });
  } else if (mode === 'historical') {
    // Simulate historical past 7-day average utilization
    cloned.blocks.forEach((block) => {
      block.floors.forEach((floor) => {
        floor.venues.forEach((v) => {
          v.occupancyState = 'VACANT';
          v.currentOccupant = null;
          // Normalize health scores to past aggregated average
          v.healthScore = Math.min(100, Math.max(75, v.healthScore + 2));
        });
      });
    });
  }

  cloned.telemetry = computeCampusTelemetry(cloned.blocks);
  return cloned;
}

/**
 * Fetch the complete campus Digital Twin graph
 * @param {'current' | 'predicted' | 'historical'} temporalMode
 * @param {number} [predictionHours=2]
 * @returns {Promise<import('../types/digitalTwin').CampusTwinGraph>}
 */
export async function getCampusTwinGraph(temporalMode = 'current', predictionHours = 2) {
  // Simulate realistic network latency (250ms)
  await new Promise((resolve) => setTimeout(resolve, 250));
  return applyTemporalLens(currentTwinState, temporalMode, predictionHours);
}

/**
 * Fetch detailed twin state for a single venue
 * @param {string} venueId
 * @returns {Promise<import('../types/digitalTwin').VenueTwinNode|null>}
 */
export async function getVenueTwinDetail(venueId) {
  await new Promise((resolve) => setTimeout(resolve, 150));

  for (const block of currentTwinState.blocks) {
    for (const floor of block.floors) {
      const match = floor.venues.find((v) => v.id === venueId || v.code === venueId);
      if (match) return JSON.parse(JSON.stringify(match));
    }
  }
  return null;
}

/**
 * Submit an equipment/venue defect report
 * In mock mode: immediately updates in-memory twin state (OPERATIONAL -> DEGRADED/MAINTENANCE)
 * @param {Object} payload
 * @returns {Promise<{ success: boolean, updatedVenue: import('../types/digitalTwin').VenueTwinNode }>}
 */
export async function submitVenueIssueReport({
  venueId,
  amenityId,
  issueType,
  description,
  severity = 'medium',
}) {
  await new Promise((resolve) => setTimeout(resolve, 350));

  let targetVenue = null;

  for (const block of currentTwinState.blocks) {
    for (const floor of block.floors) {
      const venue = floor.venues.find((v) => v.id === venueId || v.code === venueId);
      if (venue) {
        targetVenue = venue;
        venue.openIssuesCount = (venue.openIssuesCount || 0) + 1;

        // Mark target amenity defective if provided
        if (amenityId && venue.amenities) {
          const am = venue.amenities.find((a) => a.id === amenityId);
          if (am) {
            am.health = 'DEFECTIVE';
            am.defectDescription = `[${issueType}] ${description}`;
            am.lastInspectedAt = new Date().toISOString();
          }
        }

        // Adjust venue operational status based on severity
        if (severity === 'critical' || severity === 'high') {
          venue.operationalStatus = severity === 'critical' ? 'MAINTENANCE' : 'DEGRADED';
          venue.healthScore = Math.max(30, venue.healthScore - 30);
        } else {
          venue.operationalStatus = 'DEGRADED';
          venue.healthScore = Math.max(50, venue.healthScore - 15);
        }

        break;
      }
    }
    if (targetVenue) break;
  }

  // Recalculate macro telemetry
  currentTwinState.telemetry = computeCampusTelemetry(currentTwinState.blocks);

  return {
    success: true,
    updatedVenue: JSON.parse(JSON.stringify(targetVenue)),
  };
}

/**
 * Lightweight mock event subscriber for simulated real-time updates
 * Simulates small occupancy ticks or clock changes
 * @param {Function} onEvent
 * @returns {() => void} Unsubscribe function
 */
export function subscribeMockTwinEvents(onEvent) {
  // Fire periodic telemetry tick every 20 seconds
  const interval = setInterval(() => {
    onEvent?.({
      type: 'TELEMETRY_TICK',
      timestamp: new Date().toISOString(),
      activeOccupancyRate: currentTwinState.telemetry.campusUtilizationRate,
    });
  }, 20000);

  return () => clearInterval(interval);
}

/**
 * Reset mock state back to baseline initial seed
 */
export function resetMockTwinState() {
  currentTwinState = getInitialCampusGraph('current');
}
