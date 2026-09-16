import { Controller, Post, Body, Get, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { VisionService } from './vision.service';
import { BulkProcessUploadDto } from './dto/bulk-process-upload.dto';
import { ProcessFrameDto } from './dto/process-frame.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserAccount } from '../users/entities/user.entity';

@ApiTags('Vision AI')
@ApiBearerAuth('JWT-auth')
@Controller('vision')
export class VisionController {
  constructor(private readonly visionService: VisionService) {}

  /**
   * Model 1: Bulk register student face embeddings
   * Supports multiple students, each with multiple images
   */
  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ 
    summary: 'Model 1: Bulk register student face embeddings',
    description: 'Upload multiple students, each with an array of images, to create robust face embeddings'
  })
  @ApiResponse({ status: 200, description: 'Face embeddings registered successfully' })
  async upload(@Body() dto: BulkProcessUploadDto, @CurrentUser() user: UserAccount) {
    console.log(`[Vision] User ${user.username} bulk uploading ${dto.students?.length || 0} students`);
    return this.visionService.registerMultipleStudents(dto);
  }

  /**
   * Model 2: Process camera frame for recognition and automated attendance
   */
  @Post('recognize')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ 
    summary: 'Model 2: Process camera frame for recognition and automated attendance',
    description: 'Captures a single frame, detects face, matches with registered students, and automatically marks attendance'
  })
  @ApiResponse({ status: 200, description: 'Face processed successfully' })
  @ApiResponse({ status: 503, description: 'AI service not available' })
  async recognize(@Body() dto: ProcessFrameDto, @CurrentUser() user: UserAccount) {
    console.log(`[Vision] User ${user.username} processing recognition for course ${dto.courseId}`);
    return this.visionService.processAttendanceFrame(dto);
  }

  /**
   * Check AI service health
   */
  @Get('health')
  @ApiOperation({ summary: 'Check AI service health status' })
  async checkHealth() {
    return this.visionService.checkHealth();
  }

  /**
   * Check if student has embedding
   */
  @Get('embeddings/:studentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Check if student has face embedding' })
  async getEmbedding(@Param('studentId') studentId: string) {
    return this.visionService.getEmbeddingStatus(studentId);
  }

  /**
   * Delete student embedding
   */
  @Delete('embeddings/:studentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Delete student face embedding' })
  async deleteEmbedding(@Param('studentId') studentId: string) {
    return this.visionService.deleteEmbedding(studentId);
  }
}
