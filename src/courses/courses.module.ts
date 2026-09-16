import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './entities/course.entity';
import { CourseEnrollment } from './entities/course-enrollment.entity';
import { CourseRepository } from './repositories/course.repository';
import { CoursesService } from './services/courses.service';
import { CoursesController } from './controllers/courses.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, CourseEnrollment]),
    forwardRef(() => UsersModule),
  ],
  controllers: [CoursesController],
  providers: [CourseRepository, CoursesService],
  exports: [CourseRepository, CoursesService],
})
export class CoursesModule {}
