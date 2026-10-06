import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateTripDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  // Clients send the version they last saw. The server ignores it for now;
  // the conflict check (409) comes in a later block. It has to be declared
  // here anyway, because forbidNonWhitelisted rejects undeclared fields.
  @IsOptional()
  @IsInt()
  version?: number;
}