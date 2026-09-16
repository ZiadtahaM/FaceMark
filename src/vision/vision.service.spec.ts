import { Test, TestingModule } from '@nestjs/testing';
import { VisionService } from './vision.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AttendanceService } from '../attendance/services/attendance.service';
import { UserRepository } from '../users/repositories/user.repository';
import { of, throwError } from 'rxjs';
import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { MatchStatus } from './dto/ai-recognition-result.dto';

describe('VisionService', () => {
  let service: VisionService;
  let httpService: any;
  let attendanceService: any;
  let userRepo: any;

  beforeEach(async () => {
    httpService = {
      post: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    };
    attendanceService = {
      recordAiAttendance: jest.fn(),
    };
    userRepo = {
      findById: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisionService,
        { provide: HttpService, useValue: httpService },
        { provide: AttendanceService, useValue: attendanceService },
        { provide: UserRepository, useValue: userRepo },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://ai-service') },
        },
      ],
    }).compile();

    service = module.get<VisionService>(VisionService);
  });

  describe('registerStudent (Model 1)', () => {
    const mockDto = {
      imagesBase64: ['img1', 'img2'],
      studentId: '1',
      name: 'Ziad',
    };

    it('should throw BadGatewayException if AI service fails', async () => {
      httpService.get.mockReturnValue(of({ data: { status: 'ok' } }));
      httpService.post.mockReturnValue(throwError(() => new Error('AI Down')));
      await expect(service.registerStudent(mockDto)).rejects.toThrow(BadGatewayException);
    });

    it('should register student embeddings successfully', async () => {
      const aiResponse = {
        data: {
          embedding: 'dense_vector_xyz',
          versionOfModel: 'v1.0',
          dateCreated: '2024-05-07T10:00:00Z',
          status: 'success',
          facesDetected: 1,
          imagesProcessed: 1
        }
      };
      httpService.get.mockReturnValue(of({ data: { status: 'ok' } }));
      httpService.post.mockReturnValue(of(aiResponse));
      userRepo.findById.mockResolvedValue({ userAccountId: 1 });
      userRepo.save.mockResolvedValue({});

      const result = await service.registerStudent(mockDto);
      
      expect(result.status).toBe('SUCCESS');
      expect(userRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        faceEmbedding: 'dense_vector_xyz',
        embeddingVersion: 'v1.0'
      }));
    });
  });

  describe('processAttendanceFrame (Model 2)', () => {
    const mockDto = {
      imageBase64: 'frame1',
      courseId: 101,
      sessionType: 'LECTURE',
      sessionNumber: '1',
      sectionId: 'S1',
      sessionId: 'sess_1',
      room: 'R1'
    };

    it('should return NO_FACE if AI detects no face', async () => {
      const aiResponse = {
        data: {
          matchStatus: MatchStatus.NO_FACE_DETECTED,
          status: 'success',
          name: 'N/A',
          match: 0,
          studentId: '0',
          confidenceScore: 0,
          versionOfModel: 'v1.0',
          embedding: ''
        }
      };
      httpService.get.mockReturnValue(of({ data: { status: 'ok' } }));
      httpService.post.mockReturnValue(of(aiResponse));

      const result = await service.processAttendanceFrame(mockDto);
      expect(result.status).toBe('NO_FACE');
    });

    it('should record attendance if student matches and is enrolled', async () => {
      const aiResponse = {
        data: {
          matchStatus: MatchStatus.MATCH,
          studentId: '1',
          name: 'Ziad',
          match: 0.98,
          confidenceScore: 0.98,
          versionOfModel: 'v1.0',
          embedding: 'vec123',
          status: 'success'
        }
      };
      httpService.get.mockReturnValue(of({ data: { status: 'ok' } }));
      httpService.post.mockReturnValue(of(aiResponse));
      userRepo.findById.mockResolvedValue({ userAccountId: 1 });
      attendanceService.recordAiAttendance.mockResolvedValue({
        status: 'RECORDED',
        record: { recordId: 777 }
      });

      const result = await service.processAttendanceFrame(mockDto);
      
      expect(result.status).toBe('RECORDED');
      expect(result.student.name).toBe('Ziad');
      expect(attendanceService.recordAiAttendance).toHaveBeenCalledWith(expect.objectContaining({
        studentId: 1,
        courseId: 101
      }));
    });

    it('should return ERROR if attendance service throws (e.g. not enrolled)', async () => {
      const aiResponse = {
        data: {
          matchStatus: MatchStatus.MATCH,
          studentId: '1',
          name: 'Ziad',
          match: 0.98,
          confidenceScore: 0.98,
          versionOfModel: 'v1.0',
          embedding: 'vec123',
          status: 'success'
        }
      };
      httpService.get.mockReturnValue(of({ data: { status: 'ok' } }));
      httpService.post.mockReturnValue(of(aiResponse));
      userRepo.findById.mockResolvedValue({ userAccountId: 1 });
      attendanceService.recordAiAttendance.mockRejectedValue(new Error('Student not enrolled'));

      const result = await service.processAttendanceFrame(mockDto);
      
      expect(result.status).toBe('ERROR');
      expect(result.message).toBe('Student not enrolled');
    });
  });
});
