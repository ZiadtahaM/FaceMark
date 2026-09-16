import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAccount } from './entities/user.entity';
import { Alert } from './entities/alert.entity';
import { UserRepository } from './repositories/user.repository';
import { UsersService } from './services/users.service';
import { AlertService } from './services/alert.service';
import { UsersController } from './controllers/users.controller';
import { AlertController } from './controllers/alert.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserAccount, Alert])],
  controllers: [UsersController, AlertController],
  providers: [UserRepository, UsersService, AlertService],
  exports: [UserRepository, UsersService, AlertService],
})
export class UsersModule {}
