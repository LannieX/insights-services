import { Module } from '@nestjs/common';
import { WarehouseStockService } from './warehousestock.service';
import { WarehousestockController } from './warehousestock.controller';

@Module({
  controllers: [WarehousestockController],
  providers: [WarehouseStockService],
})
export class WarehousestockModule {}
