import { Controller, Post, Body, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

/**
 * Controller to handle all authentication-related requests.
 * Defines endpoints for registration, login, profile management, and role-based access testing.
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint for new user registration.
   */
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully created' })
  @ApiResponse({ status: 409, description: 'Username already exists' })
  async register(@Body() registerDto: RegisterDto) {
    // Process user registration request through the AuthService.
    return this.authService.register(registerDto);
  }

  /**
   * Endpoint for user login to obtain a JWT token.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and get JWT token' })
  @ApiResponse({ status: 200, description: 'Successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    // Handle login request by validating credentials.
    return this.authService.login(loginDto);
  }

  /**
   * Retrieves the profile of the currently logged-in user.
   * Requires a valid Bearer token.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: any) {
    // Extract user information and fetch full relational profile.
    return this.authService.getProfile(user.sub || user.userId);
  }

  /**
   * Refreshes the JWT token for an active user session.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh JWT token' })
  async refresh(@CurrentUser() user: any) {
    // Generate a fresh token for the authenticated user.
    return this.authService.refreshToken(user.userId);
  }

  /**
   * Restricted endpoint for testing Admin-level Role-Based Access Control (RBAC).
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Get('admin-only')
  @ApiOperation({ summary: 'Test endpoint for Admin role only' })
  async adminOnly() {
    // Responds only if the user has the Admin role.
    return { message: 'You have admin access' };
  }
}
