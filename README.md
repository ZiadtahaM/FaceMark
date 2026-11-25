# FaceMark

AI-powered student attendance system using facial recognition. A NestJS REST API connects to a Python FastAPI microservice running DeepFace/TensorFlow for face embedding generation and recognition.

## Architecture

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                     CLIENT (Front)                      â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                         â”‚ HTTP REST
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚              NestJS API  (Port 3000)                    â”‚
â”‚                                                         â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚   Auth   â”‚ â”‚  Users   â”‚ â”‚  Courses  â”‚ â”‚Attendanceâ”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚                                                         â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚          Vision Module + Circuit Breaker         â”‚   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                            â”‚ HTTP (guarded by circuit breaker)
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚           FastAPI AI Service  (Port 8000)               â”‚
â”‚                                                         â”‚
â”‚   DeepFace + TensorFlow face recognition pipeline       â”‚
â”‚   WAL Engine â€” append-only embedding store              â”‚
â”‚   /upload/batch  /recognize  /health  /embeddings       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                            â”‚
                     â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”
                     â”‚    MySQL    â”‚
                     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

## Deployment status and secure setup

This repository is a development project, not a verified production deployment. The API and AI service are separate processes. Recognition needs a running AI service; an API health response alone does not prove recognition works.

The security/TLS changes are on PR #8 and are not merged yet. Set a private `JWT_SECRET` of at least 32 characters before deploying that branch. Never commit credentials. For a MySQL-compatible TiDB connection, set `DB_HOST`, `DB_PORT=4000`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` and `DB_SSL=true`; TLS certificate verification stays enabled. Set `NODE_ENV=production` and `PORT` for the host. Use a dedicated database user, not root.

For a new empty demo database only, `DB_SYNCHRONIZE=true` can create the schema. Do not enable automatic schema synchronization against existing data. Use reviewed migrations and backups for an existing database. Set `AI_SERVICE_URL` to the separate AI service when available.

Verify `/api/v1/health`, then `/api/v1/ready` and its database and AI checks, and test auth plus a real recognition request before claiming a working deployment. The current hosting work is paused: no new API service is live, and no old attendance data has been migrated. A prepared TiDB database is not a deployed app.

Validation on the PR branch: `npm ci`, `npm run build`, and 45 Jest tests across 9 suites passed. Jest reported an open-handle warning after the tests. These checks are not a full live database or recognition test.

## Stack

| Layer | Technology |
|-------|------------|
| API | NestJS 11, TypeScript |
| ORM | TypeORM (MySQL) |
| Auth | JWT, Passport, bcrypt |
| AI Service | FastAPI, DeepFace, TensorFlow 2.16, OpenCV |
| Embedding Store | Custom WAL engine (append-only, compaction-safe) |
| Docs | Swagger / OpenAPI (auto-generated) |
| Security | Helmet, express-rate-limit (IP-based, auth endpoints) |
| Resilience | Hand-written circuit breaker â€” CLOSED/OPEN/HALF_OPEN states with exponential backoff and jitter |
| Deployment | Docker, Render (render.yaml), Cloudflare Workers |

## Modules

```
src/
â”œâ”€â”€ auth/          JWT auth â€” register, login, refresh token rotation
â”œâ”€â”€ users/         Student and instructor accounts, face embedding storage
â”œâ”€â”€ courses/       Course creation, enrollment management
â”œâ”€â”€ attendance/    Attendance records, session tracking
â”œâ”€â”€ vision/        Face registration (batch), real-time recognition
â””â”€â”€ common/
    â”œâ”€â”€ resilience/  CircuitBreaker â€” prevents cascade failure to AI service
    â”œâ”€â”€ interceptors/ LoggingInterceptor, TransformInterceptor
    â”œâ”€â”€ filters/      HttpExceptionFilter
    â””â”€â”€ health/       /health readiness probe

ai-service/
â”œâ”€â”€ app.py          FastAPI server â€” /upload/batch, /recognize, /health
â”œâ”€â”€ wal_engine.py   Write-Ahead Log for face embedding persistence
â””â”€â”€ test_wal_engine.py
```

## Circuit Breaker

The `VisionService` wraps every AI service call in a circuit breaker:

- 3 consecutive failures trip the circuit to **OPEN**
- OPEN state rejects calls immediately with `503` â€" no thread pool exhaustion
- After 15s, transitions to **HALF_OPEN** to probe one canary request
- On success, resets to **CLOSED**
- Exponential backoff: `t = random(0, min(8000ms, 500ms Ã— 2^attempt))`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/auth/register | Register student or instructor |
| POST | /api/v1/auth/login | Login, returns JWT |
| POST | /api/v1/vision/register | Upload face images for embedding |
| POST | /api/v1/vision/recognize | Identify student from a frame |
| POST | /api/v1/attendance/mark | Record attendance session |
| GET | /api/v1/attendance/:courseId | Attendance report for a course |
| GET | /health | Liveness probe |
| GET | /api/docs | Swagger UI |

## Local Setup

```bash
# 1. Clone and install NestJS dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill: DB_HOST, DB_USERNAME, DB_PASSWORD, DB_NAME, JWT_SECRET, AI_SERVICE_URL

# 3. Start the AI service
cd ai-service
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000

# 4. Start the NestJS API
npm run start:dev

# Swagger docs at http://localhost:3000/api/docs
```

## Docker

```bash
docker compose up -d
```
