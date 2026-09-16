import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { HttpService } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { of } from 'rxjs';
import { DataSource } from 'typeorm';

// Modules
import { VisionModule } from './../src/vision/vision.module';
import { AttendanceModule } from './../src/attendance/attendance.module';
import { UsersModule } from './../src/users/users.module';
import { AuthModule } from './../src/auth/auth.module';
import { CoursesModule } from './../src/courses/courses.module';

// Repositories
import { UserRepository } from './../src/users/repositories/user.repository';
import { AttendanceRepository } from './../src/attendance/repository/attendance.repository';
import { CourseRepository } from './../src/courses/repositories/course.repository';

// Entities
import { UserAccount } from './../src/users/entities/user.entity';
import { Attendance } from './../src/attendance/entities/attendance.entity';
import { Course } from './../src/courses/entities/course.entity';
import { Alert } from './../src/users/entities/alert.entity';
import { CourseEnrollment } from './../src/courses/entities/course-enrollment.entity';

import { MatchStatus } from './../src/vision/dto/ai-recognition-result.dto';
import { Role } from './../src/common/enums/role.enum';
import { ConfigModule } from '@nestjs/config';

describe('FaceMark Real Request Tests (E2E)', () => {
  let app: INestApplication;

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    insert: jest.fn(),
    count: jest.fn(),
    metadata: { columns: [], relations: [] },
    // Custom repo methods
    findById: jest.fn(),
    findByUsername: jest.fn(),
    findByInstructor: jest.fn(),
    getEnrolledStudents: jest.fn(),
    findDuplicate: jest.fn(),
  };

  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue(mockRepo),
    createEntityManager: jest.fn().mockReturnValue({
        getRepository: jest.fn().mockReturnValue(mockRepo),
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        AuthModule,
        UsersModule,
        CoursesModule,
        AttendanceModule,
        VisionModule,
      ],
    })
      .overrideProvider(DataSource).useValue(mockDataSource)
      .overrideProvider(HttpService).useValue(mockHttpService)
      // Override Custom Repositories
      .overrideProvider(UserRepository).useValue(mockRepo)
      .overrideProvider(AttendanceRepository).useValue(mockRepo)
      .overrideProvider(CourseRepository).useValue(mockRepo)
      // Override Base Repositories (if needed by other services)
      .overrideProvider(getRepositoryToken(UserAccount)).useValue(mockRepo)
      .overrideProvider(getRepositoryToken(Attendance)).useValue(mockRepo)
      .overrideProvider(getRepositoryToken(Course)).useValue(mockRepo)
      .overrideProvider(getRepositoryToken(Alert)).useValue(mockRepo)
      .overrideProvider(getRepositoryToken(CourseEnrollment)).useValue(mockRepo)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('Vision AI Real-World Simulations', () => {

    it('Scenario 1: Recognition SUCCESS -> Mark Attendance', async () => {
      mockHttpService.get.mockReturnValue(of({ data: { status: 'ok' } }));
      mockHttpService.post.mockReturnValue(of({
        data: {
          matchStatus: MatchStatus.MATCH,
          studentId: '101',
          name: 'Ziad',
          match: 0.99,
          confidenceScore: 0.99,
          versionOfModel: 'v2.0',
          status: 'success'
        }
      }));

      // Mock DB interactions in Services
      mockRepo.findById.mockImplementation((id) => {
          if (id === 101) return Promise.resolve({ userAccountId: 101, userType: Role.STUDENT, username: 'ziad' });
          if (id === 1) return Promise.resolve({ courseId: 1, name: 'AI', instructor: { userAccountId: 2 } });
          return Promise.resolve(null);
      });
      mockRepo.findOne.mockImplementation((params: any) => {
        if (params.where?.courseId === 1) return Promise.resolve({ 
            courseId: 1, 
            name: 'AI', 
            enrollments: [{ studentId: 101 }],
            isDeleted: false 
        });
        return Promise.resolve(null);
      });
      mockRepo.findDuplicate.mockResolvedValue(null);
      mockRepo.create.mockImplementation((e) => Promise.resolve({ ...e, recordId: 1 }));

      const res = await request(app.getHttpServer())
        .post('/vision/recognize')
        .send({
          imageBase64: 'valid', courseId: 1, sectionId: 'S1', sessionId: 's1', sessionType: 'LECTURE', sessionNumber: '1'
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('RECORDED');
    });

    it('Scenario 2: Recognition FAIL -> Multiple Faces Detected', async () => {
        mockHttpService.get.mockReturnValue(of({ data: { status: 'ok' } }));
        mockHttpService.post.mockReturnValue(of({
          data: { matchStatus: MatchStatus.MULTIPLE_FACES, status: 'success' }
        }));
  
        const res = await request(app.getHttpServer())
          .post('/vision/recognize')
          .send({
            imageBase64: 'many', courseId: 1, sectionId: 'S1', sessionId: 's1', sessionType: 'LECTURE', sessionNumber: '1'
          });
  
        expect(res.status).toBe(201);
        expect(res.body.status).toBe('MULTIPLE_FACES');
    });
  });

  describe('System Monitoring Requests', () => {
    it('Scenario 3: System Health Check', async () => {
      mockHttpService.get.mockReturnValue(of({ data: { status: 'healthy', service: 'FastAPI' } }));
      const res = await request(app.getHttpServer()).get('/vision/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });
});
