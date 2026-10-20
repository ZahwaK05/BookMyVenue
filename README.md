# BookMyVenue — Amrita Campus Venue Management & Digital Twin System

BookMyVenue is a cloud-native university campus venue management platform featuring tiered multi-role approval workflows, PostgreSQL kernel exclusion constraints, a software **Digital Twin**, a **What-If Disruption Simulator**, and **Autonomous AI Agents**.

Designed and built for **Amrita Vishwa Vidyapeetham** as a dual submission for DBMS and Cloud Computing coursework by Zahwa and Manas.

> **Project Origin & Attribution**:  
> The user interface originated from an MIT-licensed open-source starter scaffold provided by the **WeCode Community** (React + Vite + Tailwind CSS starter). All database schemas, triggers, PostgreSQL exclusion constraints, backend REST services, Digital Twin adapters, What-If simulation algorithms, and AI agent integrations are original work.

---

## 1. System Features

- **Tiered Multi-Role Approvals**:
  - **Faculty**: Instant auto-approval with non-repudiable audit records.
  - **Student + Classroom**: Designated Block Head approval.
  - **Student + Hall / Conference Hall**: Two-tier approval (Block Head → Dean / Administrator).
  - **Cancellation Lifecycle**: Pending cancellation with Block Head approval.
- **Concurrency & Conflict Prevention**:
  - Database-level exclusion constraints using `btree_gist` (`EXCLUDE USING GIST (venue_id WITH =, booking_range WITH &&)`).
  - Conflict checking against weekly recurring course timetables (`class_timetable`).
- **Software Digital Twin**:
  - Live campus hierarchy (`blocks` → `floors` → `venues`).
  - Real-time operational health scores, defect counts, and 30-second live polling.
- **What-If Disruption Sandbox**:
  - Live simulation of building shutdowns (`BLOCK_UNAVAILABLE`), single room closures (`VENUE_UNAVAILABLE`), and hardware failures (`AMENITY_FAILURE`).
  - Automated compatibility scoring, conflict detection, and proposed reallocation venues.
- **Autonomous AI Layer**:
  - **Venue Recommendation Agent**: Natural-language semantic query parsing via Azure APIM.
  - **AI Security Agent (XAI)**: Rule-based anomaly detection for booking volume spikes, rapid cancellation churn, and slot hoarding with explainable rationales.

---

## 2. Technology Stack

- **Frontend**: React 18, Vite 8, Tailwind CSS (Deployed on **Azure Static Web Apps**)
- **Backend**: Node.js 18+, Express, `pg` (Deployed on **Azure App Service**)
- **Database**: PostgreSQL 16 on **Azure Database for PostgreSQL Flexible Server** (`bookyvenue`)
- **Serverless AI**: Azure Functions (Node.js) via **Azure API Management (APIM)**
- **Storage**: Azure Blob Storage (venue blueprints and photos)

---

## 3. Environment Configuration

All sensitive credentials and connection strings are managed strictly via environment variables. **Never commit `.env` files to source control.**
| Variable | Purpose |
|---|---|
| `ADMIN_SIGNUP_CODE` | Registration code required to create an admin account |
| `OTP_REQUIRED` | Set to `false` only to allow the legacy one-step signup (used by the old test suite) |
| `SMTP_HOST`, `SMTP_PORT` | Mail server for OTP emails |
| `SMTP_USER`, `SMTP_PASS` | Mail account credentials (use an app password) |
| `SMTP_FROM` | Sender shown on OTP emails |
| `JWT_SECRET` | Secret used to sign and verify JWT authentication tokens |

### Backend Configuration (`backend/.env`)

Create a `.env` file inside the `backend/` directory:

```ini
# Server Port
PORT=5000

# Azure Database for PostgreSQL Connection String (SSL enabled)
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/bookyvenue?sslmode=require

# JWT Secret for Session Tokens
JWT_SECRET=<your_secure_random_jwt_secret>

# Azure API Management Gateway (AI Agents)
APIM_BASE_URL=https://bmv-apim-mz.azure-api.net
APIM_KEY=<your_apim_subscription_key>
```

### Frontend Configuration (`frontend/.env` - Optional)
```ini
# API Gateway Target (Defaults to http://localhost:5000 in local development)
VITE_API_BASE_URL=http://localhost:5000
```

---

## 4. Local Installation & Development

### Prerequisites
- Node.js 18.0.0 or higher
- npm 9.0.0 or higher

### Step 1: Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Start the Backend Service
```bash
cd backend
npm start
# Server starts on http://localhost:5000
```

### Step 3: Start the Frontend Development Server
```bash
cd frontend
npm run dev
# Vite dev server starts on http://localhost:5173
```

---

## 5. Verification & Testing

### Automated Backend Integration Tests (31 Scenarios)
The backend test suite validates all cross-role workflows, PostgreSQL exclusion constraints, timetable clash rejections, cancellation state machines, and APIM agent proxies.

From the workspace root directory:
```bash
node backend/test-api.js
```
*Expected Output: `Test Execution Finished: 31 Passed, 0 Failed`.*

### Frontend Production Build
```bash
cd frontend
npm run build
```
*Expected Output: `✓ built in <1s` with 0 errors.*

---

## 6.LIVE URL

https://bmvwebmz.z29.web.core.windows.net/

## 7. Architecture & Documentation Directory

Detailed technical reports and architectural diagrams are located in the [`docs/`](docs/) directory:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — System architecture diagram, booking approval state machine, and novelty breakdown.
- [`docs/ER_DIAGRAM.md`](docs/ER_DIAGRAM.md) — Complete Mermaid entity-relationship diagram with database constraint definitions.
- [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md) — Comprehensive execution logs and categorization of the 31 integration test cases.
- [`docs/PROGRESS.md`](docs/PROGRESS.md) — Detailed implementation audit log across all project milestones.
