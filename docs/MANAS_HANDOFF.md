# BookMyVenue — Teammate Handoff Document (Zahwa → Manas)

**Date:** 17 October 2026  
**From:** Zahwa (Frontend & Express Backend Lead)  
**To:** Manas (Database, PostgreSQL Schema, Triggers, & Azure Functions Agent Lead)

---

## 1. Ready-to-Send Handoff Message

> Hi Manas,
> 
> My side of BookMyVenue is complete and fully integrated with your live Azure PostgreSQL database (`bookyvenue`) and your Azure API Management agents.
> 
> Here is a summary of what is live and tested:
> 1. **Backend Route Suite**: All routes are mounted in `backend/index.js` (`/auth`, `/users`, `/bookings`, `/venues`, `/blocks`, `/issues`, `/timetable`, `/recommend`, `/admin`, `/amenities`). The automated test suite `backend/test-api.js` runs with **31/31 tests passing (0 failures)**.
> 2. **Digital Twin**: Live campus view `v_campus_twin` is wired into both the `DigitalTwinDashboard` and the `AdminDashboard`. The frontend polls every 30 seconds and shows real-time equipment status, health scores, and open defect counts.
> 3. **What-If Simulation Engine**: We integrated the three stored procedures (`whatif_venue_closure`, `whatif_block_closure`, `whatif_amenity_failure`) with cascading dropdowns (Block → Venue → Amenity) and date pickers. The results match your summary/details format.
> 4. **AI Agents**: The natural-language Recommendation Agent (`GET /recommend`) and Security XAI Agent (`GET /admin/security/flags`, `POST /admin/security/scan`, `PATCH /admin/security/flags/:id`) are fully connected via APIM and have dedicated admin interfaces.
> 5. **Documentation**: I've compiled `docs/ER_DIAGRAM.md`, `docs/ARCHITECTURE.md`, and `docs/TEST_REPORT.md` reflecting your real schema.
> 
> A few quick notes and schema questions are outlined below for your review.

---

## 2. What Zahwa's Side Delivers

### A. Backend (`backend/`)
- Express server mounted without `/api` prefix, adhering to institutional campus routing.
- Parameterized SQL queries with strict UUID and timestamp validation.
- Centralized error handling returning clean JSON error responses (no raw DB errors leaked).
- Integration test suite ([`backend/test-api.js`](file:///c:/Users/zahwa/Downloads/BookMyVenue/backend/test-api.js)) covering 31 end-to-end scenarios.
- Standalone environment resolution loading `backend/.env` regardless of execution directory.

### B. Frontend (`frontend/`)
- Responsive React 18 + Vite + Tailwind CSS interface matching institutional Amrita branding.
- Live **Digital Twin Campus Dashboard** ([`/digital-twin`](file:///c:/Users/zahwa/Downloads/BookMyVenue/frontend/src/components/digitalTwin/DigitalTwinDashboard.jsx)) with real block hierarchy navigation and live equipment status.
- Live **What-If Simulation Sandbox** ([`/what-if`](file:///c:/Users/zahwa/Downloads/BookMyVenue/frontend/src/components/whatIf/WhatIfDashboard.jsx)) with cascading dropdowns and absorption zone heatmap.
- Dedicated **AI Security (XAI) Dashboard** ([`/security`](file:///c:/Users/zahwa/Downloads/BookMyVenue/frontend/src/components/SecurityDashboardPage.jsx)) with rule filtering, severity badges, and scan triggers.
- Multi-tier **Approvals Queue** ([`/approvals`](file:///c:/Users/zahwa/Downloads/BookMyVenue/frontend/src/components/ApprovalsQueuePage.jsx)) for Block Heads and Deans.
- **AI Venue Finder** ([`/recommend`](file:///c:/Users/zahwa/Downloads/BookMyVenue/frontend/src/components/RecommendationPage.jsx)) converting natural English campus queries into ranked bookings.
- Clean production build: `npm run build` succeeds in <1s with 0 errors.

---

## 3. What-If Output Contract Used

In `realWhatIfService.js` and `backend/routes/admin.js`, we integrated the exact procedure outputs provided:

```json
{
  "summary": {
    "affected_bookings": 2,
    "reassignable": 2,
    "needs_admin_action": 0
  },
  "details": [
    {
      "booking_id": "c1387fb8-3334-45aa-b82d-4bfb4ae6bfbc",
      "booking_range": "[\"2026-10-18 10:00:00\",\"2026-10-18 12:00:00\")",
      "booking_status": "approved",
      "purpose": "ACM Chapter Hands-on Workshop",
      "requester_email": "student@amrita.edu",
      "alternatives_found": 3,
      "suggested_venue": "A102"
    }
  ]
}
```

- **TSRANGE Parsing**: We implemented regex matching for PostgreSQL range strings `["YYYY-MM-DD HH:MM:SS", "YYYY-MM-DD HH:MM:SS")` to correctly display time windows in the UI without breaking on date hyphens.
- **Suggested Venue**: `suggested_venue` is displayed as the proposed target room name for one-click admin reassignment.

---

## 4. Schema Questions & Follow-ups for Manas

1. **`v_campus_twin` Amenity Representation**:
   - `v_campus_twin` currently aggregates `open_issues` and `upcoming_bookings` count, but does not include per-amenity status rows.
   - *Resolution on Frontend:* We fetch `venues.list()` alongside `admin.twin()` to populate monitored equipment in the drawer. If you prefer to include an `amenities JSONB` column in `v_campus_twin` in a future migration, we can consume that directly.
2. **`DEMAND_SURGE` Stored Procedure**:
   - The UI supports hypothetical demand surge inputs (e.g., "Need 3 classrooms with 60+ capacity simultaneously"). Currently, `whatif_venue_closure`, `whatif_block_closure`, and `whatif_amenity_failure` are live in SQL.
   - If you add a `whatif_demand_surge(venue_type, needed_count, min_capacity, date)` function, let me know and we will wire it right up.
3. **Timezone Uniformity**:
   - All booking inputs sent by frontend are formatted as naive local campus timestamps (`YYYY-MM-DDTHH:MM`, without `Z` or timezone offset), matching your `08_fix_timezone.sql` convention.

---

## 5. Verification IDs from Test Flow

For manual verification on your side, the test suite and frontend were verified with:
- **Hall ID**: `17775693-05c7-47d9-8001-c4811b8100fd`
- **Classroom ID**: `c907525c-dc0c-42e1-9bee-f6f5514ce469`
- **Block ID**: `d910796c-1c67-406b-a10b-499dfaf80521` (Block B)
- **API Management Base URL**: `https://bmv-apim-mz.azure-api.net`
