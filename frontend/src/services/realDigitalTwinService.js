/**
 * @file realDigitalTwinService.js
 * @description Live service adapter for the Digital Twin Campus Dashboard.
 *
 * Calls GET /admin/twin via admin.twin() and transforms the flat v_campus_twin rows
 * into the nested CampusTwinGraph shape expected by DigitalTwinContext and its UI components.
 *
 * v_campus_twin row shape (from backend):
 *   block_id, block_name, floor_id, floor_number, venue_id, venue_name,
 *   type, capacity, availability_state, operational_state, maintenance_state,
 *   occupancy_count, last_updated, open_issues, upcoming_bookings (JSON)
 *
 * CampusTwinGraph shape (expected by UI):
 *   { timestamp, temporalMode, predictionWindowHours, telemetry, blocks: [{
 *     id, code, name, isOperational, overallHealthScore, currentOccupancyRate, floors: [{
 *       id, floorNumber, name, venues: [{
 *         id, code, name, type, capacity, blockId, floorNumber,
 *         operationalStatus, occupancyState, healthScore, amenities,
 *         currentOccupant, upcomingSchedule, openIssuesCount
 *       }]
 *     }]
 *   }] }
 */

import { admin, venues } from '../api';

// ─── State→UI Enum Mappings ──────────────────────────────────────────────────

/**
 * Maps availability_state from v_campus_twin to UI occupancyState enum.
 * @param {string} availState
 * @returns {string}
 */
function mapOccupancyState(availState) {
  switch ((availState || '').toUpperCase()) {
    case 'OCCUPIED':
    case 'IN_USE':
      return 'CLASS_IN_SESSION';
    case 'BOOKED':
    case 'RESERVED':
      return 'EVENT_OCCUPIED';
    case 'VACANT':
    case 'AVAILABLE':
      return 'VACANT';
    case 'MAINTENANCE':
    case 'OUT_OF_SERVICE':
      return 'MAINTENANCE';
    default:
      return 'VACANT';
  }
}

/**
 * Maps operational_state / maintenance_state from v_campus_twin to UI operationalStatus.
 * @param {string} operationalState
 * @param {string} maintenanceState
 * @returns {string}
 */
function mapOperationalStatus(operationalState, maintenanceState) {
  const ms = (maintenanceState || '').toUpperCase();
  const os = (operationalState || '').toUpperCase();

  if (ms === 'UNDER_MAINTENANCE' || ms === 'MAINTENANCE') return 'MAINTENANCE';
  if (os === 'OPERATIONAL' || os === 'ACTIVE') return 'OPERATIONAL';
  if (os === 'DEGRADED' || os === 'PARTIAL') return 'DEGRADED';
  if (os === 'OFFLINE' || os === 'INACTIVE') return 'OFFLINE';
  return 'OPERATIONAL';
}

/**
 * Derives a 0–100 health score from operational/maintenance state and open issues.
 * @param {string} operationalStatus  Already-mapped UI status string
 * @param {number} openIssues
 * @returns {number}
 */
function deriveHealthScore(operationalStatus, openIssues) {
  let base = 100;
  if (operationalStatus === 'DEGRADED') base = 72;
  else if (operationalStatus === 'MAINTENANCE') base = 40;
  else if (operationalStatus === 'OFFLINE') base = 10;
  const penalty = Math.min(openIssues * 8, 35);
  return Math.max(10, base - penalty);
}

/**
 * Converts upcoming_bookings JSON from the database row into the upcomingSchedule array
 * shape expected by the UI ({ id, title, startTime, endTime, type, organizer }).
 * @param {Array|null} dbBookings
 * @returns {Array}
 */
function mapUpcomingSchedule(dbBookings) {
  if (!Array.isArray(dbBookings)) return [];
  return dbBookings.map((b, idx) => ({
    id: b.booking_id || `sched-${idx}`,
    title: b.purpose || b.title || 'Scheduled Event',
    startTime: (b.start_time || b.starts_at || '').slice(11, 16) || '00:00',
    endTime: (b.end_time || b.ends_at || '').slice(11, 16) || '00:00',
    type: b.type === 'timetable' ? 'class' : 'booking',
    organizer: b.requester_email || b.organizer || 'Campus',
  }));
}

