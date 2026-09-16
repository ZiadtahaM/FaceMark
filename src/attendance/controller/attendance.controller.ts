import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  ForbiddenException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';

import { AttendanceService } from '../services/attendance.service';
import { CreateAttendanceDto } from '../dto/create-attendance.dto';
import { UpdateAttendanceDto } from '../dto/update-attendance.dto';
import { BulkAttendanceDto } from '../dto/bulk-attendance.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserAccount } from '../../users/entities/user.entity';

import { Role } from '../../common/enums/role.enum';

@ApiTags('Attendance')
@ApiBearerAuth('JWT-auth')
@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {

  constructor(private service: AttendanceService) {}

  @Get()
  @ApiOperation({ summary: 'List attendance records with pagination and filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'courseId', required: false })
  @ApiQuery({ name: 'session', required: false })
  @ApiQuery({ name: 'date', required: false })
  async findAll(
    @CurrentUser() user: UserAccount,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('courseId', new ParseIntPipe({ optional: true })) courseId?: number,
    @Query('session') session?: string,
    @Query('date') date?: string,
  ) {
    if (page > 0 && limit > 0) {
      return this.service.findAllPaginated(page, limit, { courseId, session, date }, user);
    }
    return this.service.findAll(user, { courseId, session, date });
  }

  @Get('my')
  @Roles(Role.STUDENT)
  @ApiOperation({ 
    summary: 'Get my attendance (Student only)', 
    description: 'Retrieve your full attendance history sorted by date. Optionally filter by courseId.' 
  })
  @ApiQuery({ name: 'courseId', required: false, description: 'Optional: Filter records for a specific course' })
  async getMyAttendance(
    @CurrentUser() user: UserAccount,
    @Query('courseId', new DefaultValuePipe(undefined)) courseId?: number,
  ) {
    return this.service.getStudentAttendance(user.userAccountId, courseId);
  }

  /**
   * NOTE: If you receive a 400 error with "Validation failed (numeric string is expected)", 
   * ensure you are passing a numeric ID in the URL (e.g. /5) and not a literal placeholder like /{5}.
   */
  @Get('course/:courseId')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get attendance by course' })
  @ApiQuery({ name: 'session', required: false })
  @ApiQuery({ name: 'date', required: false })
  async getByCourse(
    @CurrentUser() user: UserAccount,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Query('session') session?: string,
    @Query('date') date?: string,
  ) {
    if (user.userType === Role.STAFF) {
      const isAuthorized = await this.service.isStaffAuthorizedForCourse(user.userAccountId, courseId);
      if (!isAuthorized) {
        throw new ForbiddenException(`Access Denied: You are not authorized to view attendance records for course ID ${courseId}. Only the course instructor or admins have access.`);
      }
    }
    return this.service.getCourseAttendance(courseId, session, date);
  }

  @Get('student/:studentId')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get attendance for specific student' })
  @ApiQuery({ name: 'courseId', required: false })
  async getStudentAttendanceById(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('courseId', new DefaultValuePipe(undefined)) courseId?: number
  ) {
    return this.service.getStudentAttendance(studentId, courseId);
  }

  @Get('track/:studentId')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get intelligent tracking and risk analysis for a student' })
  @ApiQuery({ name: 'courseId', required: true })
  async trackStudent(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('courseId', ParseIntPipe) courseId: number
  ) {
    return this.service.getStudentTracking(studentId, courseId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ 
    summary: 'Create/Bulk-save attendance record',
    description: 'Accepts either a single CreateAttendanceDto or a BulkAttendanceDto (if it contains an "attendance" array).'
  })
  @ApiBody({ schema: { oneOf: [{ $ref: '#/components/schemas/CreateAttendanceDto' }, { $ref: '#/components/schemas/BulkAttendanceDto' }] } })
  create(@Body() dto: CreateAttendanceDto | BulkAttendanceDto, @CurrentUser() user: UserAccount) {
    // Determine if it is a bulk save operation by checking for the presence of the 'attendance' array
    if ('attendance' in dto && Array.isArray(dto.attendance)) {
      return this.service.saveBulk(dto as BulkAttendanceDto, user);
    }
    return this.service.create(dto as CreateAttendanceDto, user);
  }

  @Put(':recordId')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Update attendance record' })
  async update(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Body() dto: UpdateAttendanceDto,
    @CurrentUser() user: UserAccount,
  ) {
    return this.service.update(recordId, dto, user.userAccountId, user.userType);
  }

  @Delete(':recordId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete attendance record (Admin only)' })
  async delete(
    @Param('recordId', ParseIntPipe) recordId: number,
    @CurrentUser() user: UserAccount,
  ) {
    return this.service.delete(recordId, user.userType);
  }

  @Get('statistics')
  @Roles(Role.ADMIN, Role.STAFF, Role.STUDENT)
  @ApiOperation({ summary: 'Get attendance statistics' })
  @ApiQuery({ name: 'courseId', required: false })
  statistics(
    @CurrentUser() user: UserAccount,
    @Query('courseId', new DefaultValuePipe(undefined)) courseId?: number,
  ) {
    return this.service.statistics(user, courseId);
  }

  @Get('report-data')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get detailed attendance data for reports' })
  @ApiQuery({ name: 'courseId', required: false })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getReportData(
    @CurrentUser() user: UserAccount,
    @Query('courseId') courseIdStr?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const courseId = courseIdStr && courseIdStr !== 'all' ? parseInt(courseIdStr) : null;
    return this.service.getReportData(user, courseId, fromDate, toDate);
  }
}