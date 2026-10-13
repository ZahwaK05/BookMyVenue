/**
 * @file mockCampusData.js
 * @description MOCK / DEMONSTRATION DATASET for BookMyVenue campus infrastructure.
 *
 * =========================================================================================
 * NOTICE: THIS IS SYNTHETIC DEMONSTRATION DATA FOR TESTING & DEVELOPMENT PURPOSES ONLY.
 * Room numbers, capacities, equipment health scores, timetables, and schedules below are
 * simulated representations to exercise the Digital Twin and What-If Simulation modules.
 * They do not reflect official real-time Amrita Vishwa Vidyapeetham operational records.
 * =========================================================================================
 */

export const MOCK_AMENITY_CATALOG = {
  PROJECTOR: { id: 'amenity-proj-01', name: '4K Laser Projector', type: 'av' },
  AUDIO_SYSTEM: { id: 'amenity-aud-01', name: 'JBL Acoustic Array & Wireless Mics', type: 'av' },
  PODIUM_MIC: { id: 'amenity-mic-01', name: 'Gooseneck Podium Microphone', type: 'av' },
  WHITEBOARD: { id: 'amenity-wb-01', name: 'Magnetic Ceramic Whiteboard', type: 'furniture' },
  SMART_BOARD: { id: 'amenity-sb-01', name: 'Interactive Smart Board', type: 'av' },
  AIR_CONDITIONING: { id: 'amenity-ac-01', name: 'Centralized Climate Control', type: 'climate' },
  STAGE_LIGHTING: { id: 'amenity-light-01', name: 'Dimmable Auditorium Stage Lighting', type: 'lighting' },
  VC_HARDWARE: { id: 'amenity-vc-01', name: 'Polycom Video Conferencing Rig', type: 'av' },
};

/**
 * Creates standard amenity lists with specified health overrides
 */
function createAmenities(hasProjector = true, hasAudio = true, hasAC = true, projectorDefective = false) {
  const list = [
    {
      ...MOCK_AMENITY_CATALOG.WHITEBOARD,
      health: 'FUNCTIONAL',
      lastInspectedAt: '2026-10-01T10:00:00Z',
    },
  ];

  if (hasProjector) {
    list.push({
      ...MOCK_AMENITY_CATALOG.PROJECTOR,
      health: projectorDefective ? 'DEFECTIVE' : 'FUNCTIONAL',
      defectDescription: projectorDefective ? 'Blown optical lamp unit; flickering display' : undefined,
      lastInspectedAt: '2026-10-06T14:30:00Z',
    });
  }

  if (hasAudio) {
    list.push({
      ...MOCK_AMENITY_CATALOG.AUDIO_SYSTEM,
      health: 'FUNCTIONAL',
      lastInspectedAt: '2026-10-05T09:15:00Z',
    });
  }

  if (hasAC) {
    list.push({
      ...MOCK_AMENITY_CATALOG.AIR_CONDITIONING,
      health: 'FUNCTIONAL',
      lastInspectedAt: '2026-10-04T16:00:00Z',
    });
  }

  return list;
}

/**
 * Baseline Mock Campus Hierarchy (4 Blocks)
 */