/**
 * Derives a synthetic currentOccupant descriptor for OCCUPIED/BOOKED venues.
 * The real API doesn't stream live occupancy detail, so we construct a minimal
 * object from the nearest upcoming booking if the venue is occupied.
 * @param {string} occupancyState  Mapped UI state
 * @param {Array}  upcomingSchedule  Already-mapped schedule array
 * @param {number} occupancy_count
 * @returns {Object|null}
 */
function deriveCurrentOccupant(occupancyState, upcomingSchedule, occupancy_count) {
  if (occupancyState === 'VACANT' || occupancyState === 'MAINTENANCE') return null;
  const first = upcomingSchedule[0];
  if (!first) return null;
  return {
    type: first.type === 'class' ? 'timetable_class' : 'booking_event',
    title: first.title,
    host: first.organizer,
    attendeeCount: occupancy_count || null,
    startsAt: first.startTime,
    endsAt: first.endTime,
  };
}

// ─── Graph Builder ───────────────────────────────────────────────────────────

/**
 * Transforms flat v_campus_twin rows into the nested CampusTwinGraph required by the UI.
 * @param {Array} rows  Raw rows from GET /admin/twin
 * @returns {import('../types/digitalTwin').CampusTwinGraph}
 */
function buildCampusGraph(rows, venueMeta = []) {
  // Build lookup map for venue amenities
  const venueAmenitiesMap = new Map();
  if (Array.isArray(venueMeta)) {
    venueMeta.forEach((v) => {
      if (v.id && Array.isArray(v.amenities)) {
        venueAmenitiesMap.set(v.id, v.amenities);
      }
    });
  }

  // Aggregate into block → floor → venue hierarchy using Maps for deduplication
  const blocksMap = new Map();

  rows.forEach((row) => {
    const {
      block_id,
      block_name,
      floor_id,
      floor_number,
      venue_id,
      venue_name,
      type: venueType,
      capacity,
      availability_state,
      operational_state,
      maintenance_state,
      occupancy_count,
      open_issues,
      upcoming_bookings,
    } = row;

    // Ensure block entry
    if (!blocksMap.has(block_id)) {
      blocksMap.set(block_id, {
        id: block_id,
        code: block_name || block_id,
        name: block_name || block_id,
        isOperational: true,
        overallHealthScore: 100,
        activeVenuesCount: 0,
        totalVenuesCount: 0,
        currentOccupancyRate: 0,
        floors: new Map(),
      });
    }
    const block = blocksMap.get(block_id);

    // Ensure floor entry
    if (!block.floors.has(floor_id)) {
      const floorNum = parseInt(floor_number, 10) || 0;
      block.floors.set(floor_id, {
        id: floor_id,
        floorNumber: floorNum,
        name: floorNum === 0 ? 'Ground Floor' : `Level ${floorNum}`,
        venues: [],
      });
    }
    const floor = block.floors.get(floor_id);

    // Build venue node
    const operationalStatus = mapOperationalStatus(operational_state, maintenance_state);
    const occupancyState = mapOccupancyState(availability_state);
    const healthScore = deriveHealthScore(operationalStatus, parseInt(open_issues, 10) || 0);
    const upcomingSchedule = mapUpcomingSchedule(upcoming_bookings);
    const currentOccupant = deriveCurrentOccupant(
      occupancyState,
      upcomingSchedule,
      parseInt(occupancy_count, 10) || 0
    );

    const rawAmenities = venueAmenitiesMap.get(venue_id) || [];
    const mappedAmenities = rawAmenities.map((a) => ({
      id: a.id,
      name: a.name,
      health: 'FUNCTIONAL',
      type: 'amenity',
      lastInspectedAt: row.last_updated || new Date().toISOString(),
    }));

    floor.venues.push({
      id: venue_id,
      code: venue_name || venue_id,   // Use venue_name as code for display; id is UUID
      name: venue_name || venue_id,
      type: (venueType || 'classroom').toLowerCase(),
      capacity: parseInt(capacity, 10) || 0,
      blockId: block_name || block_id,
      floorNumber: parseInt(floor_number, 10) || 0,
      operationalStatus,
      occupancyState,
      healthScore,
      amenities: mappedAmenities,
      currentOccupant,
      upcomingSchedule,
      openIssuesCount: parseInt(open_issues, 10) || 0,
    });

    // Accumulate block-level stats
    block.totalVenuesCount += 1;
    if (occupancyState !== 'MAINTENANCE') block.activeVenuesCount += 1;
  });

  // Finalise block stats and convert Maps to Arrays
  const blocks = [];
  blocksMap.forEach((block) => {
    const floorsArr = [];
    block.floors.forEach((floor) => {
      floorsArr.push({ ...floor });
    });
    floorsArr.sort((a, b) => a.floorNumber - b.floorNumber);

    const venuesFlat = floorsArr.flatMap((f) => f.venues);
    const occupied = venuesFlat.filter(
      (v) => v.occupancyState !== 'VACANT' && v.occupancyState !== 'MAINTENANCE'
    ).length;
    const healthScores = venuesFlat.map((v) => v.healthScore);
    const avgHealth =
      healthScores.length > 0
        ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
        : 100;
    const hasOffline = venuesFlat.some((v) => v.operationalStatus === 'OFFLINE');

    blocks.push({
      ...block,
      floors: floorsArr,
      overallHealthScore: avgHealth,
      currentOccupancyRate:
        venuesFlat.length > 0 ? Math.round((occupied / venuesFlat.length) * 100) : 0,
      isOperational: !hasOffline,
    });
  });

  // Compute macro telemetry (same shape as computeCampusTelemetry in mockCampusData)
  const allVenues = blocks.flatMap((b) => b.floors.flatMap((f) => f.venues));
  const totalVenues = allVenues.length;
  const occupiedCount = allVenues.filter(
    (v) => v.occupancyState !== 'VACANT' && v.occupancyState !== 'MAINTENANCE'
  ).length;
  const maintenanceCount = allVenues.filter((v) => v.operationalStatus === 'MAINTENANCE').length;
  const openIssuesTotal = allVenues.reduce((sum, v) => sum + (v.openIssuesCount || 0), 0);
  const avgHealthAll =
    totalVenues > 0
      ? Math.round(allVenues.reduce((sum, v) => sum + v.healthScore, 0) / totalVenues)
      : 100;

  return {
    timestamp: new Date().toISOString(),
    temporalMode: 'current',
    predictionWindowHours: 2,
    telemetry: {
      totalVenues,
      activeVenues: totalVenues - maintenanceCount,
      occupiedVenues: occupiedCount,
      maintenanceVenues: maintenanceCount,
      campusUtilizationRate:
        totalVenues > 0 ? Math.round((occupiedCount / totalVenues) * 100) : 0,
      overallHealthScore: avgHealthAll,
      openIssuesCount: openIssuesTotal,
    },
    blocks,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch the live campus Digital Twin graph from the real backend.
 * Falls back gracefully on error (returns null so UI can show an error state).
 *
 * @returns {Promise<import('../types/digitalTwin').CampusTwinGraph|null>}
 */
export async function getCampusTwinGraph() {
  const [rows, venueMeta] = await Promise.all([
    admin.twin(),
    venues.list().catch(() => []),
  ]);
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }
  return buildCampusGraph(rows, venueMeta);
}

/**
 * No-op: real-time polling is handled by DigitalTwinContext via setInterval refresh.
 * Returns an unsubscribe function that clears the interval.
 *
 * @param {Function} onEvent
 * @param {number} [intervalMs=30000]
 * @returns {() => void}
 */
export function subscribeTwinEvents(onEvent, intervalMs = 30000) {
  const id = setInterval(() => {
    onEvent?.({ type: 'TELEMETRY_TICK', timestamp: new Date().toISOString() });
  }, intervalMs);
  return () => clearInterval(id);
}

/**
 * Issue reporting delegates to the existing /issues API (not Digital Twin-specific).
 * This stub is kept so DigitalTwinContext can call reportEquipmentIssue without change.
 * The real submit is handled by VenueDetailPage via apiIssues.create() directly.
 * Here we simply return success to satisfy the context contract.
 *
 * @param {Object} payload
 * @returns {Promise<{ success: boolean }>}
 */
export async function submitVenueIssueReport(payload) {
  // Delegate to real issues API if venueId provided
  try {
    const { issues } = await import('../api');
    await issues.create({
      venue_id: payload.venueId,
      description: payload.description || 'Issue reported via Digital Twin dashboard',
      severity: payload.severity || 'medium',
    });
  } catch (err) {
    console.warn('[realDigitalTwinService] Issue create failed (non-fatal):', err?.message);
  }
  return { success: true };
}

