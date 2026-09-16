import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UserRepository } from '../repositories/user.repository';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';
import * as bcrypt from 'bcryptjs';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: any;

  beforeEach(async () => {
    userRepository = {
      findByUsernameAll: jest.fn(),
      findByUsername: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UserRepository, useValue: userRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    it('should restore a deleted user if username exists', async () => {
      const userData = { username: 'deleted_user', password: 'password123', role: Role.STUDENT };
      const deletedUser = { userAccountId: 1, username: 'deleted_user', isDeleted: true };
      
      userRepository.findByUsernameAll.mockResolvedValue(deletedUser);
      userRepository.save.mockImplementation(u => Promise.resolve(u));

      const result = await service.create(userData);

      expect(userRepository.findByUsernameAll).toHaveBeenCalledWith('deleted_user');
      expect(deletedUser.isDeleted).toBe(false);
      expect(userRepository.save).toHaveBeenCalledWith(deletedUser);
    });

    it('should throw ConflictException if user exists and not deleted', async () => {
      const userData = { username: 'active_user' };
      const activeUser = { username: 'active_user', isDeleted: false };
      userRepository.findByUsernameAll.mockResolvedValue(activeUser);

      await expect(service.create(userData)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft delete and rename username', async () => {
      const user = { userAccountId: 1, username: 'user1', isDeleted: false };
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockImplementation(u => Promise.resolve(u));

      await service.remove(1);

      expect(user.isDeleted).toBe(true);
      expect(user.username).toMatch(/user1_deleted_\d+/);
      expect(userRepository.save).toHaveBeenCalledWith(user);
    });

    it('should hard delete if isHard is true', async () => {
      const user = { userAccountId: 1, username: 'user1', isDeleted: false };
      userRepository.findOne.mockResolvedValue(user);

      await service.remove(1, true);

      expect(userRepository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should rename conflicting deleted user when updating username', async () => {
      const userToUpdate = { userAccountId: 1, username: 'old', isDeleted: false };
      const conflictingDeletedUser = { userAccountId: 2, username: 'new', isDeleted: true };
      
      userRepository.findById.mockResolvedValue(userToUpdate);
      userRepository.findByUsernameAll.mockResolvedValue(conflictingDeletedUser);
      userRepository.save.mockImplementation(u => Promise.resolve(u));

      await service.update(1, { username: 'new' });

      expect(conflictingDeletedUser.username).toMatch(/new_deleted_\d+/);
      expect(userToUpdate.username).toBe('new');
      expect(userRepository.save).toHaveBeenCalledWith(conflictingDeletedUser);
      expect(userRepository.save).toHaveBeenCalledWith(userToUpdate);
    });
  });
});
