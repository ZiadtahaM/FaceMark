import { Test, TestingModule } from '@nestjs/testing';
import { VisionService } from '../vision.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AttendanceService } from '../../attendance/services/attendance.service';
import { UserRepository } from '../../users/repositories/user.repository';
import { of } from 'rxjs';
import { BadRequestException, BadGatewayException, NotFoundException } from '@nestjs/common';
import { BulkProcessUploadDto } from '../dto/bulk-process-upload.dto';

describe('VisionService Bulk Upload', () => {
  let service: VisionService;
  let httpService: HttpService;
  let userRepo: UserRepository;

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:8000'),
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
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AttendanceService, useValue: mockAttendanceService },
        { provide: UserRepository, useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<VisionService>(VisionService);
    httpService = module.get<HttpService>(HttpService);
    userRepo = module.get<UserRepository>(UserRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerMultipleStudents', () => {
    const bulkDto: BulkProcessUploadDto = {
      students: [
        {
          studentId: '101',
          name: 'Student One',
          imagesBase64: ['img1', 'img2']
        },
        {
          studentId: '102',
          name: 'Student Two',
          imagesBase64: ['img3']
        }
      ],
      confidenceThreshold: 0.6
    };

    it('should process multiple students and return results', async () => {
      // Mock Health Check
      mockHttpService.get.mockReturnValue(of({ data: { status: 'ok' } }));
      
      // Mock AI Service Response
      mockHttpService.post.mockImplementation((url) => {
        if (url.includes('/upload/batch')) {
          return of({
            data: {
              embedding: [0.1, 0.2],
              versionOfModel: 'v1',
              dateCreated: new Date().toISOString(),
              imagesProcessed: 2,
              facesDetected: 2
            }
          });
        }
      });

      // Mock DB Find
      mockUserRepo.findById.mockImplementation((id) => ({
        userAccountId: id,
        username: `user_${id}`
      }));

      const results = await service.registerMultipleStudents(bulkDto);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(mockHttpService.post).toHaveBeenCalledTimes(2);
      expect(mockUserRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures (one student missing in DB)', async () => {
      mockHttpService.get.mockReturnValue(of({ data: { status: 'ok' } }));
      mockHttpService.post.mockReturnValue(of({
        data: {
          embedding: [0.1],
          versionOfModel: 'v1',
          dateCreated: new Date().toISOString(),
          imagesProcessed: 1,
          facesDetected: 1
        }
      }));

      // Student 101 found, 102 not found
      mockUserRepo.findById.mockImplementation((id) => {
        if (id === 101) return { userAccountId: 101 };
        return null;
      });

      const results = await service.registerMultipleStudents(bulkDto);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('not found in database');
    });

    it('should handle AI service failure for all students', async () => {
      mockHttpService.get.mockReturnValue(of({ data: { status: 'ok' } }));
      mockHttpService.post.mockImplementation(() => {
        throw new Error('AI Server Down');
      });

      const results = await service.registerMultipleStudents(bulkDto);

      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(false);
      expect(results[0].error).toBe('AI Service Error');
    });
  });
});
