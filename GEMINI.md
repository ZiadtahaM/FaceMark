# Project Standards & AI Integration

## AI Model Integration
This project integrates two AI models for automated attendance.

### Model 1: Face Registration
- **Endpoint:** `POST /vision/upload`
- **Goal:** Batch registration of student face embeddings.
- **Rules:**
    - Must accept an array of Base64 images.
    - Must save `faceEmbedding`, `embeddingVersion`, and `embeddingCreatedAt` to the `UserAccount` entity.
    - Response must be detailed (Student ID, Name, Model Version).

### Model 2: Recognition & Attendance
- **Endpoint:** `POST /vision/recognize`
- **Goal:** Real-time recognition and automated attendance marking.
- **Mandatory Logic:**
    - **Strict Enrollment Check:** Never mark attendance for a student not enrolled in the course.
    - **Duplicate Prevention:** Ensure only one "Present" record per student/course per day.
    - **Automatic Alerts:** Trigger an immediate alert when a student is marked "Absent".
    - **Detailed Responses:** No generic responses. Always include `status`, `student` details, `session` details, and `aiModel` metadata.
- **Attendance Status:** AI-recorded attendance defaults to status `1` (Present).

## Student Experience Standards
- **Attendance History:** Student attendance lists must be sorted by `recordDate` DESC and include `statusLabel` (e.g., "Present", "Absent").
- **Course Details:** Student course listings must include their specific enrollment details (`section` and `lecture`).
- **Alerts:** Ensure all notification types (Warnings, Info, Danger) are accessible to the student.

## Engineering Standards
- **Validation:** All new endpoints must have DTOs with `class-validator` and `class-transformer`.
- **Testing:** Every new feature or bug fix MUST include unit tests. No change goes unverified.
- **Architecture:** Maintain modular separation. `VisionService` handles AI calls; `AttendanceService` handles business logic and DB records.
- **Security:** Use `JwtAuthGuard` and `RolesGuard` for sensitive endpoints.

## Git & Workspace
- **Ignore:** Do not track build artifacts, media files, or backups. Keep `.gitignore` updated.
- **Postman:** Keep `Attendance Master Collection.postman_collection.json` updated with latest request/response structures.

## Verification & Integrity
- **Architecture:** Modular MVC-like structure. No circular dependencies between `Vision`, `Attendance`, and `Users`.
- **Syntax:** All code must pass `npm run build`.
- **Logic:** All core features (AI registration, AI attendance, alerts) must be covered by unit tests.
- **Consistency:** Responses must follow the "Detailed Response" standard defined in Model 2 logic.
