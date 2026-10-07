import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateTripDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  // Required: the version this edit is based on. If someone else saved first,
  // it no longer matches and the server answers 409 instead of overwriting.
  @IsInt()
  version: number;
}
