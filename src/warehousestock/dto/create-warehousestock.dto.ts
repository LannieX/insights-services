import { IsInt, IsString, IsEnum, Min, IsNotEmpty } from 'class-validator';
import { Status } from '@prisma/client';
export class CreateWarehousestockDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(0, { message: 'จำนวนสินค้าคงเหลือต้องไม่ต่ำกว่า 0' })
  remaining: number;

  @IsEnum(Status, {
    message: 'สถานะต้องเป็น OK, LOW หรือ OUT เท่านั้น',
  })
  status: Status;
}