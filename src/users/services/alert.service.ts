import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ModuleRef } from '@nestjs/core';
import { Alert } from '../entities/alert.entity';
import { UserAccount } from '../entities/user.entity';
import { AttendanceRepository } from '../../attendance/repository/attendance.repository';
import { CourseRepository } from '../../courses/repositories/course.repository';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class AlertService {
  constructor(
    @InjectRepository(Alert)
    private alertRepo: Repository<Alert>,
    private moduleRef: ModuleRef,
  ) {}

  private getAttendanceRepo(): AttendanceRepository {
    return this.moduleRef.get(AttendanceRepository, { strict: false });
  }

  private getCourseRepo(): CourseRepository {
    return this.moduleRef.get(CourseRepository, { strict: false });
  }

  private getUserRepo(): UserRepository {
    return this.moduleRef.get(UserRepository, { strict: false });
  }

  async findAll(user: UserAccount): Promise<Alert[]> {
    return this.alertRepo.find({
      where: { user: { userAccountId: user.userAccountId } },
      order: { createdAt: 'DESC' },
    });
  }

  async clearAll(user: UserAccount): Promise<void> {
    await this.alertRepo.delete({ user: { userAccountId: user.userAccountId } });
  }

  async remove(id: number, user: UserAccount): Promise<void> {
    const alert = await this.alertRepo.findOne({
      where: { id, user: { userAccountId: user.userAccountId } },
    });
    if (!alert) {
      throw new NotFoundException(`Alert with ID ${id} not found`);
    }
    await this.alertRepo.remove(alert);
  }

  async create(user: UserAccount, title: string, message: string, type: string = 'info', metadata: any = null): Promise<Alert> {
    const alert = this.alertRepo.create({
      user,
      title,
      message,
      type,
      metadata,
    });
    return this.alertRepo.save(alert);
  }

  async sendAlert(userId: number, message: string, type: string = 'info', title: string = 'Alert', metadata: any = null) {
    const userRepo = this.getUserRepo();
    const user = await userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    return this.create(user, title, message, type, metadata);
  }

  async checkStudentLowAttendance(studentId: number, courseId: number, threshold: number = 75) {
    const attendanceRepo = this.getAttendanceRepo();
    const courseRepo = this.getCourseRepo();

    const course = await courseRepo.findById(courseId);
    if (!course) return;

    const records = await attendanceRepo.findByStudent(studentId, courseId);
    const total = records.length;
    // Status 1 = Present, 3 = Late
    const present = records.filter(r => r.attendanceStatusId === 1 || r.attendanceStatusId === 3).length;
    const attendanceRate = total > 0 ? (present / total) * 100 : 0;

    if (attendanceRate < threshold && total >= 3) { // Only alert after at least 3 sessions to avoid noise
      const title = 'Low Attendance Warning';
      const message = `⚠️ Your attendance in ${course.name} is ${attendanceRate.toFixed(1)}%. Please catch up!`;
      
      // Prevent spam: Check if a similar alert was sent in the last 24h
      const recentAlert = await this.alertRepo.findOne({
        where: { 
          user: { userAccountId: studentId }, 
          title,
          createdAt: Between(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date()) 
        } as any
      });

      if (!recentAlert) {
        await this.sendAlert(studentId, message, 'warning', title, {
          courseId,
          courseName: course.name,
          currentRate: attendanceRate.toFixed(1),
          threshold
        });
      }
    }
  }

  async checkLowAttendance(courseId: number, threshold: number = 75) {
    const courseRepo = this.getCourseRepo();
    const attendanceRepo = this.getAttendanceRepo();
    
    const course = await courseRepo.findById(courseId);
    if (!course) {
      throw new NotFoundException(`Operation Aborted: Course with ID ${courseId} was not found.`);
    }
    
    const enrolledStudents = await courseRepo.getEnrolledStudents(courseId);
    const alerts = [];
    
    for (const student of enrolledStudents) {
      const records = await attendanceRepo.findByStudent(student.userAccountId, courseId);
      const total = records.length;
      const present = records.filter(r => r.attendanceStatusId === 1 || r.attendanceStatusId === 3).length;
      const attendanceRate = total > 0 ? (present / total) * 100 : 0;
      
      if (attendanceRate < threshold && attendanceRate > 0) {
        const title = 'Low Attendance Warning';
        const message = `⚠️ Attendance Alert: Your attendance in ${course.name} is ${attendanceRate.toFixed(2)}% which is below ${threshold}%.`;
        
        const alert = await this.sendAlert(student.userAccountId, message, 'warning', title);
        
        alerts.push({
          studentId: student.userAccountId,
          studentName: student.username,
          total,
          present,
          attendanceRate: attendanceRate.toFixed(2),
          alert
        });
      }
    }
    
    return {
      courseId,
      courseName: course.name,
      threshold,
      studentsBelowThreshold: alerts.length,
      alerts
    };
  }

  async sendBatchAlerts(userIds: number[], message: string, type: string = 'info', title: string = 'Batch Alert') {
    if (!userIds || !Array.isArray(userIds)) {
      throw new BadRequestException('Batch Notification Failed: The userIds parameter must be a valid array of student numeric IDs.');
    }
    
    const results = [];
    
    for (const userId of userIds) {
      try {
        const alert = await this.sendAlert(userId, message, type, title);
        results.push({ userId, success: true, alert });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        results.push({ userId, success: false, error: errorMessage });
      }
    }
    
    return results;
  }

  async getLowAttendanceReport(courseId: number, threshold: number = 75) {
    const courseRepo = this.getCourseRepo();
    const attendanceRepo = this.getAttendanceRepo();
    
    const course = await courseRepo.findById(courseId);
    if (!course) {
      throw new NotFoundException(`Operation Aborted: Course with ID ${courseId} was not found.`);
    }
    
    const enrolledStudents = await courseRepo.getEnrolledStudents(courseId);
    const report = [];
    
    for (const student of enrolledStudents) {
      const records = await attendanceRepo.findByStudent(student.userAccountId, courseId);
      const total = records.length;
      const present = records.filter(r => r.attendanceStatusId === 1 || r.attendanceStatusId === 3).length;
      const absent = records.filter(r => r.attendanceStatusId === 2).length;
      const late = records.filter(r => r.attendanceStatusId === 3).length;
      const attendanceRate = total > 0 ? (present / total) * 100 : 0;
      
      report.push({
        studentId: student.userAccountId,
        studentName: student.username,
        total,
        present,
        absent,
        late,
        attendanceRate: attendanceRate.toFixed(2),
        isLow: attendanceRate < threshold
      });
    }
    
    return {
      courseId,
      courseName: course.name,
      threshold,
      totalStudents: enrolledStudents.length,
      studentsWithLowAttendance: report.filter(s => s.isLow).length,
      report
    };
  }
}
