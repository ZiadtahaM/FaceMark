import { Test, TestingModule } from '@nestjs/testing';
import { VisionService } from '../vision.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AttendanceService } from '../../attendance/services/attendance.service';
import { UserRepository } from '../../users/repositories/user.repository';
import { of } from 'rxjs';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MatchStatus } from '../dto/ai-recognition-result.dto';

describe('Strict Vision & Attendance E2E Audit', () => {
  let visionService: VisionService;
  let attendanceService: AttendanceService;
  let userRepo: UserRepository;

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockAttendanceService = {
    recordAiAttendance: jest.fn(),
  };

  const mockUserRepo = {
    findById: jest.fn(),
    save: jest.fn(),
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

    // Default Health Check OK
    mockHttpService.get.mockReturnValue(of({ data: { status: 'ok' } }));
  });

  describe('STRICT STEP-BY-STEP VERIFICATION', () => {
    
    it('STEP 1: Bulk Registration - Should map IDs exactly to Database', async () => {
      const bulkDto = {
        students: [
          { studentId: '555', name: 'Student 555', imagesBase64: ['img1'] },
          { studentId: '777', name: 'Student 777', imagesBase64: ['img2'] }
        ]
      };

      mockHttpService.post.mockReturnValue(of({
        data: {
          embedding: [0.9, 0.8],
          versionOfModel: 'Facenet512',
          dateCreated: new Date().toISOString(),
          imagesProcessed: 1,
          facesDetected: 1
        }
      }));

      // Simulate students existing in DB with these specific IDs
      mockUserRepo.findById.mockImplementation((id) => {
        if (id === 555 || id === 777) return { userAccountId: id, username: `user_${id}` };
        return null;
      });

      const results = await visionService.registerMultipleStudents(bulkDto);

      expect(mockUserRepo.findById).toHaveBeenCalledWith(555);
      expect(mockUserRepo.findById).toHaveBeenCalledWith(777);
      expect(mockUserRepo.save).toHaveBeenCalledTimes(2);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('STEP 2: Recognition - Should use stored ID to verify student identity', async () => {
      const frameDto = {
        courseId: 1,
        sessionNumber: '1',
        sessionType: 'LECTURE',
        sectionId: '2',
        sessionId: 'LEC-1',
        imageBase64: 'valid_face_capture'
      };

      // AI Service recognizes person as ID 555 (from Step 1)
      mockHttpService.post.mockReturnValue(of({
        data: {
          studentId: '555',
          name: 'Student 555',
          similarity: 0.98,
          confidenceScore: 0.98,
          matchStatus: 'MATCH',
          status: 'success',
          versionOfModel: 'Facenet512'
        }
      }));

      mockUserRepo.findById.mockResolvedValue({ userAccountId: 555, username: 'Student 555' });
      mockAttendanceService.recordAiAttendance.mockResolvedValue({ status: 'RECORDED', record: { id: 1 } });

      const result = await visionService.processAttendanceFrame(frameDto);

      expect(result.status).toBe('RECORDED');
      expect(mockAttendanceService.recordAiAttendance).toHaveBeenCalledWith(expect.objectContaining({
        studentId: 555,
        courseId: 1
      }));
    });

    it('STEP 3: Enrollment Guard - Should REJECT recognized student if NOT enrolled', async () => {
      const frameDto = {
        courseId: 99, // Student 555 is not enrolled here
        sessionNumber: '1',
        sessionType: 'LECTURE',
        sectionId: 'S1',
        sessionId: 'L1',
        imageBase64: 'face_capture'
      };

      mockHttpService.post.mockReturnValue(of({
        data: {
          studentId: '555',
          matchStatus: 'MATCH',
          status: 'success',
          confidenceScore: 0.9,
          versionOfModel: 'Facenet512'
        }
      }));

      mockUserRepo.findById.mockResolvedValue({ userAccountId: 555 });
      
      // recordAiAttendance will throw ForbiddenException if enrollment fails
      mockAttendanceService.recordAiAttendance.mockRejectedValue(new ForbiddenException('Not enrolled'));

      const result = await visionService.processAttendanceFrame(frameDto);

      expect(result.status).toBe('ERROR');
      expect(result.message).toBe('Not enrolled');
    });

    it('STEP 4: Duplicate Prevention - Should handle ALREADY_RECORDED status correctly', async () => {
      const frameDto = {
        courseId: 1,
        sessionNumber: '1',
        sessionType: 'LECTURE',
        sectionId: 'S1',
        sessionId: 'L1',
        imageBase64: 'already_seen_face'
      };

      mockHttpService.post.mockReturnValue(of({
        data: { 
          studentId: '555', 
          matchStatus: 'MATCH', 
          status: 'success', 
          confidenceScore: 0.9,
          versionOfModel: 'Facenet512'
        }
      }));

      mockUserRepo.findById.mockResolvedValue({ userAccountId: 555 });
      mockAttendanceService.recordAiAttendance.mockResolvedValue({ status: 'ALREADY_RECORDED' });

      const result = await visionService.processAttendanceFrame(frameDto);

      expect(result.status).toBe('ALREADY_RECORDED');
      expect(result.message).toContain('already marked');
    });

  });
});
