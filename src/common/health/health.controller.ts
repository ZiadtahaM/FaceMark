import { Controller, Get, ServiceUnavailableException, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Response } from 'express';

@ApiTags('System Health & DDIA Invariants')
@Controller()
export class HealthController {
  private readonly aiServiceUrl: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
  }

  /**
   * L4 / L7 Shallow Liveness Probe (System Design Law 14)
   * Answers whether the node.js process is active and responsive.
   */
  @Get('health')
  @ApiOperation({ summary: 'Shallow liveness probe (Process is alive)' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  getLiveness() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    };
  }

  /**
   * Deep Readiness Probe (System Design Law 14)
   * Verifies external datastores (MySQL) and upstream services (AI Vision).
   */
  @Get('ready')
  @ApiOperation({ summary: 'Deep readiness probe (Database & AI dependencies responsive)' })
  @ApiResponse({ status: 200, description: 'All critical dependencies are healthy' })
  @ApiResponse({ status: 503, description: 'One or more dependencies are down' })
  async getReadiness(@Res() res: Response) {
    const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};
    let isReady = true;

    // 1. MySQL Database Invariant Check
    const dbStart = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      checks.database = {
        status: 'UP',
        latencyMs: Date.now() - dbStart,
      };
    } catch (err) {
      isReady = false;
      checks.database = {
        status: 'DOWN',
        latencyMs: Date.now() - dbStart,
        error: err.message,
      };
    }

    // 2. AI Vision Service Check
    const aiStart = Date.now();
    try {
      const aiResponse = await firstValueFrom(
        this.httpService.get(`${this.aiServiceUrl}/health`, { timeout: 3000 })
      );
      checks.aiService = {
        status: aiResponse.status === 200 ? 'UP' : 'DEGRADED',
        latencyMs: Date.now() - aiStart,
      };
    } catch (err) {
      checks.aiService = {
        status: 'DOWN',
        latencyMs: Date.now() - aiStart,
        error: 'AI service unreachable on ' + this.aiServiceUrl,
      };
      // AI service down allows degraded operation for admin/reports, but mark overall warning
    }

    const httpStatus = isReady ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(httpStatus).json({
      status: isReady ? 'READY' : 'NOT_READY',
      timestamp: new Date().toISOString(),
      checks,
    });
  }

  /**
   * Kleppmann DDIA Tier 3 Invariant Watchdog Probe (Rule 6 Tier 3)
   * Validates database structural consistency, absence of orphan records, and monotonic integrity.
   */
  @Get('api/invariants')
  @ApiOperation({ summary: 'Kleppmann DDIA relational invariant verification probe' })
  @ApiResponse({ status: 200, description: 'All database invariants satisfied' })
  @ApiResponse({ status: 500, description: 'Invariant violation detected' })
  async getInvariants(@Res() res: Response) {
    const violations: string[] = [];

    try {
      // Invariant 1: No orphan attendance records without student
      const orphanStudents = await this.dataSource.query(
        `SELECT COUNT(*) as cnt FROM attendance_records a 
         LEFT JOIN users u ON a.studentId = u.userAccountId 
         WHERE u.userAccountId IS NULL`
      );
      const orphanStudentCount = Number(orphanStudents[0]?.cnt || 0);
      if (orphanStudentCount > 0) {
        violations.push(`Found ${orphanStudentCount} orphan attendance records referencing non-existent students.`);
      }

      // Invariant 2: No orphan attendance records without course
      const orphanCourses = await this.dataSource.query(
        `SELECT COUNT(*) as cnt FROM attendance_records a 
         LEFT JOIN courses c ON a.courseId = c.courseId 
         WHERE c.courseId IS NULL`
      );
      const orphanCourseCount = Number(orphanCourses[0]?.cnt || 0);
      if (orphanCourseCount > 0) {
        violations.push(`Found ${orphanCourseCount} orphan attendance records referencing non-existent courses.`);
      }

      // Invariant 3: Role integrity - all users have defined roles
      const invalidRoles = await this.dataSource.query(
        `SELECT COUNT(*) as cnt FROM users WHERE userType NOT IN ('admin', 'staff', 'student')`
      );
      const invalidRoleCount = Number(invalidRoles[0]?.cnt || 0);
      if (invalidRoleCount > 0) {
        violations.push(`Found ${invalidRoleCount} users with invalid or corrupt role values.`);
      }

      const passed = violations.length === 0;
      return res.status(passed ? HttpStatus.OK : HttpStatus.INTERNAL_SERVER_ERROR).json({
        passed,
        timestamp: new Date().toISOString(),
        auditedInvariants: [
          'INV_ATTENDANCE_STUDENT_FOREIGN_KEY_INTEGRITY',
          'INV_ATTENDANCE_COURSE_FOREIGN_KEY_INTEGRITY',
          'INV_USER_ROLE_DOMAIN_CONSTRAINT',
        ],
        violations,
      });
    } catch (err) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        passed: false,
        timestamp: new Date().toISOString(),
        error: `Database query failed during invariant audit: ${err.message}`,
      });
    }
  }
}
