import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

const LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

// Same fields as CreateActivityDto, all optional. Written by hand because
// @nestjs/mapped-types (PartialType) isn't a dependency.
export class UpdateActivityDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @Matches(LOCAL_DATE_TIME, {
    message: 'startTime must look like 2026-11-03T10:00',
  })
  startTime?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  timeZone?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  location?: string;

  // Leaving notes out means "don't touch it"; sending null clears it.
  @IsOptional()
  @IsString()
  notes?: string | null;

  // Required: the version this edit is based on. If someone else saved first,
  // it no longer matches and the server answers 409 instead of overwriting.
  @IsInt()
  version: number;
}
