import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

// Local wall-clock time at the destination: "2026-11-03T10:00".
// No "Z" and no offset on purpose - see docs/api.md.
const LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export class CreateActivityDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @Matches(LOCAL_DATE_TIME, {
    message: 'startTime must look like 2026-11-03T10:00',
  })
  startTime: string;

  @IsString()
  @IsNotEmpty()
  timeZone: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  // Optional. @IsOptional() also lets null through, which the service stores
  // as "no notes".
  @IsOptional()
  @IsString()
  notes?: string | null;
}
