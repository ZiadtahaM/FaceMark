import { IsString, IsNumber, Min, Max, IsEnum, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum MatchStatus {
  MATCH = 'MATCH',
  NO_MATCH = 'NO_MATCH',
  NO_FACE_DETECTED = 'NO_FACE_DETECTED',
  MULTIPLE_FACES = 'MULTIPLE_FACES'
}

export interface FaceEmbedding {
  embedding: number[];
  imageIndex: number;
  confidence: number;
}

export class FaceEmbeddingDto {
  @ApiProperty({ description: 'Face embedding vector', type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  embedding: number[];

  @ApiProperty({ description: 'Index of the image in the batch', example: 0 })
  @IsNumber()
  imageIndex: number;

  @ApiProperty({ description: 'Confidence score for this face detection', example: 0.95 })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;
}

export class Model1ResponseDto {
  @ApiProperty({ description: 'Student ID', example: '12345' })
  @IsString()
  studentId: string;

  @ApiProperty({ description: 'Student name', example: 'Ziad Ahmed' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Aggregated face embedding as JSON string', required: false })
  @IsOptional()
  @IsString()
  embedding?: string;

  @ApiProperty({ description: 'Individual face embeddings from each image', type: [FaceEmbeddingDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FaceEmbeddingDto)
  embeddings?: FaceEmbeddingDto[];

  @ApiProperty({ description: 'Number of images successfully processed', example: 5 })
  @IsNumber()
  imagesProcessed: number;

  @ApiProperty({ description: 'Number of faces detected across all images', example: 5 })
  @IsNumber()
  facesDetected: number;

  @ApiProperty({ description: 'Date when the embedding was created', example: '2024-05-09T10:00:00.000Z' })
  @IsString()
  dateCreated: string;

  @ApiProperty({ description: 'Version of the AI model used', example: 'v1.0' })
  @IsString()
  versionOfModel: string;

  @ApiProperty({ description: 'Status of the operation', example: 'success' })
  @IsString()
  status: string;

  @ApiProperty({ description: 'Additional message', required: false })
  @IsOptional()
  @IsString()
  message?: string;
}

export class Model2ResponseDto {
  @ApiProperty({ description: 'Student ID of the matched student', example: '12345', required: false })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiProperty({ description: 'Name of the matched student', example: 'Ziad Ahmed', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Face embedding of the matched student', required: false })
  @IsOptional()
  @IsString()
  embedding?: string;

  @ApiProperty({ description: 'Match score between 0 and 1', example: 0.98 })
  @IsNumber()
  @Min(0)
  @Max(1)
  match: number;

  @ApiProperty({ description: 'Confidence score of the recognition', example: 0.98 })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore: number;

  @ApiProperty({ description: 'Version of the AI model used', example: 'v1.0' })
  @IsString()
  versionOfModel: string;

  @ApiProperty({ description: 'Match status', enum: MatchStatus, example: MatchStatus.MATCH })
  @IsEnum(MatchStatus)
  matchStatus: MatchStatus;

  @ApiProperty({ description: 'Status of the operation', example: 'success' })
  @IsString()
  status: string;

  @ApiProperty({ description: 'Processing time in milliseconds', example: 150, required: false })
  @IsOptional()
  @IsNumber()
  processingTimeMs?: number;
}

export class AiRecognitionResultDto extends Model2ResponseDto {}

export class BatchUploadResultDto {
  @ApiProperty({ description: 'Student ID', example: '12345' })
  @IsString()
  studentId: string;

  @ApiProperty({ description: 'Student name', example: 'Ziad Ahmed' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Total number of images uploaded', example: 5 })
  @IsNumber()
  totalImages: number;

  @ApiProperty({ description: 'Number of images successfully processed', example: 4 })
  @IsNumber()
  successfulImages: number;

  @ApiProperty({ description: 'Number of images that failed processing', example: 1 })
  @IsNumber()
  failedImages: number;

  @ApiProperty({ description: 'Indices of images that failed', example: [2], type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  failedIndices: number[];

  @ApiProperty({ description: 'Status of the batch operation', example: 'SUCCESS' })
  @IsString()
  status: string;

  @ApiProperty({ description: 'Aggregated face embedding', required: false })
  @IsOptional()
  @IsString()
  embedding?: string;

  @ApiProperty({ description: 'Additional message', required: false })
  @IsOptional()
  @IsString()
  message?: string;
}

export class RecognitionResponseDto {
  @ApiProperty({ description: 'Status of the recognition', example: 'RECORDED' })
  @IsString()
  status: string;

  @ApiProperty({ description: 'Response message', example: 'Attendance marked successfully' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Student information', required: false })
  @IsOptional()
  student?: {
    id: string;
    name: string;
    match: number;
    confidence: number;
  };

  @ApiProperty({ description: 'Session information', required: false })
  @IsOptional()
  session?: {
    courseId: number;
    type: string;
    number: string;
    room: string;
  };

  @ApiProperty({ description: 'AI model information', required: false })
  @IsOptional()
  aiModel?: {
    version: string;
    matchStatus: MatchStatus;
  };

  @ApiProperty({ description: 'Processing time in milliseconds', required: false })
  @IsOptional()
  @IsNumber()
  processingTimeMs?: number;

  @ApiProperty({ description: 'Match status', enum: MatchStatus, required: false })
  @IsOptional()
  @IsEnum(MatchStatus)
  matchStatus?: MatchStatus;

  @ApiProperty({ description: 'Confidence score', required: false })
  @IsOptional()
  @IsNumber()
  confidence?: number;

  @ApiProperty({ description: 'Attendance record', required: false })
  @IsOptional()
  record?: any;
}