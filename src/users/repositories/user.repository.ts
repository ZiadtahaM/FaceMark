import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { UserAccount } from '../entities/user.entity';

/**
 * Data Access Layer for UserAccount entity.
 * Provides custom database query methods for user-related operations.
 */
@Injectable()
export class UserRepository extends Repository<UserAccount> {
  constructor(private dataSource: DataSource) {
    // Initializes the repository with the UserAccount entity and a default entity manager.
    super(UserAccount, dataSource.createEntityManager());
  }

  /**
   * Finds an active user by their username.
   */
  async findByUsername(username: string): Promise<UserAccount | null> {
    // Search for a user where the username matches and the account is not marked as deleted.
    return this.findOne({ where: { username, isDeleted: false } });
  }

  /**
   * Finds a user by their username regardless of soft-delete status.
   */
  async findByUsernameAll(username: string): Promise<UserAccount | null> {
    return this.findOne({ where: { username } });
  }

  /**
   * Finds an active user by their unique primary key ID.
   */
  async findById(id: number): Promise<UserAccount | null> {
    // Search for a user where the ID matches and the account is not marked as deleted.
    return this.findOne({ where: { userAccountId: id, isDeleted: false } });
  }

  /**
   * Finds a user by their unique primary key ID regardless of soft-delete status.
   */
  async findByIdAll(id: number): Promise<UserAccount | null> {
    return this.findOne({ where: { userAccountId: id } });
  }
}
