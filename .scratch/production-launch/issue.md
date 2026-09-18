# 🏛️ SPECIFICATION: FaceMark Production System Launch & DDIA Master Refactor

**Track:** Production Hardening, DDIA Compliance & Zero-Cost Cloud Deployment  
**Standard:** ANTIGRAVITY-SPEC-V2 & Martin Kleppmann (DDIA)  
**Date:** September 2026  

---

## 1. Exact Problem Statement
FaceMark currently functions as a prototype, but contains critical architectural vulnerabilities, DDIA law violations, security flaws, and UI anti-patterns that prevent reliable, zero-cost, multi-tenant production operation:
1. **DDIA Storage Engine & Concurrency Failure:** The AI vision service stores facial embeddings in an unversioned, mutable local pickle file (`embs_facenet512.pkl`) with $O(N)$ linear scans, zero write-ahead logging (WAL), race conditions on concurrent writes, and zero disaster recovery.
2. **Database Invariants & Mutation Atomicity:** Relational operations across users, courses, and attendance lack ACID transaction boundaries (`$transaction` / QueryRunner), risk partial writes, rely on destructive `DB_SYNCHRONIZE=true`, and lack composite B-Tree indexes on foreign keys and tenant lookups.
3. **Security Perimeter & Zero-Trust Violations:** Public registration enables arbitrary role injection; passwords and JWT signing keys are committed in repository history; sessions lack rotation and CSRF protection; frontend uses raw `localStorage` and `innerHTML` string interpolation subject to XSS.
4. **Fragile Frontend Coupling:** Over 20 HTML and JS files contain hardcoded `localhost` URLs, messy duplicated folder structures (`front/Sign in/Admin/dashboard admin/`), unoptimized vanilla DOM queries, and lack an unified API client or environment runtime configuration.
5. **Compute & Free Hosting Roadblock:** The AI model (DeepFace + Facenet512) requires >1.2GB RAM and heavy TensorFlow wheels, immediately exceeding free cloud compute limits (e.g., Render/Railway 512MB RAM tiers) without an offloaded microservice strategy.

---

## 2. Public API & Data Boundary Contract

### 2.1 Unified API Boundary Contract
* **Base Path:** `/api/v1`
* **Response Envelope Invariant:**
  ```typescript
  export interface ApiResponseEnvelope<T> {
    success: boolean;
    statusCode: number;
    timestamp: string;
    correlationId: string; // X-Request-ID (Simonyan Law #39)
    data?: T;
    error?: {
      code: string;
      message: string;
      details?: Record<string, unknown>;
    };
  }
  ```
* **Authentication Contract:**
  * Stateless short-lived JWT (15-30m) + Hashed Refresh Token rotation in database/cache.
  * Token exchange via HttpOnly, Secure, SameSite=Strict cookies.

### 2.2 Facial Vector Boundary (HNSW / Vector Engine)
* **Embedding Model:** Facenet512 (512-dimensional vector floats).
* **Storage Contract:** Relational column / Vector index `vector(512)` or structured binary blob with LEB128 metadata header.
* **Similarity Metric:** Cosine similarity threshold: $\ge 0.65$ match, $< 0.65$ non-match, monotonically tracked.

---

## 3. Acceptance Criteria Checklist (ACs)

- [x] **AC 1 (Security & Credentials Hardening):** Scrub committed `.env` and sensitive secrets from git history; introduce runtime validation ensuring no credentials ever leave secure vaults.
- [x] **AC 2 (DDIA Storage Engine Migration):** Replace local flat pickle file with transactional persistent storage (PostgreSQL `pgvector` or ACID table) eliminating race-condition file corruptions.
- [x] **AC 3 (Transaction Boundaries & Indexing):** Enforce TypeORM transaction managers on all multi-entity mutations (enrollments, attendance batching); add composite B-Tree indexes on `(course_id, date)` and `(user_account_id, is_deleted)`.
- [x] **AC 4 (Circuit Breaker & Fallback Resilience):** Wrap external AI calls in NestJS `VisionService` with an active circuit breaker, retry jitter, and explicit timeout budgets (Simonyan Laws #37, #38, #40).
- [x] **AC 5 (Frontend Architecture Modernization):** Consolidate redundant HTML/JS into clean directories; decouple backend URL to dynamic runtime configuration (`window.ENV.API_BASE_URL` or relative reverse proxy); sanitize all DOM rendering with textContent/DOMPurify.
- [x] **AC 6 (Zero-Cost Cloud Architecture Scaffolding):** Provide automated configuration for 100% free production hosting:
  - Frontend: Cloudflare Pages / Vercel (Edge CDN, unlimited bandwidth, free SSL).
  - Backend: Render / Koyeb (Free tier).
  - Database: TiDB Serverless (MySQL compatible, free 5GB) or Neon (Serverless Postgres + pgvector, free 0.5GB).
  - AI Inference: Hugging Face Spaces (Docker, free 16GB RAM) or Modal serverless.

---

## 4. Blocked-By / Depends-On DAG Relationships
```
[AC 1: Security Scrubbing] ───► [AC 2: Storage & DB Migration] ───► [AC 3: Transactions & Indexes]
                                         │
                                         ▼
[AC 5: Frontend Modernization] ──► [AC 4: Circuit Breaker & API Envelope] ──► [AC 6: Zero-Cost Deployment]
```

---

## 5. Sandbox Decoupling Plan (`ddia-sandbox-decoupling`)
* All database migrations and vector storage tests must run against ephemeral container instances (`facemark-sandbox-db`).
* Network probes and external AI mock verifications must be executed against local isolated mock servers before live cloud promotion.