export const MOCK_CAMPUS_BLOCKS = [
  // ----------------------------------------------------
  // BLOCK 1: ACADEMIC BLOCK 1 (AB1) - Multi-floor Engineering Block
  // ----------------------------------------------------
  {
    id: 'block-ab1',
    code: 'AB1',
    name: 'Academic Block 1',
    description: 'Computer Science, AI & Mathematics Departments with smart lecture halls.',
    isOperational: true,
    overallHealthScore: 88,
    activeVenuesCount: 10,
    totalVenuesCount: 11,
    currentOccupancyRate: 64,
    floors: [
      {
        id: 'floor-ab1-0',
        floorNumber: 0,
        name: 'Ground Floor',
        venues: [
          {
            id: 'v-ab1-001',
            code: 'AB1-001',
            name: 'Lectures Hall 001',
            type: 'classroom',
            capacity: 60,
            blockId: 'AB1',
            floorNumber: 0,
            operationalStatus: 'OPERATIONAL',
            occupancyState: 'CLASS_IN_SESSION',
            healthScore: 98,
            amenities: createAmenities(true, true, true),
            currentOccupant: {
              type: 'timetable_class',
              title: '21CSE301 - Operating Systems',
              host: 'Dr. Anand Raman (CSE)',
              attendeeCount: 54,
              startsAt: '10:00 AM',
              endsAt: '11:30 AM',
            },
            upcomingSchedule: [
              { id: 's-1', title: '21CSE301 - OS', startTime: '10:00', endTime: '11:30', type: 'class', organizer: 'Dr. Anand Raman' },
              { id: 's-2', title: '21MAT202 - Discrete Math', startTime: '13:00', endTime: '14:30', type: 'class', organizer: 'Prof. Geetha' },
              { id: 's-3', title: 'ACM Student Chapter Talk', startTime: '15:30', endTime: '17:00', type: 'booking', organizer: 'Rahul V (Student)' },
            ],
            openIssuesCount: 0,
          },
          {
            id: 'v-ab1-002',
            code: 'AB1-002',
            name: 'Lectures Hall 002',
            type: 'classroom',
            capacity: 60,
            blockId: 'AB1',
            floorNumber: 0,
            operationalStatus: 'OPERATIONAL',
            occupancyState: 'VACANT',
            healthScore: 100,
            amenities: createAmenities(true, true, true),
            currentOccupant: null,
            upcomingSchedule: [
              { id: 's-4', title: '21CSE302 - Database Systems', startTime: '11:45', endTime: '13:15', type: 'class', organizer: 'Dr. Preetha M' },
            ],
            openIssuesCount: 0,
          },
          {
            id: 'v-ab1-003',
            code: 'AB1-003',
            name: 'Systems Programming Lab',
            type: 'lab',
            capacity: 45,
            blockId: 'AB1',
            floorNumber: 0,
            operationalStatus: 'OPERATIONAL',
            occupancyState: 'CLASS_IN_SESSION',
            healthScore: 92,
            amenities: createAmenities(true, false, true),
            currentOccupant: {
              type: 'timetable_class',
              title: '21CSE381 - OS Lab Batch B',
              host: 'Lab Staff (Kavitha S)',
              attendeeCount: 42,
              startsAt: '09:30 AM',
              endsAt: '12:30 PM',
            },
            upcomingSchedule: [],
            openIssuesCount: 0,
          },
        ],
      },
      {
        id: 'floor-ab1-1',
        floorNumber: 1,
        name: 'Level 1',
        venues: [
          {
            id: 'v-ab1-101',
            code: 'AB1-101',
            name: 'Smart Classroom 101',
            type: 'classroom',
            capacity: 60,
            blockId: 'AB1',
            floorNumber: 1,
            operationalStatus: 'OPERATIONAL',
            occupancyState: 'CLASS_IN_SESSION',
            healthScore: 95,
            amenities: createAmenities(true, true, true),
            currentOccupant: {
              type: 'timetable_class',
              title: '21CSE303 - Computer Networks',
              host: 'Dr. Sudheer Nair',
              attendeeCount: 58,
              startsAt: '10:00 AM',
              endsAt: '11:30 AM',
            },
            upcomingSchedule: [
              { id: 's-5', title: '21CSE303 - CN', startTime: '10:00', endTime: '11:30', type: 'class', organizer: 'Dr. Sudheer Nair' },
              { id: 's-6', title: 'IEEE Student Workshop', startTime: '14:00', endTime: '16:00', type: 'booking', organizer: 'Priya K (Student)' },
            ],
            openIssuesCount: 0,
          },
          {
            id: 'v-ab1-102',
            code: 'AB1-102',
            name: 'Smart Classroom 102',
            type: 'classroom',
            capacity: 60,
            blockId: 'AB1',
            floorNumber: 1,
            operationalStatus: 'OPERATIONAL',
            occupancyState: 'VACANT',
            healthScore: 96,
            amenities: createAmenities(true, true, true),
            currentOccupant: null,
            upcomingSchedule: [],
            openIssuesCount: 0,
          },
          {
            id: 'v-ab1-sem1',
            code: 'AB1-Seminar-1',
            name: 'Amrita E-Learning Seminar Hall',
            type: 'hall',
            capacity: 150,
            blockId: 'AB1',
            floorNumber: 1,
            operationalStatus: 'OPERATIONAL',
            occupancyState: 'EVENT_OCCUPIED',
            healthScore: 94,
            amenities: [
              ...createAmenities(true, true, true),
              { ...MOCK_AMENITY_CATALOG.PODIUM_MIC, health: 'FUNCTIONAL', lastInspectedAt: '2026-10-05T09:00:00Z' },
              { ...MOCK_AMENITY_CATALOG.STAGE_LIGHTING, health: 'FUNCTIONAL', lastInspectedAt: '2026-10-05T09:00:00Z' },
            ],
            currentOccupant: {
              type: 'booking_event',
              title: 'National AI Symposium Guest Keynote',
              host: 'AI Department & WeCode Club',
              attendeeCount: 135,
              startsAt: '09:30 AM',
              endsAt: '12:30 PM',
            },
            upcomingSchedule: [
              { id: 's-7', title: 'National AI Keynote', startTime: '09:30', endTime: '12:30', type: 'booking', organizer: 'AI Dept' },
              { id: 's-8', title: 'Faculty Board Meeting', startTime: '14:30', endTime: '16:30', type: 'booking', organizer: 'Dean Academics' },
            ],
            openIssuesCount: 0,
          },
        ],
      },
      {
        id: 'floor-ab1-2',
        floorNumber: 2,
        name: 'Level 2',
        venues: [
          {
            id: 'v-ab1-201',
            code: 'AB1-201',
            name: 'Classroom 201',
            type: 'classroom',
            capacity: 60,
            blockId: 'AB1',
            floorNumber: 2,
            operationalStatus: 'OPERATIONAL',
            occupancyState: 'CLASS_IN_SESSION',
            healthScore: 97,
            amenities: createAmenities(true, true, true),
            currentOccupant: {
              type: 'timetable_class',
              title: '21AIE201 - Intro to Machine Learning',
              host: 'Dr. Meera Chandran',
              attendeeCount: 56,
              startsAt: '10:00 AM',
              endsAt: '11:30 AM',
            },
            upcomingSchedule: [],
            openIssuesCount: 0,
          },
          {
            id: 'v-ab1-204',
            code: 'AB1-204',
            name: 'Classroom 204 (AV Degraded)',
            type: 'classroom',
            capacity: 60,
            blockId: 'AB1',
            floorNumber: 2,
            operationalStatus: 'DEGRADED',
            occupancyState: 'VACANT',
            healthScore: 68,
            amenities: createAmenities(true, true, true, true), // Projector defective!
            currentOccupant: null,
            upcomingSchedule: [
              { id: 's-9', title: '21CSE305 - Compiler Design', startTime: '11:45', endTime: '13:15', type: 'class', organizer: 'Dr. Suresh P' },
              { id: 's-10', title: 'Coding Club Hands-on Session', startTime: '14:00', endTime: '16:00', type: 'booking', organizer: 'Zahwa K (Student)' },
            ],
            openIssuesCount: 1, // Projector failure ticket
          },
          {
            id: 'v-ab1-205',
            code: 'AB1-205',
            name: 'Classroom 205',
            type: 'classroom',
            capacity: 60,
            blockId: 'AB1',
            floorNumber: 2,
            operationalStatus: 'OPERATIONAL',
            occupancyState: 'VACANT',
            healthScore: 100,
            amenities: createAmenities(true, true, true),
            currentOccupant: null,
            upcomingSchedule: [],
            openIssuesCount: 0,
          },
        ],
      },
      {
        id: 'floor-ab1-3',
        floorNumber: 3,
        name: 'Level 3',
        venues: [
          {
            id: 'v-ab1-301',
            code: 'AB1-301',
            name: 'Classroom 301',
            type: 'classroom',
            capacity: 60,
            blockId: 'AB1',
            floorNumber: 3,
            operationalStatus: 'OPERATIONAL',
            occupancyState: 'VACANT',
            healthScore: 95,
            amenities: createAmenities(true, true, true),
            currentOccupant: null,
            upcomingSchedule: [],
            openIssuesCount: 0,
          },
          {
            id: 'v-ab1-sem2',
            code: 'AB1-Seminar-2',
            name: 'Executive Seminar Hall 2',
            type: 'hall',
            capacity: 180,
            blockId: 'AB1',
            floorNumber: 3,
            operationalStatus: 'OPERATIONAL',
            occupancyState: 'RESERVED_IMMINENT',
            healthScore: 98,
            amenities: [
              ...createAmenities(true, true, true),
              { ...MOCK_AMENITY_CATALOG.PODIUM_MIC, health: 'FUNCTIONAL', lastInspectedAt: '2026-10-06T11:00:00Z' },
              { ...MOCK_AMENITY_CATALOG.VC_HARDWARE, health: 'FUNCTIONAL', lastInspectedAt: '2026-10-06T11:00:00Z' },
            ],
            currentOccupant: null,
            upcomingSchedule: [
              { id: 's-11', title: 'Guest Lecture: Distributed Systems', startTime: '11:00', endTime: '13:00', type: 'booking', organizer: 'Dean Research' },
            ],
            openIssuesCount: 0,
          },
        ],
      },
    ],
  },

  // ----------------------------------------------------
  // BLOCK 2: ACADEMIC BLOCK 2 (AB2) - Electronics & Core Disciplines
  // ----------------------------------------------------
  {
    id: 'block-ab2',
    code: 'AB2',
    name: 'Academic Block 2',
    description: 'ECE, EEE, and Robotics Laboratories with high-capacity classrooms.',
    isOperational: true,
    overallHealthScore: 98,
    activeVenuesCount: 8,
    totalVenuesCount: 8,
    currentOccupancyRate: 50,
    floors: [
      {
        id: 'floor-ab2-0',
        floorNumber: 0,
        name: 'Ground Floor',
        venues: [
          {
            id: 'v-ab2-001',
            code: 'AB2-001',
            name: 'Lecture Hall 001',
            type: 'classroom',
            capacity: 70,
            blockId: 'AB2',
            floorNumber: 0,
            operationalStatus: 'OPERATIONAL',
            occupancyState: 'CLASS_IN_SESSION',
            healthScore: 99,
            amenities: createAmenities(true, true, true),
            currentOccupant: {
              type: 'timetable_class',
              title: '21ECE201 - Signals & Systems',
              host: 'Prof. Ramesh K',
              attendeeCount: 65,
              startsAt: '10:00 AM',
              endsAt: '11:30 AM',
            },
            upcomingSchedule: [],
            openIssuesCount: 0,
          },
          {
            id: 'v-ab2-002',
            code: 'AB2-002',
            name: 'Lecture Hall 002',
            type: 'classroom',
            capacity: 70,
            blockId: 'AB2',
            floorNumber: 0,
            operationalStatus: 'OPERATIONAL',
            occupancyState: 'VACANT',
            healthScore: 100,
            amenities: createAmenities(true, true, true),
            currentOccupant: null,
            upcomingSchedule: [],
            openIssuesCount: 0,
          },
        ],
      },
      {
        id: 'floor-ab2-1',
        floorNumber: 1,
        name: 'Level 1',
        venues: [
          {
            id: 'v-ab2-101',
            code: 'AB2-101',
            name: 'Classroom 101',
            type: 'classroom',
            capacity: 70,
            blockId: 'AB2',
            floorNumber: 1,
            operationalStatus: 'OPERATIONAL',
            occupancyState: 'VACANT',
            healthScore: 100,
            amenities: createAmenities(true, true, true),
            currentOccupant: null,
            upcomingSchedule: [],
            openIssuesCount: 0,
          },
          {
            id: 'v-ab2-conf1',
            code: 'AB2-Conf-1',
            name: 'Conference Room Sigma',
            type: 'conference_hall',
            capacity: 80,
            blockId: 'AB2',
            floorNumber: 1,
            operationalStatus: 'OPERATIONAL',
            occupancyState: 'EVENT_OCCUPIED',
            healthScore: 97,
            amenities: [
              ...createAmenities(true, true, true),
              { ...MOCK_AMENITY_CATALOG.PODIUM_MIC, health: 'FUNCTIONAL', lastInspectedAt: '2026-10-05T12:00:00Z' },
              { ...MOCK_AMENITY_CATALOG.VC_HARDWARE, health: 'FUNCTIONAL', lastInspectedAt: '2026-10-05T12:00:00Z' },
            ],
            currentOccupant: {
              type: 'booking_event',
              title: 'Department Curriculum Review Committee',
              host: 'HOD ECE',
              attendeeCount: 35,
              startsAt: '10:00 AM',
              endsAt: '12:00 PM',
            },
            upcomingSchedule: [],
            openIssuesCount: 0,
          },
        ],
      },
      {
        id: 'floor-ab2-2',
        floorNumber: 2,
        name: 'Level 2',
        venues: [
          {
            id: 'v-ab2-201',
            code: 'AB2-201',
            name: 'Smart Classroom 201',
            type: 'classroom',
            capacity: 70,
            blockId: 'AB2',
            floorNumber: 2,
            operationalStatus: 'OPERATIONAL',
            occupancyState: 'CLASS_IN_SESSION',
            healthScore: 98,
            amenities: createAmenities(true, true, true),
            currentOccupant: {
              type: 'timetable_class',
              title: '21EEE302 - Power Electronics',
              host: 'Dr. Saravanan',
              attendeeCount: 62,
              startsAt: '10:00 AM',
              endsAt: '11:30 AM',
            },
            upcomingSchedule: [],
            openIssuesCount: 0,
          },
          {
            // KEY COMPATIBLE ALTERNATIVE FOR AB1-204 & AB1-101
            id: 'v-ab2-203',
            code: 'AB2-203',
            name: 'Smart Classroom 203',
            type: 'classroom',
            capacity: 65,
            blockId: 'AB2',
            floorNumber: 2,
            operationalStatus: 'OPERATIONAL',
            occupancyState: 'VACANT',
            healthScore: 99,
            amenities: createAmenities(true, true, true),
            currentOccupant: null,
            upcomingSchedule: [
              { id: 's-12', title: '21ECE304 - VLSI Design', startTime: '14:00', endTime: '15:30', type: 'class', organizer: 'Dr. Revathi' },
            ],
            openIssuesCount: 0,
          },
          {
            id: 'v-ab2-lab1',
            code: 'AB2-Lab-1',
            name: 'Embedded Systems Lab',
            type: 'lab',
            capacity: 50,
            blockId: 'AB2',
            floorNumber: 2,
            operationalStatus: 'OPERATIONAL',
            occupancyState: 'VACANT',
            healthScore: 96,
            amenities: createAmenities(true, false, true),
            currentOccupant: null,
            upcomingSchedule: [],
            openIssuesCount: 0,
          },
        ],
      },
    ],
  },

  // ----------------------------------------------------
  // BLOCK 3: MECHANICAL BLOCK (MB) - Fabrication, Workshops, Classrooms
  // ----------------------------------------------------
  {
    id: 'block-mb',
    code: 'MB',
    name: 'Mechanical Block',
    description: 'Aerospace, Mechanical Workshops and CAD Computing Studios.',
    isOperational: true,
    overallHealthScore: 95,
    activeVenuesCount: 5,
    totalVenuesCount: 5,
    currentOccupancyRate: 40,
    floors: [
      {
        id: 'floor-mb-0',
        floorNumber: 0,
        name: 'Ground Floor',
        venues: [
          {
            id: 'v-mb-001',
            code: 'MB-001',
            name: 'Advanced Manufacturing Studio',
            type: 'lab',
            capacity: 60,
            blockId: 'MB',
            floorNumber: 0,
            operationalStatus: 'OPERATIONAL',
            occupancyState: 'CLASS_IN_SESSION',
            healthScore: 92,
            amenities: createAmenities(false, true, false),
            currentOccupant: {
              type: 'timetable_class',
              title: '21ME201 - Workshop Practice',
              host: 'Er. Haridas M',
              attendeeCount: 48,
              startsAt: '09:00 AM',
              endsAt: '12:00 PM',
            },
            upcomingSchedule: [],
            openIssuesCount: 0,
          },
          {
            id: 'v-mb-002',
            code: 'MB-002',
            name: 'Classroom 002',
            type: 'classroom',
            capacity: 55,
            blockId: 'MB',
            floorNumber: 0,
            operationalStatus: 'OPERATIONAL',
            occupancyState: 'VACANT',
            healthScore: 97,
            amenities: createAmenities(true, true, true),
            currentOccupant: null,
            upcomingSchedule: [],
            openIssuesCount: 0,
          },
        ],
      },
      {
        id: 'floor-mb-1',
        floorNumber: 1,
        name: 'Level 1',
        venues: [
          {
            id: 'v-mb-101',
            code: 'MB-101',
            name: 'Classroom 101',
            type: 'classroom',
            capacity: 55,
            blockId: 'MB',
            floorNumber: 1,
            operationalStatus: 'OPERATIONAL',
            occupancyState: 'VACANT',
            healthScore: 98,
            amenities: createAmenities(true, true, true),
            currentOccupant: null,
            upcomingSchedule: [],
            openIssuesCount: 0,
          },
          {
            id: 'v-mb-102',
            code: 'MB-102',
            name: 'Classroom 102',
            type: 'classroom',
            capacity: 55,
            blockId: 'MB',
            floorNumber: 1,
            operationalStatus: 'OPERATIONAL',
            occupancyState: 'CLASS_IN_SESSION',
            healthScore: 95,
            amenities: createAmenities(true, true, true),
            currentOccupant: {
              type: 'timetable_class',
              title: '21ME301 - Fluid Mechanics',
              host: 'Dr. Vishnu Nair',
              attendeeCount: 50,
              startsAt: '10:00 AM',
              endsAt: '11:30 AM',
            },
            upcomingSchedule: [],
            openIssuesCount: 0,
          },
        ],
      },
    ],
  },

  // ----------------------------------------------------
  // BLOCK 4: CORPORATE & INDUSTRY RELATIONS (CIR) - Large Auditoriums & Halls
  // ----------------------------------------------------
  {
    id: 'block-cir',
    code: 'CIR',
    name: 'Corporate & Industry Relations',
    description: 'Central campus placement complex, grand auditoriums, and corporate halls.',
    isOperational: true,
    overallHealthScore: 78,
    activeVenuesCount: 3,
    totalVenuesCount: 4,
    currentOccupancyRate: 50,
    floors: [
      {
        id: 'floor-cir-0',
        floorNumber: 0,
        name: 'Ground Floor',
        venues: [
          {
            id: 'v-cir-aud',
            code: 'CIR-Auditorium',
            name: 'Amriteshwari Central Auditorium',
            type: 'auditorium',
            capacity: 400,
            blockId: 'CIR',
            floorNumber: 0,
            operationalStatus: 'OPERATIONAL',
            occupancyState: 'EVENT_OCCUPIED',
            healthScore: 82,
            amenities: [
              ...createAmenities(true, true, true),
              { ...MOCK_AMENITY_CATALOG.STAGE_LIGHTING, health: 'FUNCTIONAL', lastInspectedAt: '2026-10-06T08:00:00Z' },
              { ...MOCK_AMENITY_CATALOG.PODIUM_MIC, health: 'FUNCTIONAL', lastInspectedAt: '2026-10-06T08:00:00Z' },
              { ...MOCK_AMENITY_CATALOG.VC_HARDWARE, health: 'FUNCTIONAL', lastInspectedAt: '2026-10-06T08:00:00Z' },
            ],
            currentOccupant: {
              type: 'booking_event',
              title: 'Annual Campus Placement Orientation Drive',
              host: 'CIR Corporate Relations Team',
              attendeeCount: 380,
              startsAt: '09:00 AM',
              endsAt: '01:00 PM',
            },
            upcomingSchedule: [
              { id: 's-13', title: 'Placement Drive Keynote', startTime: '09:00', endTime: '13:00', type: 'booking', organizer: 'CIR Team' },
            ],
            openIssuesCount: 1, // Notice on secondary stage monitor
          },
          {
            id: 'v-cir-int1',
            code: 'CIR-Interview-1',
            name: 'Corporate Interview Suite 1',
            type: 'conference_hall',
            capacity: 25,
            blockId: 'CIR',
            floorNumber: 0,
            operationalStatus: 'OPERATIONAL',
            occupancyState: 'VACANT',
            healthScore: 100,
            amenities: createAmenities(true, true, true),
            currentOccupant: null,
            upcomingSchedule: [],
            openIssuesCount: 0,
          },
        ],
      },
      {
        id: 'floor-cir-1',
        floorNumber: 1,
        name: 'Level 1',
        venues: [
          {
            id: 'v-cir-hall-a',
            code: 'CIR-Hall-A',
            name: 'Recruitment Presentation Hall A',
            type: 'hall',
            capacity: 120,
            blockId: 'CIR',
            floorNumber: 1,
            operationalStatus: 'OPERATIONAL',
            occupancyState: 'VACANT',
            healthScore: 95,
            amenities: [
              ...createAmenities(true, true, true),
              { ...MOCK_AMENITY_CATALOG.PODIUM_MIC, health: 'FUNCTIONAL', lastInspectedAt: '2026-10-05T10:00:00Z' },
            ],
            currentOccupant: null,
            upcomingSchedule: [],
            openIssuesCount: 0,
          },
          {
            id: 'v-cir-hall-b',
            code: 'CIR-Hall-B',
            name: 'Recruitment Presentation Hall B',
            type: 'hall',
            capacity: 160,
            blockId: 'CIR',
            floorNumber: 1,
            operationalStatus: 'OPERATIONAL',
            occupancyState: 'VACANT',
            healthScore: 98,
            amenities: [
              ...createAmenities(true, true, true),
              { ...MOCK_AMENITY_CATALOG.PODIUM_MIC, health: 'FUNCTIONAL', lastInspectedAt: '2026-10-05T10:00:00Z' },
            ],
            currentOccupant: null,
            upcomingSchedule: [],
            openIssuesCount: 0,
          },
        ],
      },
    ],
  },
];

