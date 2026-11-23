# CityCivic: Geotagged Public Civic Platform

A civic grievance redressal and urban infrastructure tracking web application designed for **Urban Residents**, **Municipal Ward Officers**, and **Local Civic Bodies**.

---

## 🌟 Core Problem Solved
Traditional civic systems fail due to **duplicate complaint spam**, **lack of objective severity prioritization**, and **"ghost closures"** where contractors mark tickets resolved without fixing them on the ground.

**CityCivic** solves this through:
1. **Intelligent Geotagged Deduplication:** Uses spatial proximity (Haversine distance within 30–60m) to group duplicate complaints under a single **Master Work Order**, reducing ward officer backlogs by 40–60%.
2. **Community Verification & Dynamic Severity Scoring (DSI):** Prioritizes issues using a multi-factor formula combining base category hazards (1-10), logarithmic citizen upvotes, on-the-ground micro-surveys, and SLA aging decay.
3. **Zero-Cost Anti-Spam Auth:** Combines phone number collection (for field officer contact) with **Email OTP verification** (saving SMS API fees) and disposable-domain filters.
4. **Public Resolution Tracking & Anti-Ghost Closure:** Requires field officers to submit **geofenced "After" photos** taken within 100m of the site, followed by a **72-hour community audit window** where citizens can confirm the fix or dispute it ("Still Broken") to automatically reopen the ticket.

---

## 🚀 Quick Start

### 1. Install Dependencies & Initialize Database
```bash
npm install
npx prisma generate
npx prisma db push
node prisma/seed.mjs
```

### 2. Run Sanity Tests (Verifies all 7 sub-phases)
```bash
npm test
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 👥 Personas & Testing Switcher
Use the top navigation bar's 1-click persona switcher to evaluate the platform from all three stakeholder perspectives:
- **Resident / Citizen:** `citizen.demo@gmail.com` (can report issues, upvote, submit ground verifications, and dispute fake closures).
- **Ward Officer (Indiranagar W02):** `officer.indiranagar@citycivic.gov` (can dispatch work orders and upload geofenced resolution proof).
- **Municipal Admin:** `admin@citycivic.gov` (can view city-wide deduplication rates, ward SLA leaderboards, and contractor scorecards).

---

## 🧪 Automated Regression & Sanity Test Suite
The project includes a 7-stage automated sanity test runner in `scripts/sanity-test.ts` that runs across:
- **Stage 1:** Ward and category seed data integrity
- **Stage 2:** Email OTP generation, disposable email filtering, and phone hygiene
- **Stage 3:** Spatial math, ward assignment, and duplicate candidate interception
- **Stage 4:** Unique upvoting, dynamic severity index (DSI) escalation, and citizen karma
- **Stage 5:** Ward work orders, geofence rejection (>100m) and acceptance (≤100m)
- **Stage 6:** Provisional resolution, 72h audit window, and citizen dispute reopening
- **Stage 7:** Municipal analytics, deduplication rate computation, and audit logging
