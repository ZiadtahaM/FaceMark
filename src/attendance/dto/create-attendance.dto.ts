import { IsInt, IsDateString, IsString, IsNotEmpty, IsOptional, Min, IsIn, IsNumber, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAttendanceDto {
  @ApiProperty({ example: 1, description: 'Student ID' })
  @IsInt({ message: 'studentId must be an integer' })
  @IsNotEmpty({ message: 'studentId is required' })
  @Min(1)
  studentId: number;

  @ApiProperty({ example: 1, description: 'Course ID' })
  @IsInt({ message: 'courseId must be an integer' })
  @IsNotEmpty({ message: 'courseId is required' })
  @Min(1)
  courseId: number;

  @ApiProperty({ example: 2, description: 'Staff/Admin ID' })
  @IsInt({ message: 'staffId must be an integer' })
  @IsNotEmpty({ message: 'staffId is required' })
  @Min(1)
  staffId: number;

  @ApiProperty({ example: 1, description: '1=Present, 2=Absent, 3=Late, 4=Excused' })
  @IsInt({ message: 'attendanceStatusId must be an integer' })
  @IsNotEmpty({ message: 'attendanceStatusId is required' })
  @IsIn([1, 2, 3, 4])
  attendanceStatusId: number;

  @ApiProperty({ example: '2024-01-15', description: 'Date of attendance' })
  @IsDateString({}, { message: 'recordDate must be a valid ISO date string' })
  @IsNotEmpty({ message: 'recordDate is required' })
  recordDate: string;

  @ApiProperty({ required: false, example: '1A', description: 'Session number (accepts strings)' })
  @IsOptional()
  @IsString({ message: 'sessionNumber must be a string' })
  sessionNumber: string;

  @ApiProperty({ required: false, example: 'A', description: 'Lecture number (A, B, C, D)' })
  @IsOptional()
  @IsString({ message: 'lectureNumber must be a string' })
  @IsIn(['A', 'B', 'C', 'D'], { message: 'lectureNumber must be A, B, C, or D' })
  lectureNumber: string;

  @ApiProperty({ example: 'R3', description: 'Room name/number' })
  @IsString({ message: 'room must be a string' })
  @IsNotEmpty({ message: 'room is required' })
  room: string;

  @ApiProperty({ example: 'LECTURE', enum: ['LECTURE', 'SECTION'] })
  @IsString({ message: 'sessionType must be a string' })
  @IsNotEmpty({ message: 'sessionType is required' })
  @IsIn(['LECTURE', 'SECTION'])
  sessionType: string;

  @ApiProperty({ required: false, example: 0.95, description: 'Face recognition confidence' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  faceConfidence?: number;

  @ApiProperty({ required: false, example: true, description: 'Whether the face was detected' })
  @IsOptional()
  detected?: boolean;

  @ApiProperty({ required: false, example: 0.98, description: 'AI Accuracy' })
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @ApiProperty({ required: false, example: 150.5, description: 'Processing time in ms' })
  @IsOptional()
  @IsNumber()
  processingTime?: number;

  @ApiProperty({ required: false, example: 0.92, description: 'Recognition Rate' })
  @IsOptional()
  @IsNumber()
  recognitionRate?: number;

  @ApiProperty({ required: false, example: '09:30:00', description: 'Check-in time' })
  @IsOptional()
  @IsString()
  checkInTime?: string;
}