/**
 * Computes live macro campus telemetry from blocks
 */
export function computeCampusTelemetry(blocks = MOCK_CAMPUS_BLOCKS) {
  let totalVenues = 0;
  let operationalVenues = 0;
  let activeClassesCount = 0;
  let activeEventsCount = 0;
  let openIssuesCount = 0;

  blocks.forEach((b) => {
    b.floors.forEach((f) => {
      f.venues.forEach((v) => {
        totalVenues += 1;
        if (v.operationalStatus === 'OPERATIONAL') operationalVenues += 1;
        if (v.occupancyState === 'CLASS_IN_SESSION') activeClassesCount += 1;
        if (v.occupancyState === 'EVENT_OCCUPIED') activeEventsCount += 1;
        openIssuesCount += v.openIssuesCount || 0;
      });
    });
  });

  const occupiedCount = activeClassesCount + activeEventsCount;
  const campusUtilizationRate = totalVenues > 0 ? Math.round((occupiedCount / totalVenues) * 100) : 0;

  return {
    totalVenues,
    operationalVenues,
    activeClassesCount,
    activeEventsCount,
    openIssuesCount,
    campusUtilizationRate,
  };
}

/**
 * Returns a cloned baseline state
 */
export function getInitialCampusGraph(temporalMode = 'current', predictionHours = 2) {
  const blocks = JSON.parse(JSON.stringify(MOCK_CAMPUS_BLOCKS));
  const telemetry = computeCampusTelemetry(blocks);

  return {
    timestamp: new Date().toISOString(),
    temporalMode,
    predictionWindowHours: temporalMode === 'predicted' ? predictionHours : undefined,
    telemetry,
    blocks,
  };
}

