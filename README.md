# FaceMark: Student Attendance System with AI Facial Recognition

FaceMark is a comprehensive solution for managing student attendance using automated AI facial recognition, role-based access control, and intuitive dashboards for Admins, Staff, and Students.

## 🚀 Updates & Security Patches (Latest)

Recent enhancements have hardened the application logic, resolving critical data isolation and role-based access control (RBAC) vulnerabilities:

- **Strict Data Isolation**: Students can now only view courses they are actively enrolled in, and only their own attendance records. Staff view scopes are isolated to their assigned courses.
- **Secure Registration**: The public `/api/v1/auth/register` endpoint strictly registers `STUDENT` accounts. Staff and Admin roles are provisioned exclusively through the protected `/api/v1/users` admin endpoint.
- **Data Pruning**: Password hashes are stripped from all API user data responses.
- **Operation Guards**: Attendance recording and student course enrollment are strictly checked against instructor assignments, preventing cross-course unauthorized modifications by staff.

---

## 🏗 Project Architecture

### Backend (NestJS)
- **Modular MVC**: Decoupled modules for Auth, Users, Courses, and Attendance.
- **Security**: JWT Authentication, Bcrypt hashing, RBAC, and Rate Limiting.
- **Database**: MySQL managed via TypeORM for reliability and transactional integrity.

### Frontend (React/Angular)
- **State Management**: Unidirectional flow via Redux/Context API.
- **Navigation**: Structured routing with role-protected access.
- **API Integration**: Centralized service layer for backend communication.

---

## 🚀 Getting Started

### Backend Setup
1.  **Clone the Repo**: `git clone <repo-url>`
2.  **Dependencies**: `npm install`
3.  **Environment**: Configure `.env` (DB_HOST, DB_NAME, DB_PASSWORD, JWT_SECRET).
4.  **Run**: `npm run start:dev`

### Frontend Setup
1.  **Setup**: Install dependencies (`npm install`). Ensure you have Node.js and npm/yarn installed.
2.  **API Config**: Configure API base URL in `src/config/api.js`.
3.  **Auth**: Implement token-based auth via `src/services/auth.js`.
4.  **State Mgmt**: Utilize Redux/Context API for global state.
5.  **Routing**: Employ React Router for navigation.
6.  **Components**: Develop reusable UI components in `src/components/`.

---

## 📑 API Documentation

- **Swagger/OpenAPI**: Available at `http://localhost:3000/api/docs` when the server is running.
- **Postman**: Import `POSTMAN_COLLECTION.json` for a pre-configured testing environment.

---

## 🛠 Courses Endpoints Implementation

1.  **API Service**: Create `src/services/courses.js` for API calls.
    *   `getCourses()`: Fetch all courses.
    *   `getCourseById(id)`: Fetch single course.
    *   `createCourse(data)`: Add new course.
    *   `updateCourse(id, data)`: Modify existing course.
    *   `deleteCourse(id)`: Remove course.
2.  **Redux/State**: Define course-related actions and reducers.
3.  **Components**: Build `CourseList`, `CourseDetail`, `CourseForm` components.
4.  **Integration**: Connect components to Redux store and API service.

---

## 🤝 Contribution Guidelines

- **Style**: Adhere to the established coding standards and naming conventions.
- **Verification**: Always run linting and tests before submitting changes.
- **Documentation**: Ensure all new API routes are reflected in the OpenAPI spec.
- **Non-AI Comments**: Use direct, technical comments to explain complex logic flows.

---

**Documentation Version**: 1.2.0 (April 2026)
**Contact**: Senior Development Team
