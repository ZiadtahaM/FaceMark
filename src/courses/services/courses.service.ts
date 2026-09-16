import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CourseRepository } from '../repositories/course.repository';
import { UserRepository } from '../../users/repositories/user.repository';
import { CreateCourseDto } from '../dto/create-course.dto';
import { UpdateCourseDto } from '../dto/update-course.dto';
import { Course } from '../entities/course.entity';
import { CourseEnrollment } from '../entities/course-enrollment.entity';
import { Role } from '../../common/enums/role.enum';
import { UserAccount } from '../../users/entities/user.entity';

@Injectable()
export class CoursesService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly userRepository: UserRepository,
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentRepository: Repository<CourseEnrollment>,
  ) {}

  async create(createCourseDto: CreateCourseDto, adminUser?: UserAccount): Promise<Course> {
    const existingCourse = await this.courseRepository.findByCodeAll(createCourseDto.code);
    
    if (existingCourse) {
      if (!existingCourse.isDeleted) {
        throw new ConflictException(`Course with code ${createCourseDto.code} already exists`);
      }
      
      // If it exists but is deleted, we can "restore" it to satisfy the user's request
      // to "add it again". This also avoids unique constraint issues.
      Object.assign(existingCourse, {
        ...createCourseDto,
        instructor: await this.userRepository.findById(createCourseDto.instructorId),
        isDeleted: false,
      });

      if (createCourseDto.adminId) {
        existingCourse.admin = await this.userRepository.findById(createCourseDto.adminId);
      } else if (adminUser) {
        existingCourse.admin = adminUser;
      }
      
      // Validation for instructor and admin (already done partially but to be safe)
      if (!existingCourse.instructor || existingCourse.instructor.userType !== Role.STAFF) {
        throw new NotFoundException(`Staff with ID ${createCourseDto.instructorId} not found`);
      }

      const savedRestore = await this.courseRepository.save(existingCourse);
      
      if (createCourseDto.studentIds) {
        await this.syncEnrollments(savedRestore.courseId, createCourseDto.studentIds);
      }

      return this.findOne(savedRestore.courseId, existingCourse.admin || existingCourse.instructor);
    }

    const instructor = await this.userRepository.findById(createCourseDto.instructorId);
    if (!instructor || instructor.userType !== Role.STAFF) {
      throw new NotFoundException(`Staff with ID ${createCourseDto.instructorId} not found or is not a staff member`);
    }

    let admin = adminUser;
    if (createCourseDto.adminId) {
      admin = await this.userRepository.findById(createCourseDto.adminId);
      if (!admin || admin.userType !== Role.ADMIN) {
        throw new NotFoundException(`Admin with ID ${createCourseDto.adminId} not found`);
      }
    }

    const course = this.courseRepository.create({
      ...createCourseDto,
      instructor,
      admin,
    });

    const savedCourse = await this.courseRepository.save(course);

    // Bulk enroll students if provided
    if (createCourseDto.studentIds && createCourseDto.studentIds.length > 0) {
      await this.syncEnrollments(savedCourse.courseId, createCourseDto.studentIds);
    }

    return this.findOne(savedCourse.courseId, admin || instructor);
    }

    private async syncEnrollments(courseId: number, studentIds: number[]): Promise<void> {
    // 1. Get current enrollments
    const currentEnrollments = await this.enrollmentRepository.find({ where: { courseId } });
    const currentStudentIds = currentEnrollments.map(e => e.studentId);

    // 2. Identify students to add and remove
    const studentsToAdd = studentIds.filter(id => !currentStudentIds.includes(id));
    const studentsToRemove = currentStudentIds.filter(id => !studentIds.includes(id));

    // 3. Remove students
    if (studentsToRemove.length > 0) {
      await this.enrollmentRepository.delete({ courseId, studentId: In(studentsToRemove) });
    }

    // 4. Add students
    if (studentsToAdd.length > 0) {
      const enrollments = studentsToAdd.map(studentId => 
        this.enrollmentRepository.create({
          courseId,
          studentId,
          section: '1', // Default to section 1 for bulk enrollment
          lecture: '1'  // Default to lecture 1 for bulk enrollment
        })
      );
      await this.enrollmentRepository.save(enrollments);
    }
    }

    async findAll(user: UserAccount): Promise<any[]> {
    if (user.userType === Role.ADMIN) {
      return this.courseRepository.findAllActive();
    }
    
    if (user.userType === Role.STAFF) {
      return this.courseRepository.findByInstructor(user.userAccountId);
    }
    
    if (user.userType === Role.STUDENT) {
      return this.courseRepository.findByStudent(user.userAccountId);
    }
    
    return [];
  }

  async findOne(id: number, user: UserAccount): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { courseId: id, isDeleted: false },
      relations: ['instructor', 'admin', 'enrollments', 'enrollments.student'],
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    // Permission check
    if (user.userType === Role.STAFF && course.instructor.userAccountId !== user.userAccountId) {
      throw new ForbiddenException(`Access Denied: As an instructor, you only have access to your own courses. This course (${course.name}) is assigned to another staff member.`);
    }

    if (user.userType === Role.STUDENT) {
      const isEnrolled = course.enrollments.some(e => e.studentId === user.userAccountId);
      if (!isEnrolled) {
        throw new ForbiddenException('You are not enrolled in this course');
      }
    }

    return course;
  }

  async findOneByCode(code: string, user: UserAccount): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { code, isDeleted: false },
      relations: ['instructor', 'admin', 'enrollments', 'enrollments.student'],
    });

    if (!course) {
      throw new NotFoundException(`Course with code ${code} not found`);
    }

    // Permission check
    if (user.userType === Role.STAFF && course.instructor.userAccountId !== user.userAccountId) {
      throw new ForbiddenException(`Access Denied: As an instructor, you only have access to your own courses. This course (${course.name}) is assigned to another staff member.`);
    }

    return course;
  }

  async updateByCode(code: string, updateCourseDto: UpdateCourseDto): Promise<Course> {
    const course = await this.courseRepository.findByCode(code);
    if (!course) {
      throw new NotFoundException(`Course with code ${code} not found`);
    }
    return this.update(course.courseId, updateCourseDto);
  }

  async update(id: number, updateCourseDto: UpdateCourseDto): Promise<Course> {
    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    if (updateCourseDto.code && updateCourseDto.code !== course.code) {
      const existing = await this.courseRepository.findByCodeAll(updateCourseDto.code);
      if (existing) {
        if (!existing.isDeleted) {
          throw new ConflictException(`Course with code ${updateCourseDto.code} already exists`);
        } else {
          // It exists but is deleted. Rename it to free up the code for this update.
          existing.code = `${existing.code}_deleted_${Date.now()}`;
          await this.courseRepository.save(existing);
        }
      }
    }

    if (updateCourseDto.instructorId) {
      const instructor = await this.userRepository.findById(updateCourseDto.instructorId);
      if (!instructor || instructor.userType !== Role.STAFF) {
        throw new NotFoundException(`Staff with ID ${updateCourseDto.instructorId} not found`);
      }
      course.instructor = instructor;
    }

    if (updateCourseDto.adminId) {
      const admin = await this.userRepository.findById(updateCourseDto.adminId);
      if (!admin || admin.userType !== Role.ADMIN) {
        throw new NotFoundException(`Admin with ID ${updateCourseDto.adminId} not found`);
      }
      course.admin = admin;
    }

    Object.assign(course, updateCourseDto);
    const updatedCourse = await this.courseRepository.save(course);

    // Bulk sync students if provided
    if (updateCourseDto.studentIds) {
      await this.syncEnrollments(updatedCourse.courseId, updateCourseDto.studentIds);
    }

    return this.findOne(updatedCourse.courseId, course.admin || course.instructor);
  }

  async remove(id: number, isHard: boolean = false): Promise<void> {
    const course = await this.courseRepository.findOne({ where: { courseId: id } });
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    if (isHard) {
      await this.courseRepository.delete(id);
    } else {
      if (course.isDeleted) return; // Already soft-deleted
      course.isDeleted = true;
      course.code = `${course.code}_deleted_${Date.now()}`;
      await this.courseRepository.save(course);
    }
  }

  async removeByCode(code: string, isHard: boolean = false): Promise<void> {
    const course = await this.courseRepository.findByCodeAll(code);
    if (!course) {
      throw new NotFoundException(`Course with code ${code} not found`);
    }

    if (isHard) {
      await this.courseRepository.delete(course.courseId);
    } else {
      if (course.isDeleted) return; // Already soft-deleted
      course.isDeleted = true;
      course.code = `${course.code}_deleted_${Date.now()}`;
      await this.courseRepository.save(course);
    }
  }

  async enrollStudent(
    courseId: number, 
    studentId: number, 
    user: UserAccount,
    section?: string,
    lecture?: string
  ): Promise<CourseEnrollment> {
    const course = await this.courseRepository.findOne({
      where: { courseId, isDeleted: false },
      relations: ['instructor'],
    });
    if (!course) {
      throw new NotFoundException(`Course Validation Failed: No active course found with ID ${courseId}.`);
    }

    // Permission check: Admin or the course's Instructor
    if (user.userType === Role.STAFF && course.instructor.userAccountId !== user.userAccountId) {
      throw new ForbiddenException(`Access Denied: Instructors can only enroll students in courses they teach. Course '${course.name}' is managed by another instructor.`);
    }

    const student = await this.userRepository.findById(studentId);
    if (!student || student.userType !== Role.STUDENT) {
      throw new NotFoundException(`Student with ID ${studentId} not found`);
    }

    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: { courseId, studentId }
    });

    if (existingEnrollment) {
      throw new ConflictException('Student already enrolled in this course');
    }

    const enrollment = this.enrollmentRepository.create({
      courseId,
      studentId,
      section,
      lecture,
    });

    return this.enrollmentRepository.save(enrollment);
  }

  async getEnrolledStudents(courseId: number, user: UserAccount): Promise<UserAccount[]> {
    const course = await this.courseRepository.findOne({
      where: { courseId, isDeleted: false },
      relations: ['instructor', 'enrollments', 'enrollments.student'],
    });
    if (!course) {
      throw new NotFoundException(`Course Validation Failed: No active course found with ID ${courseId}.`);
    }

    // Permission check: Admin or the course's Instructor
    if (user.userType === Role.STAFF && course.instructor.userAccountId !== user.userAccountId) {
      throw new ForbiddenException(`Access Denied: You can only view enrollment lists for your own assigned courses.`);
    }

    return (course.enrollments || []).map(e => e.student);
  }

  async unenrollStudent(courseId: number, studentId: number, user: UserAccount): Promise<void> {
    const course = await this.courseRepository.findOne({
      where: { courseId, isDeleted: false },
      relations: ['instructor'],
    });

    if (!course) {
      throw new NotFoundException(`Course Validation Failed: No active course found with ID ${courseId}.`);
    }

    // Permission check: Admin or the course's Instructor
    if (user.userType === Role.STAFF && course.instructor.userAccountId !== user.userAccountId) {
      throw new ForbiddenException(`Access Denied: Instructors can only unenroll students from courses they teach.`);
    }

    const enrollment = await this.enrollmentRepository.findOne({
      where: { courseId, studentId }
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment Not Found: Student with ID ${studentId} is not enrolled in course ID ${courseId}.`);
    }

    await this.enrollmentRepository.remove(enrollment);
  }
}
