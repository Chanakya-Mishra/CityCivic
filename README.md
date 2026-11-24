<div align="center">
  <img src="public/logo-card.png" alt="CityCivic Logo" width="280" />
  <h1>CityCivic</h1>
  <p><strong>Resolving Urban Issues Together</strong></p>
  <p>Next-Generation Geotagged Civic Issue Reporting, Spatial Deduplication & Community-Audited Municipal Resolution Platform</p>

  [![Next.js](https://img.shields.io/badge/Next.js-15.1-black?logo=next.js)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
  [![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://www.prisma.io/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?logo=postgresql)](https://supabase.com/)
  [![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
  [![Tests](https://img.shields.io/badge/Sanity_Tests-41%2F41_Passed-brightgreen)](scripts/sanity-test.ts)
  [![Live Demo](https://img.shields.io/badge/Live_Deployment-citycivic.vercel.app-emerald?logo=vercel)](https://citycivic.vercel.app)
</div>

---

## 📖 Table of Contents
1. [Overview & Core Problem Statement](#-overview--core-problem-statement)
2. [Key Features & How They Work](#-key-features--how-they-work)
3. [User Roles & Stakeholder Portals](#-user-roles--stakeholder-portals)
4. [Security & Anti-Fraud Architecture](#-security--anti-fraud-architecture)
5. [Performance & Server-Side Caching](#-performance--server-side-caching)
6. [Interactive City Map & Incident Feed](#-interactive-city-map--incident-feed)
7. [Database Schema & Architecture](#-database-schema--architecture)
8. [API Route Reference](#-api-route-reference)
9. [Local Development & Setup](#-local-development--setup)
10. [Automated Sanity Testing Suite (All 11 Stages)](#-automated-sanity-testing-suite)

---

## 🎯 Overview & Core Problem Statement

Traditional municipal grievance portals (e.g., civic hotlines, WhatsApp grievance bots, web forms) suffer from three critical systemic failures:

1. **Inbox Inundation from Duplicate Reports:** When a major pothole or burst water pipe occurs on an arterial road, dozens of citizens independently file separate complaints. Municipal engineers waste days manually triaging identical tickets.
2. **"Ghost Closures" & Contractor Fraud:** Maintenance contractors frequently mark civic work orders as "Resolved" on paper without performing genuine field repairs. Citizens have no transparent mechanism to audit or dispute closures.
3. **Missing or Spoofed Geolocation:** Reports are submitted with vague textual descriptions ("near the bakery") or faked GPS locations, leading to failed field crew dispatches and wasted taxpayer funds.

**CityCivic** solves these challenges by combining **automated spatial deduplication**, **hardware-locked geotagging**, **Gemini AI vision verification**, and a **72-hour citizen dispute window** to ensure transparent municipal accountability.

---

## ⚡ Key Features & How They Work

### 1. 📍 20-Meter Auto-Child Spatial Deduplication
* **How it works:** When a citizen reports an issue, CityCivic's spatial engine calculates the Haversine distance against all active complaints in the city.
* **Automatic Grouping:** If an existing issue of the **same category** (e.g., `POTHOLE`) is located within **20 meters**, the new submission is **automatically converted into a recurring child complaint** linked to the canonical root Master Ticket.
* **No Clutter & No Nested Children:** 
  - Child complaints are **never** plotted as independent pins on the public GIS map, preventing overlapping marker clutter.
  - Submissions near an existing child report automatically attach directly to the top-level Master Ticket (maximum hierarchy depth is strictly 1).
  - Field crews receive **one single Master Work Order** containing all aggregated citizen photos, comments, and coordinates.
  - Each recurring child report automatically increments the Master Ticket's upvote count and boosts its dynamic severity score.

### 2. 🛰️ Tamper-Proof Geotag Lock & Camera EXIF Validation
* **Hardware GPS Lock:** Incident coordinates are locked directly from live device satellite telemetry ($\pm 40\text{m}$ accuracy). Manual coordinate tampering is disabled.
* **Camera EXIF Geotagging:** Photos captured on mobile devices are parsed for embedded EXIF GPS tags. If EXIF coordinates contradict the device location by more than 1,000 km, the submission is rejected as spoofed.
* **Automatic Ward Assignment:** CityCivic maps GPS coordinates to the respective municipal ward polygon (e.g., Ward 02 - Indiranagar) and assigns the designated Ward Field Engineer.

### 3. 🤖 Gemini AI Vision Verification Gate
* **Mandatory Photo Proof:** All civic complaints require an authentic photo before submission.
* **Automated Visual Triage:** Upon photo upload, Google Gemini AI Vision automatically analyzes the image to:
  1. Determine whether the image actually depicts municipal infrastructure damage vs. unrelated/spam images.
  2. Confirm the correct category (e.g., road damage, streetlight outage, garbage dump, sewage leak).
  3. Estimate an objective hazard severity score from 1 to 10.
* **Anti-Spam Rejection:** If Gemini determines the photo is invalid or unrelated (e.g., memes, indoor selfies, pet pictures), the submission button is disabled, blocking spam before it ever reaches the database.

### 4. 📈 Dynamic Severity Index (DSI)
Instead of arbitrary "First-Come, First-Served" processing, CityCivic calculates dynamic severity in real time:
$$\text{DSI} = \text{Base Category Hazard (1--10)} + \lfloor 1.5 \times \ln(\text{Upvotes} + 1) \rfloor + \text{Survey Perception Boost} + \text{SLA Aging Penalty}$$

* **Base Hazard:** High-risk issues like open manholes start with a base score of 9, while illegal garbage starts at 4.
* **Community Corroboration:** Upvotes and on-ground citizen surveys increase priority.
* **SLA Overdue Penalty:** Tickets that exceed municipal resolution timeframes receive automatic severity escalation.

### 5. 🛡️ 72-Hour Anti-Ghost Closure Audit Window
* **Geofenced Proof of Fix:** When a municipal contractor repairs an issue, the ward officer must visit the site and upload an "After" photo within **100 meters** of the original coordinates.
* **Gemini AI Repair Verification:** The AI cross-references the original "Before" photo with the "After" photo, flagging identical photo fraud attempts or incomplete repairs.
* **Provisional Resolution Status:** The ticket enters `PROVISIONALLY_RESOLVED` status, starting an immutable **72-hour citizen audit countdown**.
* **Community Confirm or Dispute:**
  - **Confirm Repaired:** Citizens confirm the repair, permanently closing the ticket as `OFFICIALLY_RESOLVED`.
  - **Dispute ("Still Broken"):** If the contractor committed a ghost repair, any citizen can dispute it with photo proof. The ticket is immediately reopened as `REOPENED_DISPUTED`, dynamic severity escalates, and a penalty strike is logged against the contractor.

### 6. 🏆 Citizen Karma & Audit Leaderboard
* Citizens earn community karma points for active neighborhood stewardship:
  - **+10 Karma:** Filing a verified civic issue.
  - **+5 Karma:** Completing an on-site verification micro-survey.
  - **+15 Karma:** Successfully disputing a fraudulent contractor ghost repair.
* Karma tiers (**Bronze Citizen**, **Silver Corroborator**, **Gold Senior Auditor**, **Platinum Civic Guardian**) grant higher verification voting weight to trusted community members.

---

## 👥 User Roles & Stakeholder Portals

| Portal / Role | Access URL | Authentication | Capabilities |
| :--- | :--- | :--- | :--- |
| **Resident / Citizen** | `/`, `/report`, `/leaderboard` | **Zero-Cost Email OTP** + Phone Record | Report geotagged issues, upvote neighborhood hazards, complete on-ground surveys, dispute ghost closures, track karma. |
| **Ward Field Officer** | `/officer` | **Password-Secured Governance Auth** (`yourpassword`) | View ward backlog, dispatch official work orders (`WO-2026-XXXX`), export CSV run-sheets, upload on-site geofenced resolution photos. |
| **City Commissioner Admin** | `/admin` | **Password-Secured Governance Auth** (`your-password`) | View executive city-wide analytics, monitor deduplication rates, audit contractor scorecards and penalty strikes, inspect full audit ledger. |

---

## 🔒 Security & Anti-Fraud Architecture

1. **Password-Secured Municipal Governance Gate:**
   - Governing portals (`/officer` and `/admin`) are protected by server-side role validation and cryptographic authentication.
   - Public citizens cannot access work orders, contractor penalty logs, or municipal dispatch controls.
   - Demo switcher requests to `WARD_OFFICER` or `ADMIN` without valid authorization passphrases are blocked with **HTTP 403 Forbidden**.
2. **Government Email Whitelisting:**
   - Governing accounts require authorized government email domains (`@citycivic.gov` or `@*.gov`).
3. **Anti-Spam Disposable Email Filtering:**
   - Over 12 disposable email providers (`mailinator.com`, `tempmail.com`, `guerrillamail.com`, etc.) are actively blocked.
4. **Phone Hygiene Checks:**
   - Repeated dummy digits (`9999999999`, `1234567890`) are rejected. Valid contact phone numbers are recorded for SMS dispatch alerts.
5. **Rate Limiting & Abuse Prevention:**
   - OTP creation is rate-limited to 3 requests per 10 minutes per IP/email.
6. **Immutable Audit Ledger:**
   - Every state transition (`MASTER_ISSUE_REPORTED`, `RECURRING_CHILD_AUTO_GROUPED`, `WORK_ORDER_DISPATCHED`, `RESOLUTION_PROOF_UPLOADED`, `TICKET_DISPUTED`) is permanently recorded in the `AuditLog` table.

---

## ⚡ Performance & Server-Side Caching

CityCivic uses a multi-tier caching architecture to guarantee zero-lag, instant UI interactions:

* **L1 In-Memory Cache + Vercel Runtime Cache:** High-frequency endpoints (e.g., categories, wards, public GIS map, analytics) are served in **30ms to 65ms** from cache.
* **Optimistic UI Updates (0ms perceived latency):** Upvoting and status toggles update the user interface immediately while syncing with the server in the background.
* **Stampede Deduplication:** Prevents multiple concurrent database queries during cache misses.
* **Tag-Based Cache Invalidation:** When a new issue or resolution is submitted, related cache tags (`issues`, `map`, `analytics`, `wards`, `audit`) are purged automatically.
* **Lazy Loading:** All photo assets load asynchronously with `loading="lazy"` and `decoding="async"` to conserve mobile bandwidth.

---

## 🗺️ Interactive City Map & Incident Feed

* **Live GIS Leaflet Map:** Displays dynamic color-coded incident pins:
  - 🔴 **Red:** Open / Critical Hazard
  - 🟡 **Amber:** In Progress / Triaged Work Order
  - 🔵 **Cyan:** Provisionally Resolved (72h Public Audit Window Active)
  - 🟢 **Green:** Officially Resolved & Community-Verified
* **Quick Filter Chips:** Instant one-tap filters for:
  - `All Incidents`
  - `🚧 Potholes & Roads`
  - `💡 Streetlights`
  - `🚰 Water & Sewage`
  - `🗑️ Sanitation`
  - `✅ Verified Fixed`
* **Mobile-Optimized Responsive View:** Dedicated toggle on mobile screens allows switching between **Map & Feed**, **Map Only** (75vh interactive view), and **Feed Only**.

---

## 🗄️ Database Schema & Architecture

CityCivic uses Prisma ORM connected to PostgreSQL. The primary entities include:

* **`User`:** Stores citizens, ward field officers, and administrators with role-based access and karma points.
* **`Issue`:** Stores master complaints and recurring child reports with coordinates, address, photo proofs, status, dynamic severity, and ward relations.
* **`Category`:** Municipal departments, issue classifications, and base hazard ratings (1–10).
* **`Ward`:** Municipal administrative zones with boundary center coordinates and service radii.
* **`WorkOrder`:** Formal maintenance dispatches assigned to field contractors (`WO-YYYY-XXXX`).
* **`ResolutionProof`:** Contractor name, before/after comparison URLs, completion notes, and geofence coordinates.
* **`Dispute`:** Citizen dispute audits against incomplete or fraudulent repairs.
* **`Upvote` & `Verification`:** Citizen corroboration records and on-site micro-surveys.
* **`AuditLog`:** Append-only municipal audit trail.

---

## 💻 Local Development & Setup

### Prerequisites
* Node.js 18+ or 20+
* PostgreSQL database (or Supabase instance)

### 1. Clone & Install
```bash
git clone https://github.com/Chanakya-Mishra/CityCivic.git
cd CityCivic
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/citycivic"
DIRECT_URL="postgresql://postgres:password@localhost:5432/citycivic"
JWT_SECRET="your-secure-jwt-secret-key-2026"
GEMINI_API_KEY="your-google-gemini-api-key"

# Optional Live Email Configuration
RESEND_API_KEY=""
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

### 3. Initialize Database & Seed
```bash
npx prisma generate
npx prisma db push
node prisma/seed.mjs
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Sanity Testing Suite

CityCivic includes an automated end-to-end regression test suite covering all 11 lifecycle stages.

Run the test suite:
```bash
npm test
```

### Verified Test Matrix (41 Assertions, 0 Failures):
* **Stage 1: Database & Ward Foundation** — Validates ward geometries, category hazard ratings, and seed users.
* **Stage 2: Email OTP & Governance Security** — Tests disposable domain blocking, phone hygiene, and password protection for officer/admin roles.
* **Stage 3: 20m Auto-Child Spatial Deduplication** — Verifies:
  - 1st report creates a Master Ticket.
  - 2nd report within 20m of same category automatically becomes a child complaint without manual intervention.
  - 3rd report near a child attaches to the canonical root Master Ticket (never child-of-a-child).
  - Reports with different categories or beyond 20m remain independent Master Tickets.
* **Stage 4: Dynamic Severity & Community Voting** — Validates multi-factor DSI calculation and micro-surveys.
* **Stage 5: Ward Work Orders & Geofenced Resolution** — Validates `WO-YYYY-XXXX` generation and on-site $\le 100\text{m}$ geofence enforcement.
* **Stage 6: 72h Audit Window & Ghost Closure Dispute** — Tests citizen dispute flow, automatic ticket reopening, and contractor penalty logging.
* **Stage 7: Municipal Operations & Analytics** — Validates city deduplication metrics and parallel ward scorecards.
* **Stage 8: EXIF Geotagging & Spoofing Guardrails** — Tests camera EXIF extraction and flag of coordinates $>1000\text{km}$ away.
* **Stage 9: Gemini AI Vision Verification** — Tests automatic civic damage triage and before/after repair fraud detection.
* **Stage 10: Contractor SLA Penalties & CSV Run-Sheet Export** — Validates contractor strike logs and CSV work order export.
* **Stage 11: Citizen Karma Economy & Leaderboard** — Validates tier rankings (Bronze, Silver, Gold, Platinum) and sorted leaderboards.

---

<div align="center">
  <p><strong>CityCivic Open Civic Platform</strong></p>
  <p>Built for Urban Residents, Ward Field Officers & Local Civic Bodies</p>
</div>
