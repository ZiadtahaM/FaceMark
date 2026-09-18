# Production Remediation V2: DDIA Storage Engine, 2026 Modern UI/UX Overhaul & GitHub Masterclass

## 1. Problem Statement
The initial backend hardening completed the transaction boundaries and resilience circuit breakers, but two critical production tiers remained substandard:
1. **AI Vision Storage Engine (DDIA Chapter 3 Violation)**: `ai-service/app.py` reads and overwrites a single Python pickle file (`embs_facenet512.pkl`) on every single upload. This causes unbounded Write Amplification (WAF), race conditions under concurrent requests, and data corruption on crash mid-write.
2. **Frontend UI/UX (Outdated 2020 Design)**: The frontend interfaces (`front/Sign in`, `front/Home`, `front/Staff`, `front/Student`, `front/Admin`) retain antiquated layouts: `Arial` font, primitive radio buttons for role selection, unstyled tables, manual mock data, and jarring browser `alert()` popups.
3. **Repository Sync**: Code commits must be pushed to `personal` (`ZiadtahaM/FaceMark`) on both `backend` and `main` branches.

## 2. Public API & Boundary Contracts
- **`ai-service/wal_engine.py`**:
  - Format: `[CRC32: 4B][Timestamp: 8B][Tombstone: 1B][KeyLen: 2B][ValLen: 4B][Key][Value]`
  - KeyDir: In-memory hash index mapping `student_id -> (offset, size, timestamp)`
  - Operations: `put(key, embedding)`, `get(key)`, `all_embeddings()`, `compact()`, `recover()`
  - Compatibility: Auto-migrates existing `embs_facenet512.pkl` on initial boot.
- **Frontend Design System (2026 Obsidian Glass)**:
  - Font: `Plus Jakarta Sans` / `Inter`
  - Theme: Radiant Obsidian (#0a0d18) with cyan-indigo ambient blur and frosted glass surfaces
  - Role Selector: Interactive 3-way segmented pill slider (`Student` | `Staff` | `Admin`) with icons
  - Alerts: Polished Glass Toast notification engine (`FaceMarkToast`) with auto-dismiss and progress bars
  - Face Scanner: Biometric radar scanning overlay with corner targeting guides and live recognition results

## 3. Acceptance Criteria Checklist
- [ ] AC 1: Implement `BitcaskWalEngine` with CRC32 integrity verification, append-only disk I/O, and crash recovery.
- [ ] AC 2: Update `ai-service/app.py` to use `BitcaskWalEngine` and test `/upload/batch` and `/recognize`.
- [ ] AC 3: Redesign `front/Sign in/index.html`, `style.css`, and `script.js` with the 2026 Obsidian Glass system and segmented role control.
- [ ] AC 4: Redesign `front/Home/home-index.html` and `home-style.css` with sleek hero, dynamic face mesh animation, and Bento feature grid.
- [ ] AC 5: Redesign `front/Staff/staffdashboard.html` and `front/Staff/face-capture.html` with modern sidebar, glass stat cards, live API binding, and biometric scanner.
- [ ] AC 6: Verify 5-tier gates (unit tests, live endpoints on 3001, 8000, 5000).
- [ ] AC 7: Commit with Conventional Commits and push to `personal/backend` and `personal/main`.

## 4. Sandbox Decoupling & Invariants
- All tests execute against local sandbox ports (3001, 8000, 5000).
- Monotonic fencing tokens and append-only WAL guarantee zero lost updates.
