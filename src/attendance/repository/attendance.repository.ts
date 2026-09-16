import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Attendance } from '../entities/attendance.entity';

@Injectable()
export class AttendanceRepository {

  constructor(
    @InjectRepository(Attendance)
    private repo: Repository<Attendance>,
  ) {}

  create(data: Partial<Attendance>) {
    const record = this.repo.create(data);
    return this.repo.save(record);
  }

  saveMany(records: Partial<Attendance>[]) {
    const entities = this.repo.create(records);
    return this.repo.save(entities);
  }

  findAll() {
    return this.repo.find({
      relations: ['student', 'course', 'course.instructor']
    });
  }

  async findAllWithFilters(
    page: number, 
    limit: number, 
    filters: { courseId?: number; session?: string; date?: string; fromDate?: string; toDate?: string }, 
    courseIds?: number[]
  ): Promise<{ data: Attendance[]; total: number; page: number; limit: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const where: any = {};
    
    if (courseIds && courseIds.length > 0) {
      where.courseId = In(courseIds);
    }
    if (filters.courseId) {
      where.courseId = filters.courseId;
    }
    if (filters.session) {
      where.sessionNumber = filters.session;
    }
    if (filters.date) {
      const date = new Date(filters.date);
      if (!isNaN(date.getTime())) {
        const dateStr = date.toISOString().split('T')[0];
        where.recordDate = dateStr;
      }
    } else if (filters.fromDate && filters.toDate) {
      where.recordDate = Between(filters.fromDate, filters.toDate);
    }
    
    const [data, total] = await this.repo.findAndCount({
      where,
      relations: ['student', 'course'],
      skip,
      take: limit,
      order: { recordDate: 'DESC' }
    });
    
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  findByDateRange(courseId: number | null, fromDate: string, toDate: string) {
    const where: any = {
      recordDate: Between(fromDate, toDate)
    };
    if (courseId) {
      where.courseId = courseId;
    }
    return this.repo.find({
      where,
      relations: ['student', 'course'],
      order: { recordDate: 'ASC' }
    });
  }

  findByStudent(studentId: number, courseId?: number) {
    const where: any = { student: { userAccountId: studentId } };
    if (courseId) {
      where.course = { courseId };
    }
    return this.repo.find({
      where,
      relations: ['student', 'course', 'course.instructor'],
      order: { recordDate: 'DESC' }
    });
  }

  findByStaff(staffId: number) {
    return this.repo.find({
      where: { course: { instructor: { userAccountId: staffId } } },
      relations: ['student', 'course', 'course.instructor']
    });
  }

  findByFilter(filter: { courseId: number; session: string; date: string }) {
    const date = new Date(filter.date);
    const dateStr = !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    return this.repo.find({
      where: {
        courseId: filter.courseId,
        sessionNumber: filter.session,
        recordDate: dateStr as any
      },
      relations: ['student', 'course']
    });
  }

  statistics() {
    return this.repo
      .createQueryBuilder('attendance')
      .select('attendance.attendanceStatusId','status')
      .addSelect('COUNT(*)','count')
      .groupBy('attendance.attendanceStatusId')
      .getRawMany();
  }

  async getDetailedStatistics(courseId?: number) {
    let queryBuilder = this.repo
      .createQueryBuilder('attendance')
      .select('attendance.attendanceStatusId', 'status')
      .addSelect('COUNT(*)', 'count');
    
    if (courseId) {
      queryBuilder = queryBuilder.where('attendance.courseId = :courseId', { courseId });
    }
    
    const rawStats = await queryBuilder
      .groupBy('attendance.attendanceStatusId')
      .getRawMany();
    
    const totalRecords = rawStats.reduce((sum, stat) => sum + parseInt(stat.count), 0);
    const statusMap: Record<number, string> = { 1: 'Present', 2: 'Absent', 3: 'Late', 4: 'Excused' };
    
    return {
      total: totalRecords,
      breakdown: rawStats.map(stat => ({
        statusId: parseInt(stat.status),
        statusName: statusMap[parseInt(stat.status)] || 'Unknown',
        count: parseInt(stat.count),
        percentage: totalRecords > 0 ? ((parseInt(stat.count) / totalRecords) * 100).toFixed(2) : '0'
      }))
    };
  }

  async findOneById(recordId: number) {
    return this.repo.findOne({
      where: { recordId },
      relations: ['student', 'course']
    });
  }

  async update(recordId: number, data: any) {
    await this.repo.update(recordId, data);
    return this.findOneById(recordId);
  }

  async delete(recordId: number) {
    const record = await this.findOneById(recordId);
    if (!record) return null;
    return this.repo.remove(record);
  }

  async findDuplicate(studentId: number, courseId: number, recordDate: string): Promise<Attendance | null> {
    return this.repo.findOne({
      where: {
        studentId,
        courseId,
        recordDate: recordDate as any
      }
    });
  }

  async findBySession(sessionId: string): Promise<Attendance[]> {
    return this.repo.find({
      where: { sessionId },
      relations: ['student', 'course']
    });
  }

  statisticsByStaff(staffId: number) {
    return this.repo
      .createQueryBuilder('attendance')
      .leftJoin('attendance.course', 'course')
      .select('attendance.attendanceStatusId', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('course.instructor.userAccountId = :staffId', { staffId })
      .groupBy('attendance.attendanceStatusId')
      .getRawMany();
  }

  statisticsByStudent(studentId: number) {
    return this.repo
      .createQueryBuilder('attendance')
      .select('attendance.attendanceStatusId', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('attendance.studentId = :studentId', { studentId })
      .groupBy('attendance.attendanceStatusId')
      .getRawMany();
  }
}