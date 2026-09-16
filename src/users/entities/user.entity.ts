import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';
import { Course } from '../../courses/entities/course.entity';
import { Attendance } from '../../attendance/entities/attendance.entity';
import { CourseEnrollment } from '../../courses/entities/course-enrollment.entity';

/**
 * Database entity representing a user account in the system.
 * Maps to the 'users' table in MySQL.
 */
@Entity('users')
export class UserAccount {
  // Unique primary identifier for each user.
  @ApiProperty({ example: 1, description: 'The unique identifier of the user' })
  @PrimaryGeneratedColumn()
  userAccountId: number;

  // Unique username for authentication purposes.
  @ApiProperty({ example: 'ziad_taha', description: 'The unique username of the user' })
  @Column({ unique: true })
  username: string;

  // Securely hashed password string.
  @ApiProperty({ example: 'hashed_password', description: 'The hashed password (hidden in responses usually)' })
  @Column()
  password: string;

  // Full name of the user
  @ApiProperty({ example: 'Ziad Taha', description: 'Full name of the user', required: false })
  @Column({ nullable: true })
  fullName: string;

  // Email address of the user
  @ApiProperty({ example: 'ziad@example.com', description: 'Email address', required: false })
  @Column({ nullable: true })
  email: string;

  // Phone number of the user
  @ApiProperty({ example: '+20123456789', description: 'Phone number', required: false })
  @Column({ nullable: true })
  phone: string;

  // The classification of the user (Admin, Staff, or Student).
  @ApiProperty({ enum: Role, default: Role.STUDENT, description: 'The role of the user' })
  @Column({
    type: 'simple-enum',
    enum: Role,
    default: Role.STUDENT,
  })
  userType: Role;

  // Flag for soft-deletion of the user record.
  @ApiProperty({ example: false, description: 'Soft deletion flag' })
  @Column({ default: false })
  isDeleted: boolean;

  // ==================== AI Face Recognition Fields ====================
  
  // Face recognition embedding data (JSON string or vector)
  @ApiProperty({ description: 'The AI face embedding for this user', required: false })
  @Column({ type: 'text', nullable: true })
  faceEmbedding: string;

  // Version of the AI model used to generate the embedding.
  @ApiProperty({ description: 'The version of the model that generated the embedding', required: false })
  @Column({ nullable: true })
  embeddingVersion: string;

  // Timestamp of when the embedding was last generated.
  @ApiProperty({ description: 'When the face embedding was created', required: false })
  @Column({ nullable: true })
  embeddingCreatedAt: Date;

  // Number of images used to generate the embedding
  @ApiProperty({ description: 'Number of images used to generate the embedding', required: false, default: 0 })
  @Column({ nullable: true, default: 0 })
  embeddingImagesCount: number;

  // Last time the face was recognized
  @ApiProperty({ description: 'Last time the face was recognized', required: false })
  @Column({ nullable: true })
  lastRecognizedAt: Date;

  // ==================== Relationships ====================

  // Courses managed by this user (Admin only).
  @OneToMany(() => Course, (course) => course.admin)
  managedCourses: Course[];

  // Courses taught by this user (Staff only).
  @OneToMany(() => Course, (course) => course.instructor)
  taughtCourses: Course[];

  // Enrollments in courses (Student only).
  @OneToMany(() => CourseEnrollment, (enrollment) => enrollment.student)
  enrollments: CourseEnrollment[];

  // Attendance records for this user (Student only).
  @OneToMany(() => Attendance, (attendance) => attendance.student)
  attendanceRecords: Attendance[];

  // ==================== Timestamps ====================

  // Automatically recorded timestamp of account creation.
  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @CreateDateColumn()
  createdAt: Date;

  // Automatically updated timestamp of the last account modification.
  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @UpdateDateColumn()
  updatedAt: Date;
}