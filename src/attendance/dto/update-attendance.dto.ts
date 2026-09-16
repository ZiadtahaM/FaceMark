import { IsInt, IsDateString, IsOptional, IsIn, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAttendanceDto {

  @ApiProperty({ required: false, example: 1, description: '1=Present, 2=Absent, 3=Late, 4=Excused' })
  @IsOptional()
  @IsInt()
  @IsIn([1, 2, 3, 4])
  attendanceStatusId?: number;

  @ApiProperty({ required: false, example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  recordDate?: string;

  @ApiProperty({ required: false, example: '1A' })
  @IsOptional()
  @IsString()
  sessionNumber?: string;

  @ApiProperty({ required: false, example: 'A' })
  @IsOptional()
  @IsString()
  @IsIn(['A', 'B', 'C', 'D'])
  lectureNumber?: string;

  @ApiProperty({ required: false, example: 'LECTURE', enum: ['LECTURE', 'SECTION'] })
  @IsOptional()
  @IsString()
  @IsIn(['LECTURE', 'SECTION'])
  sessionType?: string;

  @ApiProperty({ required: false, example: 'R3' })
  @IsOptional()
  @IsString()
  room?: string;

  @ApiProperty({ required: false, example: 0.95 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  faceConfidence?: number;

  @ApiProperty({ required: false, example: '09:30:00' })
  @IsOptional()
  @IsString()
  checkInTime?: string;
}
