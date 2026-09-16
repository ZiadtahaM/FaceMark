import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { UserAccount } from '../entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  async findAll(role?: Role): Promise<Omit<UserAccount, 'password'>[]> {
    let users: UserAccount[];
    if (role) {
      users = await this.userRepository.find({ where: { userType: role, isDeleted: false } });
    } else {
      users = await this.userRepository.find({ where: { isDeleted: false } });
    }
    return users.map(user => {
      const { password, ...result } = user;
      return result;
    });
  }

  async findOne(id: number): Promise<Omit<UserAccount, 'password'>> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    const { password, ...result } = user;
    return result;
  }

  async create(userData: any): Promise<Omit<UserAccount, 'password'>> {
    const existingUser = await this.userRepository.findByUsernameAll(userData.username);
    
    if (existingUser) {
      if (!existingUser.isDeleted) {
        throw new ConflictException('Username already exists');
      }
      
      // Restore deleted user
      if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
      }
      
      // Handle 'role' alias for 'userType' if provided
      if (userData.role && !userData.userType) {
        userData.userType = userData.role;
      }

      Object.assign(existingUser, {
        ...userData,
        isDeleted: false,
      });
      
      const savedUser = await this.userRepository.save(existingUser);
      const { password, ...result } = savedUser;
      return result;
    }

    // Handle 'role' alias for 'userType' if provided
    if (userData.role && !userData.userType) {
      userData.userType = userData.role;
    }

    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    const newUser: UserAccount = this.userRepository.create(userData as UserAccount);
    const savedUser = await this.userRepository.save(newUser);
    const { password, ...result } = savedUser;
    return result;
  }

  async findOneByUsername(username: string): Promise<Omit<UserAccount, 'password'>> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new NotFoundException(`Search Failed: User account with username '${username}' was not found.`);
    }
    const { password, ...result } = user;
    return result;
  }

  async updateByUsername(username: string, userData: Partial<UserAccount>): Promise<Omit<UserAccount, 'password'>> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new NotFoundException(`Search Failed: User account with username '${username}' was not found.`);
    }
    return this.update(user.userAccountId, userData);
  }

  async update(id: number, userData: Partial<UserAccount>): Promise<Omit<UserAccount, 'password'>> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (userData.username && userData.username !== user.username) {
      const existingUser = await this.userRepository.findByUsernameAll(userData.username);
      if (existingUser) {
        if (!existingUser.isDeleted) {
          throw new ConflictException('Username already exists');
        } else {
          // Rename the deleted user to free up the username
          existingUser.username = `${existingUser.username}_deleted_${Date.now()}`;
          await this.userRepository.save(existingUser);
        }
      }
    }

    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    Object.assign(user, userData);
    const savedUser = await this.userRepository.save(user);
    const { password, ...result } = savedUser;
    return result;
  }

  async remove(id: number, isHard: boolean = false): Promise<void> {
    const user = await this.userRepository.findOne({ where: { userAccountId: id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    if (isHard) {
      await this.userRepository.delete(id);
    } else {
      if (user.isDeleted) return; // Already soft-deleted
      user.isDeleted = true;
      user.username = `${user.username}_deleted_${Date.now()}`;
      await this.userRepository.save(user);
    }
  }

  async removeByUsername(username: string, isHard: boolean = false): Promise<void> {
    const user = await this.userRepository.findByUsernameAll(username);
    if (!user) {
      throw new NotFoundException(`Account Deletion Failed: No user account found with username '${username}'.`);
    }

    if (isHard) {
      await this.userRepository.delete(user.userAccountId);
    } else {
      if (user.isDeleted) return; // Already soft-deleted
      user.isDeleted = true;
      user.username = `${user.username}_deleted_${Date.now()}`;
      await this.userRepository.save(user);
    }
  }
}
