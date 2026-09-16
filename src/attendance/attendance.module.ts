import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from './entities/attendance.entity';
import { AttendanceController } from './controller/attendance.controller';
import { AttendanceService } from './services/attendance.service';
import { AttendanceRepository } from './repository/attendance.repository';
import { UsersModule } from '../users/users.module';
import { CoursesModule } from '../courses/courses.module';

import { StudentController } from './controller/student.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attendance]),
    forwardRef(() => UsersModule),
    forwardRef(() => CoursesModule),
  ],
  controllers: [AttendanceController, StudentController],
  providers: [AttendanceService, AttendanceRepository],
  exports: [AttendanceService, AttendanceRepository],
})
export class AttendanceModule {}