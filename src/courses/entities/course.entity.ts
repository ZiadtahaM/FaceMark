import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { UserAccount } from '../../users/entities/user.entity';
import { Attendance } from '../../attendance/entities/attendance.entity';
import { CourseEnrollment } from './course-enrollment.entity';

/**
 * Database entity representing a course in the system.
 */
@Entity('courses')
export class Course {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  courseId: number;

  @ApiProperty({ example: 'Mathematics' })
  @Column()
  name: string;

  @ApiProperty({ example: 'MATH101' })
  @Column({ unique: true })
  code: string;

  @ApiProperty({ example: 'Introductory calculus', required: false })
  @Column({ nullable: true })
  description: string;

  @ApiProperty({ example: 4, default: 1 })
  @Column({ default: 1 })
  sections: number;

  // The admin who manages/created the course.
  @ManyToOne(() => UserAccount)
  admin: UserAccount;

  // The instructor (Staff) for the course.
  @ManyToOne(() => UserAccount)
  instructor: UserAccount;

  // Enrollments in the course.
  @OneToMany(() => CourseEnrollment, (enrollment) => enrollment.course)
  enrollments: CourseEnrollment[];

  // Attendance records for this course.
  @OneToMany(() => Attendance, (attendance) => attendance.course)
  attendanceRecords: Attendance[];

  @ApiProperty({ example: 3, default: 3 })
  @Column({ default: 3 })
  credits: number;

  @ApiProperty({ example: 'Mon/Wed 10:00-12:00', required: false })
  @Column({ nullable: true })
  schedule: string;

  @ApiProperty({ example: 'Room 302', required: false })
  @Column({ nullable: true })
  room: string;

  @ApiProperty({ example: '{}', required: false })
  @Column({ type: 'text', nullable: true })
  scheduleJson: string; // Storing schedule as JSON string for simplicity in SQLite

  @ApiProperty({ example: false })
  @Column({ default: false })
  isDeleted: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @UpdateDateColumn()
  updatedAt: Date;
}
