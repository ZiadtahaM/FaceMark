import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { AttendanceModule } from './attendance/attendance.module';
import { VisionModule } from './vision/vision.module';
import { UserAccount } from './users/entities/user.entity';
import { Alert } from './users/entities/alert.entity';
import { Course } from './courses/entities/course.entity';
import { CourseEnrollment } from './courses/entities/course-enrollment.entity';
import { Attendance } from './attendance/entities/attendance.entity';
import { validate } from './common/config/env.validation';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const syncValue = configService.get('DB_SYNCHRONIZE');
        const isSync = syncValue === 'true' || syncValue === true;
        console.log(`[Database] Connection Status: Initializing...`);
        console.log(`[Database] Synchronize: ${isSync}`);
        
        return {
          type: 'mysql',
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT', 3306),
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),
          entities: [UserAccount, Course, CourseEnrollment, Attendance, Alert],
          synchronize: isSync,
          logging: ['error', 'warn'],
          connectorPackage: 'mysql2',
        };
      },
    }),
    AuthModule,
    UsersModule,
    CoursesModule,
    AttendanceModule,
    VisionModule,
  ],
})
export class AppModule {}
