import { IsInt, IsString, IsArray, ValidateNested, IsOptional, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

class IndividualAttendanceDto {
  @IsNotEmpty({ message: 'Individual studentId is required' })
  studentId: string;

  @IsNotEmpty({ message: 'Individual status is required' })
  @IsString({ message: 'status must be a string' })
  status: string; // Present, Absent, Late

  @IsOptional()
  @IsString({ message: 'time must be a string' })
  time?: string;
}

export class BulkAttendanceDto {
  @IsNotEmpty({ message: 'courseId is required' })
  courseId: string;

  @IsNotEmpty({ message: 'section is required' })
  section: string;

  @IsNotEmpty({ message: 'date is required' })
  date: string;

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsString()
  sessionType?: string;

  @IsArray({ message: 'attendance must be an array' })
  @ValidateNested({ each: true })
  @Type(() => IndividualAttendanceDto)
  attendance: IndividualAttendanceDto[];
}
