import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class BatchAlertDto {
  @ApiProperty({ example: [1, 2, 3], description: 'List of user account IDs' })
  @IsArray()
  @IsInt({ each: true })
  @IsNotEmpty()
  userIds: number[];

  @ApiProperty({ example: 'Important update for all students', description: 'The alert message content' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ example: 'System Notification', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'info', enum: ['info', 'warning', 'error', 'success'], required: false })
  @IsString()
  @IsOptional()
  type?: string;
}
