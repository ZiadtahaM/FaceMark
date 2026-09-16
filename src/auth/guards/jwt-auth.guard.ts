import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Global Guard for protecting routes using JWT authentication.
 * Inherits basic behavior from '@nestjs/passport' AuthGuard.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
