# 🧭 FaceMark Project State (NOW.md)

**Current Milestone:** Masterclass Production Architecture, DDIA Hardening & Free Hosting Blueprint  
**Status:** Completed & Verified (5-Tier Verification Passed)  
**Active Specification:** [.scratch/production-launch/issue.md](file:///C:/Users/DevUser/FaceMark/.scratch/production-launch/issue.md)  
**Audit Artifact:** [production_masterclass_audit.md](file:///C:/Users/DevUser/.gemini/antigravity-cli/brain/dd8d9765-ed4a-4a2e-a9b2-93af54fa9875/production_masterclass_audit.md)  

---

## 🎯 Current Context & Invariants
* **Local Backend:** Running on port `3001` with MariaDB/MySQL (`facemark-mysql` on port `3306`).
* **Local Frontend:** Serving on port `5000` via dynamic client `front/js/api.js`.
* **AI Service:** FastAPI Facial Recognition engine with Facenet512 running on port `8000`.
* **GitHub Sync:** Personal remote points to `ZiadtahaM/FaceMark` (all 30 user commits pushed, masterclass tickets opened & tracked).

---

## 📋 Completed Execution Tracks
1. **[DDIA-01] Storage Engine, WAL & Transaction Atomicity Hardening (Issue #1):**
   - Added `@VersionColumn() version: number` across `UserAccount`, `Course`, and `Attendance` entities for monotonic fencing tokens.
   - Added composite B-Tree indexes on joined tables and `@Unique` constraint on `(studentId, courseId, recordDate, sessionNumber)`.
   - Wrapped `syncEnrollments` in `DataSource.transaction()` for ACID multi-entity mutations.
2. **[SEC-02] Zero-Trust Perimeter, Role Lockdown & Secret Scrubbing (Issue #2):**
   - Enforced role lockdown in `AuthService.register()` (public registrations always restricted to `Role.STUDENT`).
   - Scrubbed `.env`, `ggimni.txt`, `model2.txt`, `.pyc` and loose test files from Git tracking.
   - Configured Helmet security headers, CORS, and rate limiting perimeter.
3. **[REL-03] Circuit Breakers, Timeout Budgeting & AI Worker Decoupling (Issue #3):**
   - Built `CircuitBreaker` (`src/common/resilience/circuit-breaker.ts`) with exponential backoff & full jitter.
   - Protected AI vision HTTP calls (`registerStudent`, `processAttendanceFrame`) against upstream hangs with 25s timeouts.
   - Added Dual-Probe health checks (`/health`, `/ready`) and Kleppmann DDIA Invariant watchdog (`/api/invariants`).
4. **[FE-04] Frontend Modernization, Dynamic API Client & XSS Prevention (Issue #4):**
   - Created `front/js/api.js` providing dynamic environment routing, resilient `authFetch`, session 401 handling, and `escapeHtml()`.
   - Propagated `api.js` across all 21 frontend HTML/JS files in `Staff/`, `Student/`, and `Admin/`.
5. **[OPS-05] 100% Free-Tier 24/7 Cloud Architecture & Deployment Scaffold (Issue #5):**
   - Created `ai-service/Dockerfile` and `ai-service/README.md` for Hugging Face Spaces (free 16GB RAM CPU Basic tier).
   - Created `Dockerfile` and `render.yaml` for Render.com free-tier web service with TiDB Serverless.
   - Created `wrangler.toml` for Cloudflare Pages static site hosting.
   - Created `.github/workflows/ci.yml` for automated CI/CD lint, build, test, and audit.
