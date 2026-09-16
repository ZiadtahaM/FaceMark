import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { UserAccount } from './user.entity';

@Entity('alerts')
export class Alert {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Low Attendance Warning' })
  @Column()
  title: string;

  @ApiProperty({ example: 'Your attendance is below 75%' })
  @Column()
  message: string;

  @ApiProperty({ example: 'danger', enum: ['info', 'warning', 'danger'] })
  @Column({ default: 'info' }) // info, danger, warning
  type: string;

  @ApiProperty({ example: false })
  @Column({ default: false })
  isRead: boolean;

  @ManyToOne(() => UserAccount)
  user: UserAccount;

  @ApiProperty({ example: { courseId: 1 }, required: false })
  @Column({ type: 'json', nullable: true })
  metadata: any;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @CreateDateColumn()
  createdAt: Date;
}
