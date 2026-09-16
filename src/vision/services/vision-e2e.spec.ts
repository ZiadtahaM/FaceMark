import { Test, TestingModule } from '@nestjs/testing';
import { VisionService } from '../vision.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AttendanceService } from '../../attendance/services/attendance.service';
import { UserRepository } from '../../users/repositories/user.repository';
import { of } from 'rxjs';
import { MatchStatus } from '../dto/ai-recognition-result.dto';

describe('Vision & Attendance End-to-End Logic', () => {
  let visionService: VisionService;
  let attendanceService: AttendanceService;
  let userRepo: UserRepository;

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockUserRepo = {
    findById: jest.fn(),
    save: jest.fn(),
  };

  const mockAttendanceService = {
    recordAiAttendance: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisionService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: { get: () => 'http://localhost:8000' } },
        { provide: AttendanceService, useValue: mockAttendanceService },
        { provide: UserRepository, useValue: mockUserRepo },
      ],
    }).compile();

    visionService = module.get<VisionService>(VisionService);
    attendanceService = module.get<AttendanceService>(AttendanceService);
    userRepo = module.get<UserRepository>(UserRepository);
  });

  describe('Step 1: Bulk Embedding Registration (Model 1)', () => {
    it('should save embeddings to correct database IDs', async () => {
      const bulkDto = {
        students: [
          { studentId: '101', name: 'Ziad', imagesBase64: ['img1'] },
          { studentId: '102', name: 'Ahmed', imagesBase64: ['img2'] }
        ]
      };

      mockHttpService.get.mockReturnValue(of({ data: { status: 'ok' } }));
      mockHttpService.post.mockReturnValue(of({
        data: {
          embedding: [0.1, 0.2],
          versionOfModel: 'Facenet512',
          dateCreated: new Date().toISOString(),
          imagesProcessed: 1,
          facesDetected: 1
        }
      }));

      mockUserRepo.findById.mockImplementation((id) => ({
        userAccountId: id,
        username: `user_${id}`
      }));

      const results = await visionService.registerMultipleStudents(bulkDto);

      // Verify DB mapping: Ensures studentId from request matches database userAccountId
      expect(mockUserRepo.findById).toHaveBeenCalledWith(101);
      expect(mockUserRepo.findById).toHaveBeenCalledWith(102);
      expect(mockUserRepo.save).toHaveBeenCalledTimes(2);
      expect(results[0].success).toBe(true);
    });
  });

  describe('Step 2: AI Recognition & Attendance (Model 2)', () => {
    it('should match against DB embedding and record attendance', async () => {
      const frameDto = {
        courseId: 5,
        sessionNumber: '1',
        sessionType: 'LECTURE',
        sectionId: 'S1',
        sessionId: 'L1',
        imageBase64: 'camera_frame'
      };

      // Mock AI finding student 101 (The ID stored in DB from Model 1)
      mockHttpService.get.mockReturnValue(of({ data: { status: 'ok' } }));
      mockHttpService.post.mockReturnValue(of({
        data: {
          studentId: '101',
          name: 'Ziad',
          similarity: 0.95,
          confidenceScore: 0.95,
          matchStatus: 'MATCH',
          status: 'success', // Required by DTO
          versionOfModel: 'Facenet512'
        }
      }));

      mockUserRepo.findById.mockResolvedValue({
        userAccountId: 101,
        username: 'Ziad'
      });

      mockAttendanceService.recordAiAttendance.mockResolvedValue({
        status: 'RECORDED',
        record: { id: 999 }
      });

      const result = await visionService.processAttendanceFrame(frameDto);

      // Verify E2E Flow: Ensure the attendance is linked to the student registered in Step 1
      expect(result.status).toBe('RECORDED');
      expect(mockAttendanceService.recordAiAttendance).toHaveBeenCalledWith(expect.objectContaining({
        studentId: 101,
        courseId: 5,
        confidenceScore: 0.95
      }));
    });
  });
});
