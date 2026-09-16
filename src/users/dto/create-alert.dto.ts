import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateAlertDto {
  @ApiProperty({ example: 'Important Notification', description: 'The title of the alert' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ example: 'System Update', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'info', enum: ['info', 'warning', 'error', 'success'], required: false })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({ example: { key: 'value' }, required: false })
  @IsObject()
  @IsOptional()
  metadata?: any;
}
