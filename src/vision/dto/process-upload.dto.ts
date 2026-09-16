import { IsString, IsNotEmpty, IsArray, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProcessUploadDto {
  @ApiProperty({ 
    description: 'Array of Base64 encoded image strings for multiple angle registration', 
    type: [String],
    example: ['data:image/jpeg;base64,/9j/4AAQ...', 'data:image/jpeg;base64,/9j/4AAQ...']
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  imagesBase64: string[];

  @ApiProperty({ example: '12345', description: 'The unique student ID' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ example: 'Ziad Ahmed', description: 'The name of the student' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'S1', description: 'The section ID', required: false })
  @IsString()
  @IsOptional()
  sectionId?: string;

  @ApiProperty({ example: 0.6, description: 'Minimum confidence threshold for face detection', required: false, default: 0.6 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number;
}