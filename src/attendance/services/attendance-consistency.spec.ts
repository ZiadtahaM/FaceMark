import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { AttendanceRepository } from '../repository/attendance.repository';
import { UserRepository } from '../../users/repositories/user.repository';
import { CourseRepository } from '../../courses/repositories/course.repository';
import { AlertService } from '../../users/services/alert.service';
import { Role } from '../../common/enums/role.enum';

describe('AttendanceConsistencyTests', () => {
  let service: AttendanceService;
  let attendanceRepo: any;
  let userRepo: any;
  let courseRepo: any;

  beforeEach(async () => {
    attendanceRepo = {
      create: jest.fn(),
      findByStudent: jest.fn(),
    };
    userRepo = {
      findById: jest.fn(),
      findOne: jest.fn(),
    };
    courseRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: AttendanceRepository, useValue: attendanceRepo },
        { provide: UserRepository, useValue: userRepo },
        { provide: CourseRepository, useValue: courseRepo },
        { provide: AlertService, useValue: { checkStudentLowAttendance: jest.fn() } },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  describe('Session and Lecture Logic', () => {
    it('should correctly save sessionNumber as string and lectureNumber', async () => {
      const mockUser: any = { userAccountId: 10, userType: Role.STAFF };
      const mockDto: any = {
        studentId: 1,
        courseId: 2,
        attendanceStatusId: 1,
        recordDate: '2024-01-01',
        sessionNumber: 'Section 101-A', // String test
        lectureNumber: 'B',             // ABCD test
        room: 'R1',
        sessionType: 'SECTION'
      };

      userRepo.findById.mockResolvedValue({ userAccountId: 1, userType: Role.STUDENT });
      courseRepo.findOne.mockResolvedValue({ 
        courseId: 2, 
        instructor: { userAccountId: 10 },
        enrollments: [{ studentId: 1 }],
        isDeleted: false 
      });
      
      attendanceRepo.create.mockImplementation(data => data);

      const result = await service.create(mockDto, mockUser);
      
      expect(result.sessionNumber).toBe('Section 101-A');
      expect(result.lectureNumber).toBe('B');
    });
  });

  describe('Attendance Analytics Logic', () => {
    it('should count both Present(1) and Late(3) as attended in diagram calculation', async () => {
      const studentId = 1;
      const mockStudent: any = {
        userAccountId: studentId,
        username: 'test_student',
        enrollments: [{ course: { courseId: 1, name: 'Math', credits: 3 } }],
        attendanceRecords: [
          { course: { courseId: 1 }, attendanceStatusId: 1, sessionType: 'LECTURE' }, // Present
          { course: { courseId: 1 }, attendanceStatusId: 3, sessionType: 'LECTURE' }, // Late
          { course: { courseId: 1 }, attendanceStatusId: 2, sessionType: 'LECTURE' }, // Absent
        ]
      };

      userRepo.findOne.mockResolvedValue(mockStudent);

      const diagram = await service.getStudentDiagram(studentId);
      
      // Math course should have 2 attended out of 3 total records = 67%
      const mathCourse = diagram.courses.find(c => c.courseName === 'Math');
      expect(mathCourse.attendanceRate).toBe(67);
      
      // Lectures stats check
      const lectureStats = diagram.structure[0].children.find(c => c.label === 'Lectures').stats;
      expect(lectureStats.attended).toBe(2);
      expect(lectureStats.total).toBe(3);
    });
  });
});
