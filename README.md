# EduRetain - AI-Powered Student Retention & Early Intervention System

EduRetain is a full-stack MERN application that identifies students at risk of academic failure or dropping out using machine learning, early-warning risk scoring, and structured faculty intervention workflows.

---

---

## Authentication & User Onboarding

EduRetain uses a production-ready authentication flow with strict role-based access control (RBAC):

### 1. Student Registration (`/register`)
- Self-registration is open to enrolled students.
- Requires full name, institutional email, password (min 8 characters with uppercase, lowercase, and numeric complexity), roll number, academic department, year, and semester.
- Upon successful registration, a linked `Student` record is provisioned and an active Faculty Mentor from the same department with the lowest current workload is automatically assigned.
- The student is immediately logged in and redirected to **My Academic Hub** (`/portal`).

### 2. Faculty Mentor Registration & Approval Policy (`/register`)
- Faculty members register with their name, institutional email, secure password, and academic department.
- **Approval Policy**: To prevent unauthorized access to sensitive academic and early warning risk data, newly registered mentor accounts are created with `isActive: false` (Pending Approval).
- An administrator must review and approve the mentor account from the **User Account Management** page (`/admin/users`) under the **Pending Approvals** tab before the mentor can sign in.
- Mentors attempting to sign in prior to approval receive a clear notice that their account is awaiting administrator review.

### 3. Administrator Access
- Self-registration as administrator is strictly prohibited and rejected by the server.
- The initial administrator account is provisioned via the database seeder reading credentials from environment variables:
  - `ADMIN_EMAIL` (default: `admin@eduretain.com`)
  - `ADMIN_PASSWORD` (default: `Admin@123`)
- Administrators have complete authority to create accounts of any role directly from `/admin/users`, toggle active statuses, review pending approvals, and adjust institutional risk thresholds.
- Optional demo data seeding for development is controlled via `SEED_DEMO_DATA=true`.

---


## Key Features

- **Role-Based Experience**: Dedicated dashboards for Administrator, Faculty Mentor, and Student using a unified, responsive shell.
- **Predictive Risk Scoring**: Machine learning pipeline analyzing attendance records, GPA trends, LMS engagement, assignment submission rates, and course backlogs.
- **RentMate-Inspired UI Architecture**:
  - Top Navbar with brand emblem, contextual navigation links, user profile chip, and live alerts.
  - Card-grid student directory for faculty mentors with color-coded risk status badges (Low, Medium, High).
  - Search & multi-parameter filter bar (risk tier, department, semester, sorting).
  - Clean forms with rounded corners, subtle shadows, and teal accent `#00A896`.
  - Comprehensive data tables for administration, user management, and model metrics.
- **Intervention Lifecycle**: Log, assign, and track academic recovery contracts, counseling sessions, and remedial actions with before/after score tracking.
- **Data Ingestion**: Multi-file CSV import for students, attendance, grades, and LMS activity logs.
- **Real-Time Notification**: Socket.io push notifications for newly elevated risk thresholds and high-priority alerts.

---

## Tech Stack

- **Frontend**: React 18, Vite, Lucide Icons, Recharts, Socket.io-client, Tailwind CSS & RentMate design tokens
- **Backend**: Node.js, Express, MongoDB / Mongoose, Socket.io, JWT Authentication, Multer, CSV-Parser
- **ML Microservice**: Python, FastAPI, Scikit-learn, Random Forest Classifier

---

## Quick Start

1. Start all services using the provided launcher:
   ```cmd
   START_EDURETAIN.bat
   ```
2. Or run services manually:
   - **ML Service**: `cd ml-service && python -m uvicorn app:app --port 8000`
   - **Backend API**: `cd server && npm run dev`
   - **Frontend**: `cd client && npm run dev`
3. Access the portal at [http://localhost:5173](http://localhost:5173).
