import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class UpdatePackageDto {
  @IsString()
  @IsOptional()
  @Length(2, 100)
  name?: string;

  @IsBoolean()
  @IsOptional()
  notificationsEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  trackingEnabled?: boolean;
}
