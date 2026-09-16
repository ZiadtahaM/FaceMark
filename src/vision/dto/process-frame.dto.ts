import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProcessFrameDto {
  @ApiProperty({ 
    description: 'Base64 encoded frame from camera', 
    example: 'data:image/jpeg;base64,/9j/4AAQ...' 
  })
  @IsString()
  @IsNotEmpty()
  imageBase64: string;

  @ApiProperty({ 
    example: 'S1', 
    description: 'The section ID' 
  })
  @IsString()
  @IsNotEmpty()
  sectionId: string;

  @ApiProperty({ 
    example: 'sess_123', 
    description: 'The session ID' 
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ 
    example: 1, 
    description: 'The course ID' 
  })
  @IsNumber()
  @IsNotEmpty()
  courseId: number;

  @ApiProperty({ 
    example: 'LECTURE', 
    description: 'The session type (LECTURE or SECTION)',
    enum: ['LECTURE', 'SECTION']
  })
  @IsString()
  @IsNotEmpty()
  sessionType: string;

  @ApiProperty({ 
    example: '1', 
    description: 'The lecture or section number' 
  })
  @IsString()
  @IsNotEmpty()
  sessionNumber: string;

  @ApiProperty({ 
    example: 'Room 301', 
    description: 'The room location',
    required: false 
  })
  @IsString()
  @IsOptional()
  room?: string;

  @ApiProperty({ 
    example: 0.7, 
    description: 'Minimum confidence threshold for recognition (0-1)',
    required: false, 
    default: 0.7 
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number;

  @ApiProperty({ 
    example: 150, 
    description: 'Processing time in milliseconds (populated by server)',
    required: false 
  })
  @IsNumber()
  @IsOptional()
  processingTimeMs?: number;
}