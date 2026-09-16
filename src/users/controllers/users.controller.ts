import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { UserAccount } from '../entities/user.entity';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users (Admin only)' })
  @ApiQuery({ name: 'role', required: false, enum: Role })
  @ApiResponse({ status: 200, type: [UserAccount] })
  async findAll(@Query('role') role?: Role) {
    return this.usersService.findAll(role);
  }

  /**
   * NOTE: If you receive a 400 error with "Validation failed (numeric string is expected)", 
   * ensure you are passing a numeric ID in the URL (e.g. /5) and not a literal placeholder like /{5}.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get user details by ID (Admin only)' })
  @ApiResponse({ status: 200, type: UserAccount })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Get('username/:username')
  @ApiOperation({ summary: 'Get user details by Username (Admin only)' })
  @ApiResponse({ status: 200, type: UserAccount })
  async findOneByUsername(@Param('username') username: string) {
    return this.usersService.findOneByUsername(username);
  }

  @Post()
  @ApiOperation({ summary: 'Create new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User created', type: UserAccount })
  async create(@Body() userData: Partial<UserAccount>) {
    return this.usersService.create(userData);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user by ID (Admin only)' })
  @ApiResponse({ status: 200, type: UserAccount })
  async update(@Param('id', ParseIntPipe) id: number, @Body() userData: Partial<UserAccount>) {
    return this.usersService.update(id, userData);
  }

  @Put('username/:username')
  @ApiOperation({ summary: 'Update user by Username (Admin only)' })
  @ApiResponse({ status: 200, type: UserAccount })
  async updateByUsername(@Param('username') username: string, @Body() userData: Partial<UserAccount>) {
    return this.usersService.updateByUsername(username, userData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user by ID (Admin only). Use ?hard=true for permanent delete.' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  async remove(@Param('id', ParseIntPipe) id: number, @Query('hard') hard?: string) {
    const isHard = hard === 'true';
    await this.usersService.remove(id, isHard);
    return { message: `User ${id} deleted successfully`, type: isHard ? 'hard' : 'soft' };
  }

  @Delete('username/:username')
  @ApiOperation({ summary: 'Delete user by username (Admin only). Use ?hard=true for permanent delete.' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  async removeByUsername(@Param('username') username: string, @Query('hard') hard?: string) {
    const isHard = hard === 'true';
    await this.usersService.removeByUsername(username, isHard);
    return { message: `User ${username} deleted successfully`, type: isHard ? 'hard' : 'soft' };
  }
}
