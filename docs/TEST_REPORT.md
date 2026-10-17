# BookMyVenue — Automated Integration Test Report

**Execution Date:** 17 October 2026  
**Environment:** Azure Database for PostgreSQL Flexible Server (`bookyvenue`) via Node.js Express backend  
**Test Suite:** [`backend/test-api.js`](file:///c:/Users/zahwa/Downloads/BookMyVenue/backend/test-api.js)  
**Overall Result:** **31 / 31 PASSED (100% Success Rate)**

---

## 1. Test Suite Summary

```
========================================
BookMyVenue End-to-End API Test Suite
========================================

Server running on port 5000
  ✓ PASS: GET /health returns 200 ok
  ✓ PASS: POST /auth/signup (admin)
  ✓ PASS: POST /auth/signup (student)
  ✓ PASS: POST /auth/signup (faculty)
  ✓ PASS: POST /auth/signup (future block head faculty)
  ✓ PASS: POST /auth/login returns token and user
  ✓ PASS: GET /auth/me returns current user info
  ✓ PASS: GET /blocks returns blocks list
  ✓ PASS: GET /blocks/:id/floors returns floors of block
  ✓ PASS: PATCH /users/:id/block-head assigns faculty to block head
  ✓ PASS: GET /venues finds classroom and hall
  ✓ PASS: GET /amenities returns amenities list
  ✓ PASS: POST /timetable adds a class timetable slot (admin)
  ✓ PASS: GET /timetable returns slots for venue
  ✓ PASS: POST /timetable/bulk adds multiple slots atomically
  ✓ PASS: POST /bookings fails with 409 if slot overlaps scheduled class
  ✓ PASS: POST /bookings (student classroom) creates pending_block_head booking
  ✓ PASS: POST /bookings fails with 409 exclusion constraint on double booking
  ✓ PASS: GET /bookings/queue returns booking for Block Head
  ✓ PASS: POST /bookings/:id/decision (block head approve classroom) -> approved
  ✓ PASS: POST /bookings (student hall) -> pending_block_head -> pending_dean -> approved
  ✓ PASS: POST /bookings (faculty) -> auto-approved immediately
  ✓ PASS: GET /bookings/:id/history returns audit trail
  ✓ PASS: POST /bookings/:id/cancel -> pending_cancellation -> Block Head approves -> cancelled
  ✓ PASS: Issue reporting: POST /issues -> GET /issues -> PATCH /issues/:id/resolve
  ✓ PASS: GET /admin/twin returns live digital twin view
  ✓ PASS: GET /admin/whatif/venue returns simulation data
  ✓ PASS: GET /admin/whatif/block returns simulation data
  ✓ PASS: GET /recommend queries Recommendation Agent
  ✓ PASS: GET /admin/security/flags queries Security Agent
  ✓ PASS: DELETE /timetable/:id deletes single slot (admin)

----------------------------------------
Test Execution Finished: 31 Passed, 0 Failed
----------------------------------------
```

---

## 2. Detailed Test Category Breakdown

### Category 1: Authentication & Identity Management
- **Test 1 (`GET /health`)**: Verifies backend liveness and basic process health.
- **Tests 2–5 (`POST /auth/signup`)**: Validates signup and role enforcement for Admin, Student, Faculty, and Block Head candidates.
- **Test 6 (`POST /auth/login`)**: Confirms bcrypt password verification and JWT token issuance.
- **Test 7 (`GET /auth/me`)**: Validates Bearer token authorization and user profile deserialization.

### Category 2: Campus Hierarchy & Governance
- **Tests 8–9 (`GET /blocks`, `GET /blocks/:id/floors`)**: Confirms block and floor data retrieval.
- **Test 10 (`PATCH /users/:id/block-head`)**: Confirms Admin capability to assign Block Head status to designated faculty.
- **Tests 11–12 (`GET /venues`, `GET /amenities`)**: Confirms venue categorization (classroom vs. hall) and amenity relations.

### Category 3: Timetable Scheduling & Conflict Prevention
- **Test 13 (`POST /timetable`)**: Adds a recurring weekly timetable lecture slot.
- **Test 14 (`GET /timetable`)**: Confirms venue timetable schedule retrieval.
- **Test 15 (`POST /timetable/bulk`)**: Tests atomic multi-slot bulk timetable upload.
- **Test 16 (`POST /bookings` 409 clash)**: Validates that an ad-hoc booking request overlapping a scheduled timetable lecture is rejected with HTTP 409 Conflict.
- **Test 31 (`DELETE /timetable/:id`)**: Verifies administrative deletion and cleanup of timetable slots.

### Category 4: Tiered Booking Workflows & Concurrency
- **Test 17 (`POST /bookings` student classroom)**: Verifies student classroom reservations initialize to `pending_block_head`.
- **Test 18 (`POST /bookings` 409 double booking)**: Confirms PostgreSQL kernel `btree_gist` exclusion constraint prevents double bookings with HTTP 409 Conflict.
- **Test 19 (`GET /bookings/queue`)**: Verifies Block Head queue filtering for their assigned block.
- **Test 20 (`POST /bookings/:id/decision` classroom)**: Verifies single-tier Block Head approval transitions classroom to `approved`.
- **Test 21 (`POST /bookings` student hall)**: Verifies two-tier approval lifecycle (`pending_block_head` → `pending_dean` → `approved`).
- **Test 22 (`POST /bookings` faculty)**: Verifies faculty reservations are immediately auto-approved with an audit record (`tier: 'auto'`).
- **Test 23 (`GET /bookings/:id/history`)**: Confirms complete chronological audit trail retrieval from `booking_approvals`.
- **Test 24 (Cancellation Workflow)**: Validates the cancellation lifecycle (`pending_cancellation` → Block Head approval → `cancelled`).

### Category 5: Venue Maintenance & Digital Twin Telemetry
- **Test 25 (`POST /issues`, `GET /issues`, `PATCH /issues/:id/resolve`)**: Verifies student/faculty defect reporting and resolution by Block Head / Admin.
- **Test 26 (`GET /admin/twin`)**: Verifies retrieval of denormalized live campus twin rows from `v_campus_twin`.

### Category 6: What-If Simulation Engine
- **Test 27 (`GET /admin/whatif/venue`)**: Validates venue closure disruption simulation and alternative venue ranking.
- **Test 28 (`GET /admin/whatif/block`)**: Validates whole-building shutdown simulation.
- **Runtime Verification**: Stored procedures `whatif_venue_closure_summary`, `whatif_venue_closure`, `whatif_block_closure_summary`, `whatif_block_closure`, `whatif_amenity_failure_summary`, and `whatif_amenity_failure` were verified live against Azure PostgreSQL.

### Category 7: AI Agent Gateway Proxies
- **Test 29 (`GET /recommend`)**: Queries natural-language Recommendation Agent through Azure APIM (`bmv-apim-mz.azure-api.net`).
- **Test 30 (`GET /admin/security/flags`)**: Queries Explainable AI Security Agent flags through Azure APIM.

---

## 3. Frontend Build Verification

```
vite v8.1.4 building client environment for production...
transforming...✓ 58 modules transformed.
rendering chunks...
dist/index.html                   0.45 kB │ gzip:   0.29 kB
dist/assets/index-HAnohiCd.css   51.51 kB │ gzip:   9.31 kB
dist/assets/index-CTP-4IYO.js   414.32 kB │ gzip: 112.36 kB
✓ built in 605ms
```
- **Build Status:** 0 compilation errors.
- **Production Asset Output:** Clean static bundle generated in `frontend/dist`.
