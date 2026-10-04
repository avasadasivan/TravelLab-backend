import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// Same fields as CreateActivityDto, all optional. Written by hand because
// @nestjs/mapped-types (PartialType) isn't a dependency.
export class UpdateActivityDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  time?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  location?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  notes?: string;
}
