/**
 * @file whatIf.js
 * @description JSDoc Domain models and type definitions for the What-If Simulation Dashboard.
 * NOTE: All data structures here model the simulation sandbox for evaluating disruptions and alternative venue reallocations.
 */

/**
 * @typedef {'BLOCK_UNAVAILABLE' | 'VENUE_UNAVAILABLE' | 'AMENITY_FAILURE' | 'DEMAND_SURGE'} ScenarioType
 */

/**
 * @typedef {Object} DemandSurgeParams
 * @property {'classroom' | 'hall' | 'conference_hall' | 'lab'} venueType - Target venue type needed.
 * @property {number} neededCount - Quantity of venues required simultaneously.
 * @property {number} minCapacity - Minimum capacity per venue.
 * @property {string[]} [requiredAmenities] - e.g. ['Projector', 'Audio System'].
 */

/**
 * @typedef {Object} WhatIfScenarioPayload
 * @property {string} [id] - Scenario execution run ID.
 * @property {ScenarioType} type - Disruption scenario type.
 * @property {string} scopeId - Code/ID of target block, venue, or amenity (e.g., 'AB1', 'AB1-204', 'AMENITY_PROJECTOR').
 * @property {string} scopeLabel - Friendly display label (e.g. 'Academic Block 1 (AB1)').
 * @property {string} startTime - HH:MM or ISO timestamp.
 * @property {string} endTime - HH:MM or ISO timestamp.
 * @property {string} targetDate - YYYY-MM-DD.
 * @property {string} reason - Justification (e.g., 'Transformer repair', 'Auditorium AC failure').
 * @property {DemandSurgeParams} [surgeParams] - Present only when type === 'DEMAND_SURGE'.
 */

/**
 * @typedef {Object} AffectedBooking
 * @property {string} bookingId - Booking or timetable slot ID.
 * @property {string} originalVenueId - Affected venue UUID.
 * @property {string} originalVenueCode - Room code (e.g. 'AB1-204').
 * @property {string} originalVenueName - Display name.
 * @property {string} originalVenueType - 'classroom' | 'hall' | 'conference_hall' | 'lab' | 'auditorium'.
 * @property {number} originalCapacity - Seating capacity.
 * @property {string} title - Course name or event title.
 * @property {string} requesterName - Faculty instructor or student applicant.
 * @property {'student' | 'faculty'} requesterRole - Role.
 * @property {number} expectedAttendees - Attendance count.
 * @property {string} startTime - HH:MM format.
 * @property {string} endTime - HH:MM format.
 * @property {string[]} requiredAmenities - e.g. ['Projector', 'Audio System'].
 * @property {'TIMETABLE_CLASS' | 'APPROVED_EVENT'} conflictType - Source of conflict.
 * @property {string} impactReason - Specific disruption reason.
 */

/**
 * @typedef {Object} CandidateAlternative
 * @property {string} venueId - Candidate venue UUID.
 * @property {string} venueCode - Room code (e.g., 'AB2-203').
 * @property {string} venueName - Display name.
 * @property {string} blockCode - Building ('AB2').
 * @property {number} floorNumber - Level (1).
 * @property {string} venueType - Classification.
 * @property {number} capacity - Capacity.
 * @property {number} compatibilityScore - Match percentage (0-100).
 * @property {string[]} matchedAmenities - Amenities present and operational.
 * @property {string[]} missingAmenities - Requested amenities not available.
 * @property {string} operationalStatus - 'OPERATIONAL' | 'DEGRADED'.
 * @property {boolean} conflictFree - True if no timetable or booking collision during the slot.
 * @property {string} recommendationReason - Natural language rationale.
 */

/**
 * @typedef {Object} ReallocationRecommendation
 * @property {string} bookingId - Reference to affected session.
 * @property {AffectedBooking} affectedItem - Details of the original session.
 * @property {CandidateAlternative|null} recommendedAlternative - Top-ranked candidate.
 * @property {CandidateAlternative[]} fallbackCandidates - 2nd and 3rd rank choices.
 * @property {'RESOLVABLE' | 'UNRESOLVABLE_NO_CAPACITY' | 'UNRESOLVABLE_TIMETABLE_COLLISION' | 'UNRESOLVABLE_AMENITY_DEFICIT'} resolutionStatus - Solvability status.
 */

/**
 * @typedef {Object} SimulationMetrics
 * @property {number} totalAffectedSessions - Total sessions disrupted.
 * @property {number} affectedTimetableClasses - Lecture classes impacted.
 * @property {number} affectedApprovedBookings - Event bookings impacted.
 * @property {number} autoReallocatableCount - Successfully matched with alternative venues.
 * @property {number} unresolvableCriticalCount - Requires administrative rescheduling or cancellation.
 * @property {number} campusCapacityStrainPercentage - Additional utilization strain injected.
 */

/**
 * @typedef {Object} SimulationResultReport
 * @property {string} scenarioId - Unique simulation execution ID.
 * @property {WhatIfScenarioPayload} scenario - Original scenario parameters.
 * @property {string} executedAt - Timestamp of execution.
 * @property {SimulationMetrics} metrics - Aggregate KPI results.
 * @property {ReallocationRecommendation[]} reallocations - Detailed list of reallocation plans.
 */

export const WHAT_IF_TYPE_TAG = 'BOOKMYVENUE_WHAT_IF_MODELS';

