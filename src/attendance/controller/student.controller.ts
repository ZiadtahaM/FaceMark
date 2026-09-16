import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserAccount } from '../../users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { AttendanceService } from '../services/attendance.service';

@ApiTags('Student')
@ApiBearerAuth('JWT-auth')
@Controller('student')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('charts')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get student attendance diagram and charts' })
  async getCharts(@CurrentUser() user: UserAccount) {
    return this.attendanceService.getStudentDiagram(user.userAccountId);
  }

  @Get('alerts')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get student attendance alerts' })
  async getAlerts(@CurrentUser() user: UserAccount) {
    // Logic for alerts based on attendance < 75%
    const diagram = await this.attendanceService.getStudentDiagram(user.userAccountId);
    return diagram.courses
      .filter(c => c.attendanceRate < 75)
      .map(c => ({
        id: Math.random(),
        courseName: c.courseName,
        message: `Your attendance in ${c.courseName} is critically low.`,
        type: 'danger'
      }));
  }
}
