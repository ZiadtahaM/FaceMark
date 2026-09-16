import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { UserRepository } from '../../users/repositories/user.repository';
import { UserAccount } from '../../users/entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { Role } from '../../common/enums/role.enum';

/**
 * Service to handle authentication operations like registration, login, and token refresh.
 * It manages user accounts and issues JWT tokens.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Registers a new user account.
   * This method uses a database transaction to ensure atomicity.
   */
  async register(registerDto: RegisterDto) {
    const { username, password, role } = registerDto;

    // A transaction ensures the entire operation succeeds or fails as a unit.
    return await this.dataSource.transaction(async (manager) => {
      // Create a repository instance tied to the current transaction.
      const transactionalRepo = manager.getRepository(UserAccount);

      // Check if username is already taken.
      const existingUser = await transactionalRepo.findOne({
        where: { username },
      });
      
      if (existingUser) {
        if (!existingUser.isDeleted) {
          throw new ConflictException(`Registration Failed: The username '${registerDto.username}' already exists.`);
        }
        
        // Restore soft-deleted user
        const hashedPassword = await bcrypt.hash(password, 10);
        Object.assign(existingUser, {
          password: hashedPassword,
          userType: role || Role.STUDENT,
          isDeleted: false,
        });
        
        const savedUser = await transactionalRepo.save(existingUser);
        const { password: _, ...result } = savedUser;
        return result;
      }

      // Securely hash the password before storage.
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user entity.
      const newUser = transactionalRepo.create({
        username,
        password: hashedPassword,
        userType: role || Role.STUDENT,
      });

      // Persist user to database.
      const savedUser = await transactionalRepo.save(newUser);
      
      // Exclude password field from the final returned object.
      const { password: _, ...result } = savedUser;
      return result;
    });
  }

  /**
   * Authenticates a user with username and password.
   * Returns an access token and user information upon success.
   */
  async login(loginDto: LoginDto) {
    const { username, password, role } = loginDto;
    console.log(`[AUTH DEBUG] Attempting login for: ${username}`);
    
    // Retrieve user by username.
    const user = await this.userRepository.findByUsername(username);

    if (!user) {
      console.log(`[AUTH DEBUG] User not found: ${username}`);
      throw new UnauthorizedException(`Authentication Failed: User account '${username}' does not exist.`);
    }

    // Check if the password matches (using Bcrypt).
    let isMatch = await bcrypt.compare(password, user.password);
    console.log(`[AUTH DEBUG] Bcrypt match: ${isMatch}`);

    // [Migration Fallback] If Bcrypt fails, check if the password was stored as plain-text (old users).
    if (!isMatch && password === user.password) {
      console.log(`[AUTH DEBUG] Plain-text match found! Migrating user...`);
      isMatch = true;
      // Automatically hash the plain-text password for future logins.
      user.password = await bcrypt.hash(password, 10);
      await this.userRepository.save(user);
    }

    if (!isMatch) {
      console.log(`[AUTH DEBUG] Password mismatch for ${username}. Stored: ${user.password.substring(0, 5)}...`);
      throw new UnauthorizedException(`Authentication Failed: Incorrect password for account '${username}'.`);
    }

    // Optional: Verify role if provided in LoginDto
    if (role && user.userType !== role) {
      console.log(`[AUTH DEBUG] Role mismatch for ${username}. Expected: ${role}, Found: ${user.userType}`);
      throw new UnauthorizedException('Invalid role for this user');
    }

    // Construct the JWT payload.
    const payload: JwtPayload = {
      sub: user.userAccountId,
      username: user.username,
      role: user.userType,
    };

    // Return signed token and public user data.
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.userAccountId,
        username: user.username,
        role: user.userType,
      },
    };
  }

  /**
   * Generates a new access token for a valid user.
   * Used for session persistence or refreshing expired tokens.
   */
  async refreshToken(userId: number) {
    // Validate that the user still exists.
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Prepare fresh payload.
    const payload: JwtPayload = {
      sub: user.userAccountId,
      username: user.username,
      role: user.userType,
    };

    // Issue new token.
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({
      where: { userAccountId: userId },
      relations: ['enrollments', 'enrollments.course', 'managedCourses', 'taughtCourses']
    });
    if (!user) throw new UnauthorizedException('User not found');
    
    const { password, ...result } = user;
    const enrolledCourses = (user.enrollments || []).map(e => e.course).filter(Boolean);

    return {
      ...result,
      totalCredits: enrolledCourses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0)
    };
  }
}
