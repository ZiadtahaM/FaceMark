import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Course } from '../entities/course.entity';
import { UserAccount } from '../../users/entities/user.entity';

/**
 * Data Access Layer for Course entity.
 */
@Injectable()
export class CourseRepository extends Repository<Course> {
  constructor(private dataSource: DataSource) {
    super(Course, dataSource.createEntityManager());
  }

  async findByCode(code: string): Promise<Course | null> {
    return this.findOne({ where: { code, isDeleted: false }, relations: ['instructor', 'admin'] });
  }

  async findByCodeAll(code: string): Promise<Course | null> {
    return this.findOne({ where: { code }, relations: ['instructor', 'admin', 'enrollments', 'enrollments.student'] });
  }

  async findById(id: number): Promise<Course | null> {
    return this.findOne({ where: { courseId: id, isDeleted: false }, relations: ['instructor', 'admin'] });
  }

  async findAllActive(): Promise<Course[]> {
    return this.find({ where: { isDeleted: false }, relations: ['instructor', 'admin'] });
  }

  async findByInstructor(instructorId: number): Promise<Course[]> {
    return this.find({ 
      where: { 
        instructor: { userAccountId: instructorId }, 
        isDeleted: false 
      }, 
      relations: ['instructor', 'admin'] 
    });
  }

  async findByStudent(studentId: number): Promise<Course[]> {
    return this.createQueryBuilder('course')
      .innerJoinAndSelect('course.enrollments', 'enrollment', 'enrollment.studentId = :studentId', { studentId })
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('course.admin', 'admin')
      .andWhere('course.isDeleted = :isDeleted', { isDeleted: false })
      .getMany();
  }

  async getEnrolledStudents(courseId: number): Promise<UserAccount[]> {
    const course = await this.findOne({
      where: { courseId, isDeleted: false },
      relations: ['enrollments', 'enrollments.student'],
    });
    
    if (!course) {
      return [];
    }
    
    return (course.enrollments || []).map(e => e.student);
  }

  async isStudentEnrolled(courseId: number, studentId: number): Promise<boolean> {
    const result = await this.createQueryBuilder('course')
      .leftJoin('course.enrollments', 'enrollment')
      .where('course.courseId = :courseId', { courseId })
      .andWhere('enrollment.studentId = :studentId', { studentId })
      .andWhere('course.isDeleted = :isDeleted', { isDeleted: false })
      .getOne();
    
    return !!result;
  }
}
