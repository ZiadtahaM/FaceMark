import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserAccount } from '../../users/entities/user.entity';
import { Course } from './course.entity';

@Entity('enrollments')
export class CourseEnrollment {
  @PrimaryGeneratedColumn()
  enrollmentId: number;

  @Column()
  courseId: number;

  @ManyToOne(() => Course, (course) => course.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column()
  studentId: number;

  @ManyToOne(() => UserAccount, (user) => user.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: UserAccount;

  @Column({ nullable: true })
  section: string;

  @Column({ nullable: true })
  lecture: string;

  @CreateDateColumn()
  enrolledAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
