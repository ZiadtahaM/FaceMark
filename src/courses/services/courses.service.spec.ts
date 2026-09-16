import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from './courses.service';
import { CourseRepository } from '../repositories/course.repository';
import { UserRepository } from '../../users/repositories/user.repository';
import { CourseEnrollment } from '../entities/course-enrollment.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';

describe('CoursesService', () => {
  let service: CoursesService;
  let courseRepository: any;
  let userRepository: any;

  beforeEach(async () => {
    courseRepository = {
      findByCodeAll: jest.fn(),
      findByCode: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    userRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: CourseRepository, useValue: courseRepository },
        { provide: UserRepository, useValue: userRepository },
        { provide: getRepositoryToken(CourseEnrollment), useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() } },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should restore a deleted course if it exists with the same code', async () => {
      const createCourseDto = {
        name: 'New Name',
        code: 'CS101',
        instructorId: 2,
      };
      const deletedCourse = {
        courseId: 1,
        code: 'CS101',
        isDeleted: true,
        students: ['some student'],
      };
      const instructor = { userAccountId: 2, userType: Role.STAFF };

      courseRepository.findByCodeAll.mockResolvedValue(deletedCourse);
      userRepository.findById.mockResolvedValue(instructor);
      courseRepository.save.mockImplementation((course) => Promise.resolve(course));
      courseRepository.findOne.mockResolvedValue({
        courseId: 1,
        code: 'CS101',
        isDeleted: false,
        name: 'New Name',
        enrollments: [],
        instructor: { userAccountId: 2, userType: Role.STAFF }
      });

      const result = await service.create(createCourseDto);

      expect(courseRepository.findByCodeAll).toHaveBeenCalledWith('CS101');
      expect(result.isDeleted).toBe(false);
      expect(result.name).toBe('New Name');
      expect(result.enrollments).toEqual([]);
      expect(courseRepository.save).toHaveBeenCalledWith(expect.objectContaining({ courseId: 1 }));
    });

    it('should throw ConflictException if course exists and is not deleted', async () => {
      const createCourseDto = { name: 'Name', code: 'CS101', instructorId: 2 };
      const activeCourse = { code: 'CS101', isDeleted: false };

      courseRepository.findByCodeAll.mockResolvedValue(activeCourse);

      await expect(service.create(createCourseDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft delete and rename the course code', async () => {
      const course = { courseId: 1, code: 'CS101', isDeleted: false };
      courseRepository.findOne.mockResolvedValue(course);
      courseRepository.save.mockImplementation((c) => Promise.resolve(c));

      await service.remove(1);

      expect(course.isDeleted).toBe(true);
      expect(course.code).toMatch(/CS101_deleted_\d+/);
      expect(courseRepository.save).toHaveBeenCalledWith(course);
    });

    it('should hard delete if isHard is true', async () => {
      const course = { courseId: 1, code: 'CS101', isDeleted: false };
      courseRepository.findOne.mockResolvedValue(course);

      await service.remove(1, true);

      expect(courseRepository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should rename a conflicting deleted course code when updating another course', async () => {
      const courseToUpdate = { courseId: 1, code: 'OLD', isDeleted: false, instructor: { userAccountId: 2, userType: Role.STAFF } };
      const conflictingDeletedCourse = { courseId: 2, code: 'NEW', isDeleted: true };
      const updateDto = { code: 'NEW' };

      courseRepository.findById.mockResolvedValue(courseToUpdate);
      courseRepository.findByCodeAll.mockResolvedValue(conflictingDeletedCourse);
      courseRepository.save.mockImplementation((c) => Promise.resolve(c));
      courseRepository.findOne.mockResolvedValue({
        courseId: 1,
        code: 'NEW',
        isDeleted: false,
        name: 'Updated Name',
        enrollments: [],
        instructor: { userAccountId: 2, userType: Role.STAFF }
      });

      await service.update(1, updateDto);

      expect(conflictingDeletedCourse.code).toMatch(/NEW_deleted_\d+/);
      expect(courseToUpdate.code).toBe('NEW');
      expect(courseRepository.save).toHaveBeenCalledWith(conflictingDeletedCourse);
      expect(courseRepository.save).toHaveBeenCalledWith(courseToUpdate);
    });
  });

  describe('unenrollStudent', () => {
    let enrollmentRepository: any;

    beforeEach(() => {
      enrollmentRepository = {
        findOne: jest.fn(),
        remove: jest.fn(),
      };
      // @ts-ignore
      service.enrollmentRepository = enrollmentRepository;
    });

    it('should successfully unenroll a student', async () => {
      const adminUser = { userAccountId: 1, userType: Role.ADMIN };
      const course = { courseId: 10, isDeleted: false, instructor: { userAccountId: 2 } };
      const enrollment = { enrollmentId: 100, courseId: 10, studentId: 5 };

      courseRepository.findOne.mockResolvedValue(course);
      enrollmentRepository.findOne.mockResolvedValue(enrollment);

      await service.unenrollStudent(10, 5, adminUser as any);

      expect(enrollmentRepository.remove).toHaveBeenCalledWith(enrollment);
    });

    it('should throw ForbiddenException if staff tries to unenroll from another instructor\'s course', async () => {
      const staffUser = { userAccountId: 3, userType: Role.STAFF };
      const course = { courseId: 10, isDeleted: false, instructor: { userAccountId: 2 } };

      courseRepository.findOne.mockResolvedValue(course);

      await expect(service.unenrollStudent(10, 5, staffUser as any)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if enrollment does not exist', async () => {
      const adminUser = { userAccountId: 1, userType: Role.ADMIN };
      const course = { courseId: 10, isDeleted: false, instructor: { userAccountId: 2 } };

      courseRepository.findOne.mockResolvedValue(course);
      enrollmentRepository.findOne.mockResolvedValue(null);

      await expect(service.unenrollStudent(10, 5, adminUser as any)).rejects.toThrow(NotFoundException);
    });
  });
});
