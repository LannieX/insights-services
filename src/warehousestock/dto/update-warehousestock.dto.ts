import { PartialType } from '@nestjs/mapped-types';
import { CreateWarehousestockDto } from './create-warehousestock.dto';

export class UpdateWarehousestockDto extends PartialType(CreateWarehousestockDto) {}
