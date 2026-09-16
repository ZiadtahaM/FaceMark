import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class EnrollStudentDto {
  @ApiProperty({ example: 1, description: 'The unique identifier of the student' })
  @IsInt()
  @IsNotEmpty()
  studentId: number;

  @ApiProperty({ example: 'S1', description: 'The section identifier (e.g., S1, S2)', required: false })
  @IsString()
  @IsOptional()
  section?: string;

  @ApiProperty({ example: 'L1', description: 'The lecture/group identifier (e.g., L1, L2)', required: false })
  @IsString()
  @IsOptional()
  lecture?: string;
}
