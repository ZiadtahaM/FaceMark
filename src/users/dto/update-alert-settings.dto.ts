import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateAlertSettingsDto {
  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  lowAttendanceWarnings?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  systemUpdates?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  technicalIssues?: boolean;
}
