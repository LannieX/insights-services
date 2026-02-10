import { Region } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';


export class CreateCustomerDto {
  @IsString()
  name: string;

  @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง' })
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

@IsEnum(Region)
  region: Region;
}