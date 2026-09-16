import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRepository } from '../../users/repositories/user.repository';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Role } from '../../common/enums/role.enum';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let jwtService: any;
  let dataSource: any;
  let queryRunner: any;

  beforeEach(async () => {
    userRepository = {
      findByUsername: jest.fn(),
      findById: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn(),
    };

    queryRunner = {
      manager: {
        getRepository: jest.fn().mockReturnValue({
          findOne: jest.fn(),
          create: jest.fn(),
          save: jest.fn(),
        }),
      },
    };

    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => cb(queryRunner.manager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: userRepository },
        { provide: JwtService, useValue: jwtService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw ConflictException if user already exists', async () => {
      const transactionalRepo = queryRunner.manager.getRepository();
      transactionalRepo.findOne.mockResolvedValue({ username: 'existing' });
      const registerDto = { username: 'existing', password: 'password123', role: Role.STUDENT };
      
      await expect(service.register(registerDto as any)).rejects.toThrow(ConflictException);
    });

    it('should register a new user successfully', async () => {
      const transactionalRepo = queryRunner.manager.getRepository();
      transactionalRepo.findOne.mockResolvedValue(null);
      transactionalRepo.create.mockReturnValue({ username: 'new', password: 'hashed_password', userType: Role.STUDENT });
      transactionalRepo.save.mockResolvedValue({ userAccountId: 1, username: 'new', password: 'hashed_password', userType: Role.STUDENT });
      
      const registerDto = { username: 'new', password: 'password123', role: Role.STUDENT };
      const result: any = await service.register(registerDto as any);
      
      expect(result).toBeDefined();
      expect(result.username).toBe('new');
      expect(result.password).toBeUndefined(); // Password should be hidden
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException for invalid credentials', async () => {
      userRepository.findByUsername.mockResolvedValue(null);
      const loginDto = { username: 'wrong', password: 'wrong_password' };
      
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should return access token on successful login', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = { userAccountId: 1, username: 'user', password: hashedPassword, userType: Role.STUDENT };
      userRepository.findByUsername.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValue('mock_token');
      
      const loginDto = { username: 'user', password: 'password123' };
      const result = await service.login(loginDto);
      
      expect(result.access_token).toBe('mock_token');
      expect(result.user.username).toBe('user');
    });

    it('should throw UnauthorizedException if role does not match', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = { userAccountId: 1, username: 'user', password: hashedPassword, userType: Role.STUDENT };
      userRepository.findByUsername.mockResolvedValue(mockUser);
      
      const loginDto = { username: 'user', password: 'password123', role: Role.ADMIN };
      
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
