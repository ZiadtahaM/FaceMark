import { IsString, IsNotEmpty, IsArray, IsOptional, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class StudentUploadItemDto {
  @ApiProperty({ 
    description: 'Array of Base64 encoded image strings for this student', 
    type: [String],
    example: ['data:image/jpeg;base64,/9j/4AAQ...']
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
}

export class ProcessUploadDto extends StudentUploadItemDto {
  @ApiProperty({ example: 0.6, description: 'Minimum confidence threshold', required: false, default: 0.6 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number;
}

export class BulkProcessUploadDto {
  @ApiProperty({ 
    description: 'Array of student upload items', 
    type: [StudentUploadItemDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentUploadItemDto)
  students: StudentUploadItemDto[];

  @ApiProperty({ example: 0.6, description: 'Minimum confidence threshold', required: false, default: 0.6 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number;
}
