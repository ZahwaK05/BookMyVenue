/**
 * @file digitalTwin.js
 * @description JSDoc Domain models and type definitions for the Digital Twin Campus Dashboard.
 * NOTE: All data structures here model the software-based Digital Twin state for Amrita Vishwa Vidyapeetham campus.
 */

/**
 * @typedef {'OPERATIONAL' | 'DEGRADED' | 'MAINTENANCE' | 'OFFLINE'} OperationalStatus
 * - OPERATIONAL: All core venue equipment and infrastructure functioning normally.
 * - DEGRADED: Minor amenity defect (e.g., secondary mic faulty), but room is usable.
 * - MAINTENANCE: Core equipment under active repair (e.g., primary projector down).
 * - OFFLINE: Physical facility closed or electrical/structural outage.
 */

/**
 * @typedef {'VACANT' | 'CLASS_IN_SESSION' | 'EVENT_OCCUPIED' | 'RESERVED_IMMINENT'} OccupancyState
 * - VACANT: Unoccupied and available.
 * - CLASS_IN_SESSION: Scheduled lecture from class timetable is currently running.
 * - EVENT_OCCUPIED: Approved student or faculty event booking in progress.
 * - RESERVED_IMMINENT: Approved session begins within next 15 minutes.
 */

/**
 * @typedef {'FUNCTIONAL' | 'DEFECTIVE' | 'OFFLINE'} AmenityHealth
 */

/**
 * @typedef {Object} AmenityState
 * @property {string} id - Unique amenity ID.
 * @property {string} name - Equipment name (e.g., 'Projector', 'Audio System', 'AC').
 * @property {string} type - Category ('av', 'climate', 'furniture', 'lighting').
 * @property {AmenityHealth} health - Current health state.
 * @property {string} [defectDescription] - Explanation if defective.
 * @property {string} lastInspectedAt - ISO date string.
 */

/**
 * @typedef {Object} CurrentOccupant
 * @property {'timetable_class' | 'booking_event'} type - Type of activity.
 * @property {string} title - Course or event title.
 * @property {string} host - Faculty member, instructor, or student club lead.
 * @property {number} attendeeCount - Estimated number of people present.
 * @property {string} startsAt - ISO timestamp or HH:MM.
 * @property {string} endsAt - ISO timestamp or HH:MM.
 */

/**
 * @typedef {Object} ScheduleSlot
 * @property {string} id - Unique slot ID.
 * @property {string} title - Course code or booking title.
 * @property {string} startTime - HH:MM format.
 * @property {string} endTime - HH:MM format.
 * @property {'class' | 'booking'} type - Origin.
 * @property {string} organizer - Instructor or applicant name.
 */

/**
 * @typedef {Object} VenueTwinNode
 * @property {string} id - UUID.
 * @property {string} code - Room code (e.g., 'AB1-204').
 * @property {string} name - Display name (e.g., 'Smart Classroom 204').
 * @property {'classroom' | 'hall' | 'conference_hall' | 'lab' | 'auditorium'} type - Venue classification.
 * @property {number} capacity - Maximum seating capacity.
 * @property {string} blockId - Parent block code ('AB1', 'AB2', etc.).
 * @property {number} floorNumber - Floor index (0 = Ground, 1 = 1st Floor, etc.).
 * @property {OperationalStatus} operationalStatus - Current health status.
 * @property {OccupancyState} occupancyState - Current room presence.
 * @property {number} healthScore - 0-100 score computed from equipment & issue history.
 * @property {AmenityState[]} amenities - List of installed amenities and their operational health.
 * @property {CurrentOccupant|null} currentOccupant - Active session details if occupied.
 * @property {ScheduleSlot[]} upcomingSchedule - Daily scheduled timetable and bookings.
 * @property {number} openIssuesCount - Number of active unresolved defect reports.
 */

/**
 * @typedef {Object} FloorNode
 * @property {string} id - Floor UUID.
 * @property {number} floorNumber - Level index (0 = Ground, 1 = Floor 1, etc.).
 * @property {string} name - Display label (e.g., 'Level 2').
 * @property {VenueTwinNode[]} venues - List of venues on this floor.
 */

/**
 * @typedef {Object} BlockNode
 * @property {string} id - Block UUID.
 * @property {string} code - Short code ('AB1', 'AB2', 'MB', 'CIR').
 * @property {string} name - Full building name ('Academic Block 1', etc.).
 * @property {boolean} isOperational - Overall building power & facility status.
 * @property {number} overallHealthScore - 0-100 aggregate building health.
 * @property {number} activeVenuesCount - Number of operational venues.
 * @property {number} totalVenuesCount - Total venues in block.
 * @property {number} currentOccupancyRate - Percentage of venues occupied right now.
 * @property {FloorNode[]} floors - Ordered floors in the block.
 */

/**
 * @typedef {'current' | 'predicted' | 'historical'} TemporalMode
 */

/**
 * @typedef {Object} CampusTwinTelemetry
 * @property {number} totalVenues - All tracked venues across campus.
 * @property {number} operationalVenues - Venues in OPERATIONAL status.
 * @property {number} activeClassesCount - Venues occupied by timetable classes.
 * @property {number} activeEventsCount - Venues occupied by approved bookings.
 * @property {number} openIssuesCount - Total open equipment / facility tickets.
 * @property {number} campusUtilizationRate - Current campus occupancy %.
 */

/**
 * @typedef {Object} CampusTwinGraph
 * @property {string} timestamp - ISO timestamp of state generation.
 * @property {TemporalMode} temporalMode - Active perspective.
 * @property {number} [predictionWindowHours] - If temporalMode === 'predicted' (2, 4, 24).
 * @property {CampusTwinTelemetry} telemetry - Macro statistics.
 * @property {BlockNode[]} blocks - List of the 4 campus blocks.
 */

// Export dummy constant for module compliance
export const DIGITAL_TWIN_TYPE_TAG = 'BOOKMYVENUE_DIGITAL_TWIN_MODELS';

