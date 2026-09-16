import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { AttendanceRepository } from '../repository/attendance.repository';
import { CreateAttendanceDto } from '../dto/create-attendance.dto';
import { UpdateAttendanceDto } from '../dto/update-attendance.dto';
import { BulkAttendanceDto } from '../dto/bulk-attendance.dto';
import { UserRepository } from '../../users/repositories/user.repository';
import { CourseRepository } from '../../courses/repositories/course.repository';
import { AlertService } from '../../users/services/alert.service';
import { Role } from '../../common/enums/role.enum';
import { UserAccount } from '../../users/entities/user.entity';
import { In } from 'typeorm';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendanceRepo: AttendanceRepository,
    private readonly userRepo: UserRepository,
    private readonly courseRepo: CourseRepository,
    private readonly alertService: AlertService,
  ) {}

  async create(dto: CreateAttendanceDto, user: UserAccount) {
    // 1. Verify Student exists and is actually a student
    const student = await this.userRepo.findById(dto.studentId);
    if (!student || student.userType !== Role.STUDENT) {
      throw new NotFoundException(`Student Validation Failed: Student with ID ${dto.studentId} not found or is not registered as a student.`);
    }

    // 2. Verify Course exists
    const course = await this.courseRepo.findOne({
      where: { courseId: dto.courseId, isDeleted: false },
      relations: ['enrollments', 'instructor']
    });
    if (!course) {
      throw new NotFoundException(`Course Validation Failed: Course with ID ${dto.courseId} was not found in our active records.`);
    }

    // 3. Permission check: Staff can only record attendance for their own courses
    if (user.userType === Role.STAFF && course.instructor?.userAccountId !== user.userAccountId) {
      throw new ForbiddenException(`Access Denied: As a Staff member, you can only record attendance for your own assigned courses. This course (${course.name}) belongs to another instructor.`);
    }

    // 4. Verify Student is enrolled in Course
    const isEnrolled = course.enrollments?.some(e => e.studentId === student.userAccountId);
    if (!isEnrolled) {
      throw new ForbiddenException(`Access Denied: Student ${student.username} (ID: ${student.userAccountId}) is not enrolled in course ${course.name}. Attendance cannot be recorded for non-enrolled students.`);
    }

    // 5. Determine and verify staffId
    let effectiveStaffId: number;
    if (user.userType === Role.STAFF) {
      effectiveStaffId = user.userAccountId;
    } else {
      // For Admin, verify the provided staffId exists and is a staff member
      const staff = await this.userRepo.findById(dto.staffId);
      if (!staff || staff.userType !== Role.STAFF) {
        throw new NotFoundException(`Verification Failed: Staff member with ID ${dto.staffId} was not found or does not have a Staff role.`);
      }
      effectiveStaffId = dto.staffId;
    }

    // 6. Create and save record
    const result = await this.attendanceRepo.create({
      recordDate: this.normalizeDate(dto.recordDate),
      student: student,
      course: course,
      staffId: effectiveStaffId,
      attendanceStatusId: dto.attendanceStatusId,
      room: dto.room,
      sessionType: dto.sessionType,
      sessionNumber: dto.sessionNumber,
      lectureNumber: dto.lectureNumber,
      faceConfidence: dto.faceConfidence,
      detected: dto.detected !== undefined ? dto.detected : true,
      accuracy: dto.accuracy,
      processingTime: dto.processingTime,
      recognitionRate: dto.recognitionRate,
      checkInTime: dto.checkInTime,
    });

    // 7. Automatic Alert Check (Asynchronous)
    if (dto.attendanceStatusId === 2) {
      this.triggerAbsenceAlert(student.userAccountId, course.courseId, this.normalizeDate(dto.recordDate).toISOString().split('T')[0]).catch(() => {});
    }
    
    if (dto.attendanceStatusId !== 1) { // Only check if not Present to optimize
       this.alertService.checkStudentLowAttendance(student.userAccountId, course.courseId).catch(err => {
         console.error(`[Alert Error] Failed to check low attendance for student ${student.userAccountId}:`, err);
       });
    }

    return result;
  }

  async getStudentDiagram(userId: number) {
    const student = await this.userRepo.findOne({
      where: { userAccountId: userId },
      relations: {
        enrollments: {
          course: true
        },
        attendanceRecords: {
          course: true
        }
      }
    });

    if (!student) throw new NotFoundException(`Student not found: ID ${userId} does not exist.`);

    const enrolledCourses = (student.enrollments || []).map(e => e.course);

    const diagram = {
      student: {
        name: student.username,
        totalCredits: enrolledCourses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0),
      },
      structure: enrolledCourses.map(course => ({
        id: `course-${course.courseId}`,
        label: course.name,
        type: 'course',
        credits: Number(course.credits) || 0,
        children: [
          {
            id: `course-${course.courseId}-lec`,
            label: 'Lectures',
            type: 'session_group',
            room: 'R3/R2', 
            stats: this.calculateSessionStats(student.attendanceRecords || [], course.courseId, 'LECTURE')
          },
          {
            id: `course-${course.courseId}-sec`,
            label: 'Sections',
            type: 'session_group',
            room: 'N2/N3',
            stats: this.calculateSessionStats(student.attendanceRecords || [], course.courseId, 'SECTION')
          }
        ]
      })),
      courses: enrolledCourses.map(course => {
        const records = (student.attendanceRecords || []).filter(r => r.course?.courseId === course.courseId);
        // Status 1 = Present, 3 = Late (both count as attendance)
        const attendedCount = records.filter(r => r.attendanceStatusId === 1 || r.attendanceStatusId === 3).length;
        return {
          courseName: course.name,
          credits: Number(course.credits) || 0,
          attendanceRate: records.length > 0 
            ? Math.round((attendedCount / records.length) * 100)
            : 0
        };
      }),
      metrics: {
        avg: enrolledCourses.length > 0 
          ? (enrolledCourses.reduce((acc, course) => {
              const records = (student.attendanceRecords || []).filter(r => r.course?.courseId === course.courseId);
              const attendedCount = records.filter(r => r.attendanceStatusId === 1 || r.attendanceStatusId === 3).length;
              return acc + (records.length > 0 ? (attendedCount / records.length) : 0);
            }, 0) / enrolledCourses.length * 100).toFixed(1) + '%'
          : '0%',
        topCourse: enrolledCourses[0]?.name || 'N/A',
        riskStudents: 0,
        aiAccuracy: '99.2%'
      }
    };

    return diagram;
  }

  private calculateSessionStats(records: any[], courseId: number, type: string) {
    const filtered = records.filter(r => r.course?.courseId === courseId && r.sessionType === type);
    return {
      attended: filtered.filter(r => r.attendanceStatusId === 1 || r.attendanceStatusId === 3).length,
      total: filtered.length,
      rooms: [...new Set(filtered.map(r => r.room).filter(Boolean))]
    };
  }

  async saveBulk(dto: BulkAttendanceDto, user: UserAccount) {
    const courseId = parseInt(dto.courseId);
    if (isNaN(courseId)) throw new BadRequestException(`Validation Failed: Provided courseId '${dto.courseId}' is not a valid number.`);

    const course = await this.courseRepo.findOne({
      where: { courseId, isDeleted: false },
      relations: ['enrollments', 'instructor']
    });
    if (!course) throw new NotFoundException(`Course not found: Course with ID ${courseId} does not exist.`);

    // Permission check
    if (user.userType === Role.STAFF && course.instructor?.userAccountId !== user.userAccountId) {
      throw new ForbiddenException(`Access Denied: You can only record bulk attendance for your own courses. This course (${course.name}) belongs to another instructor.`);
    }

    const studentIds = dto.attendance.map(a => parseInt(a.studentId)).filter(id => !isNaN(id));
    if (studentIds.length === 0) throw new BadRequestException('Validation Failed: No valid numeric student IDs were found in the provided attendance list.');

    const students = await this.userRepo.find({
      where: { userAccountId: In(studentIds), isDeleted: false, userType: Role.STUDENT }
    });

    const studentMap = new Map(students.map(s => [s.userAccountId, s]));
    const recordsToSave = [];
    const skippedStudents = [];
    const processedStudentIds = new Set<number>();

    for (const item of dto.attendance) {
      const sId = parseInt(item.studentId);
      const student = studentMap.get(sId);
      
      if (!student) {
        skippedStudents.push(`${item.studentId} (Student not found)`);
        continue;
      }

      // Verify enrollment
      const isEnrolled = course.enrollments?.some(e => e.studentId === student.userAccountId);
      if (!isEnrolled) {
        skippedStudents.push(`${item.studentId} (Not enrolled in ${course.name})`);
        continue;
      }

      const statusId = this.mapStatusToId(item.status);
      recordsToSave.push({
        recordDate: this.normalizeDate(dto.date),
        student: student,
        course: course,
        staffId: user.userAccountId,
        attendanceStatusId: statusId,
        room: dto.room || 'Manual Bulk',
        sessionType: dto.sessionType || 'SECTION',
        sessionNumber: dto.section ? String(dto.section) : '1',
        detected: true,
        accuracy: 1.0, 
      });
      
      if (statusId === 2) {
        this.triggerAbsenceAlert(student.userAccountId, course.courseId, this.normalizeDate(dto.date).toISOString().split('T')[0]).catch(() => {});
      }
      processedStudentIds.add(student.userAccountId);
    }

    if (recordsToSave.length === 0) {
      throw new BadRequestException(`Bulk Save Failed: No valid records could be processed. Details: ${skippedStudents.join(', ')}`);
    }

    const savedRecords = await this.attendanceRepo.saveMany(recordsToSave);
    // Automatic Alert Check for affected students
    processedStudentIds.forEach(sId => {
      this.alertService.checkStudentLowAttendance(sId, course.courseId).catch(() => {});
    });

    return {
      message: `Successfully saved ${savedRecords.length} attendance records.`,
      savedCount: savedRecords.length,
      skippedCount: skippedStudents.length,
      skipped: skippedStudents.length > 0 ? skippedStudents : undefined
    };
  }

  private mapStatusToId(status: string): number {
    const map = { 'Present': 1, 'Absent': 2, 'Late': 3, 'Excused': 4 };
    return map[status] || 2; // Default to Absent if unknown
  }

  async findAllPaginated(page: number, limit: number, filters: any, user: UserAccount) {
    let courseIds: number[] = [];
    
    if (user.userType === Role.STAFF) {
      const staffCourses = await this.courseRepo.findByInstructor(user.userAccountId);
      courseIds = staffCourses.map(c => c.courseId);
      if (courseIds.length === 0) return { data: [], total: 0, page, limit, totalPages: 0 };
    }
    
    return this.attendanceRepo.findAllWithFilters(page, limit, filters, courseIds);
  }

  async findAll(user: UserAccount, query?: any) {
    if (user.userType === Role.ADMIN) {
      return this.attendanceRepo.findAll();
    }

    if (user.userType === Role.STAFF) {
      if (query?.courseId) {
        const result = await this.attendanceRepo.findAllWithFilters(1, 1000, {
          courseId: parseInt(query.courseId),
          session: query.session || undefined,
          date: query.date
        });
        return result.data;
      }
      return this.attendanceRepo.findByStaff(user.userAccountId);
    }

    if (user.userType === Role.STUDENT) {
      return this.attendanceRepo.findByStudent(user.userAccountId);
    }

    return [];
  }

  async getStudentAttendance(studentId: number, courseId?: number) {
    const records = await this.attendanceRepo.findByStudent(studentId, courseId);
    
    // Map status IDs to human-readable labels
    const statusMap = { 1: 'Present', 2: 'Absent', 3: 'Late', 4: 'Excused' };
    
    return records.map(record => ({
      ...record,
      statusLabel: statusMap[record.attendanceStatusId] || 'Unknown'
    }));
  }

  private async triggerAbsenceAlert(studentId: number, courseId: number, date: string) {
    try {
      const student = await this.userRepo.findById(studentId);
      const course = await this.courseRepo.findById(courseId);
      if (!student || !course) return;

      await this.alertService.sendAlert(
        studentId,
        `You were marked Absent for ${course.name} on ${date}.`,
        'danger',
        'Absence Recorded'
      );
    } catch (error) {
      console.error('Failed to trigger absence alert:', error.message);
    }
  }

  async getStudentTracking(studentId: number, courseId: number) {
    const student = await this.userRepo.findById(studentId);
    if (!student) throw new NotFoundException(`Student not found: ID ${studentId} does not exist.`);

    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException(`Course not found: ID ${courseId} does not exist.`);

    const records = await this.attendanceRepo.findByStudent(studentId, courseId);
    if (records.length === 0) {
      return { student: student.username, course: course.name, status: 'No records found', riskLevel: 'N/A' };
    }

    const presentCount = records.filter(r => r.attendanceStatusId === 1 || r.attendanceStatusId === 3).length;
    const rate = (presentCount / records.length) * 100;

    let consecutiveAbsences = 0;
    for (const record of records) {
      if (record.attendanceStatusId === 2) {
        consecutiveAbsences++;
      } else {
        break;
      }
    }

    let trend = 'Stable';
    if (records.length >= 6) {
      const recent = records.slice(0, 3).filter(r => r.attendanceStatusId === 1).length;
      const older = records.slice(3, 6).filter(r => r.attendanceStatusId === 1).length;
      if (recent > older) trend = 'Improving';
      if (recent < older) trend = 'Declining';
    }

    let riskLevel = 'Low';
    if (rate < 75 || consecutiveAbsences >= 2) riskLevel = 'Medium';
    if (rate < 60 || consecutiveAbsences >= 3) riskLevel = 'High';

    return {
      student: { id: studentId, name: student.username },
      course: { id: courseId, name: course.name },
      metrics: {
        attendanceRate: rate.toFixed(1) + '%',
        totalSessions: records.length,
        consecutiveAbsences,
        trend,
        riskLevel,
      },
      summary: `Student has attended ${presentCount}/${records.length} sessions. Currently on a ${consecutiveAbsences} session absence streak.`
    };
  }

  async getCourseAttendance(courseId: number, session?: string, date?: string) {
    const result = await this.attendanceRepo.findAllWithFilters(1, 1000, {
      courseId,
      session,
      date
    });
    return result.data;
  }

  async isStaffAuthorizedForCourse(staffId: number, courseId: number): Promise<boolean> {
    const course = await this.courseRepo.findById(courseId);
    return course?.instructor?.userAccountId === staffId;
  }

  async statistics(user: UserAccount, courseId?: number) {
    if (user.userType === Role.ADMIN) {
      return this.attendanceRepo.getDetailedStatistics(courseId);
    } else if (user.userType === Role.STAFF) {
      if (courseId) {
        const isAuthorized = await this.isStaffAuthorizedForCourse(user.userAccountId, courseId);
        if (!isAuthorized) throw new ForbiddenException(`Access Denied: You are not authorized for course ID ${courseId}.`);
        return this.attendanceRepo.getDetailedStatistics(courseId);
      }
      return this.attendanceRepo.statisticsByStaff(user.userAccountId);
    } else if (user.userType === Role.STUDENT) {
      return this.attendanceRepo.statisticsByStudent(user.userAccountId);
    }
    
    return [];
  }

  async getReportData(user: UserAccount, courseId: number | null, fromDate: string, toDate: string) {
    if (user.userType === Role.STAFF && courseId) {
      const isAuthorized = await this.isStaffAuthorizedForCourse(user.userAccountId, courseId);
      if (!isAuthorized) throw new ForbiddenException(`Access Denied: You are not authorized for course ID ${courseId}.`);
    }

    const records = await this.attendanceRepo.findByDateRange(courseId, fromDate, toDate);
    
    return records.map(record => ({
      studentId: record.student.userAccountId,
      name: record.student.username,
      course: record.course.name,
      status: this.mapIdToStatus(record.attendanceStatusId),
      date: record.recordDate,
      time: record.checkInTime || 'N/A',
      session: record.sessionNumber || 'N/A',
      type: record.sessionType || 'N/A'
    }));
  }

  private mapIdToStatus(id: number): string {
    const statuses: Record<number, string> = { 1: 'Present', 2: 'Absent', 3: 'Late', 4: 'Excused' };
    return statuses[id] || 'Unknown';
  }

  async update(recordId: number, dto: UpdateAttendanceDto, userId: number, userRole: string) {
    const record = await this.attendanceRepo.findOneById(recordId);
    if (!record) {
      throw new NotFoundException(`Attendance record with ID ${recordId} not found.`);
    }
    
    if (userRole !== Role.ADMIN && record.staffId !== userId) {
      throw new ForbiddenException('Access Denied: You can only update attendance records that you created.');
    }
    
    const updateData: any = { ...dto };
    if (dto.recordDate) {
      updateData.recordDate = this.normalizeDate(dto.recordDate);
    }
    
    return this.attendanceRepo.update(recordId, updateData);
  }

  async delete(recordId: number, userRole: string) {
    const record = await this.attendanceRepo.findOneById(recordId);
    if (!record) {
      throw new NotFoundException(`Attendance record with ID ${recordId} not found.`);
    }
    
    if (userRole !== Role.ADMIN) {
      throw new ForbiddenException('Access Denied: Only administrators have permission to delete records.');
    }
    
    return this.attendanceRepo.delete(recordId);
  }

  async recordAiAttendance(data: {
    studentId: number;
    courseId: number;
    sessionType: string;
    sessionNumber: string;
    room?: string;
    confidenceScore: number;
    matchStatus: string;
    sessionId?: string;
    processingTimeMs?: number;
  }) {
    const student = await this.userRepo.findById(data.studentId);
    if (!student || student.userType !== Role.STUDENT) {
      throw new NotFoundException(`AI Recording Failed: Student with ID ${data.studentId} not found.`);
    }

    const course = await this.courseRepo.findOne({
      where: { courseId: data.courseId, isDeleted: false },
      relations: ['enrollments', 'instructor']
    });
    if (!course) {
      throw new NotFoundException(`AI Recording Failed: Course with ID ${data.courseId} not found.`);
    }

    const isEnrolled = course.enrollments?.some(e => e.studentId === student.userAccountId);
    if (!isEnrolled) {
      throw new ForbiddenException(`AI Access Denied: Student ${student.username} is not enrolled in course ${course.name}.`);
    }

    const today = new Date().toISOString().split('T')[0];
    
    const duplicate = await this.attendanceRepo.findDuplicate(data.studentId, data.courseId, today);
    if (duplicate) {
      return { status: 'ALREADY_RECORDED', record: duplicate };
    }

    const record = await this.attendanceRepo.create({
      student: student,
      course: course,
      recordDate: today as any,
      attendanceStatusId: 1, 
      staffId: course.instructor?.userAccountId || 0, 
      confidenceScore: data.confidenceScore,
      faceConfidence: data.confidenceScore,
      matchStatus: data.matchStatus,
      sessionId: data.sessionId,
      sessionType: data.sessionType,
      sessionNumber: data.sessionNumber,
      room: data.room || 'AI Vision',
      detected: true,
      accuracy: data.confidenceScore,
      checkInTime: new Date().toTimeString().split(' ')[0],
    });

    this.alertService.checkStudentLowAttendance(student.userAccountId, course.courseId).catch(() => {});

    return { status: 'RECORDED', record };
  }

  async findBySession(sessionId: string) {
    return this.attendanceRepo.findBySession(sessionId);
  }

  private normalizeDate(dateString: string): Date {
    if (dateString.includes('T')) {
      const date = new Date(dateString);
      date.setUTCHours(0, 0, 0, 0);
      return date;
    }
    return new Date(dateString + 'T00:00:00Z');
  }
}
