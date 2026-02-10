import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { WarehouseStockService } from './warehousestock.service';
import { CreateWarehousestockDto } from './dto/create-warehousestock.dto';
import { UpdateWarehousestockDto } from './dto/update-warehousestock.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('warehouseStock')
export class WarehousestockController {
  constructor(private readonly warehouseStockService: WarehouseStockService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() createWarehousestockDto: CreateWarehousestockDto) {
    return this.warehouseStockService.create(createWarehousestockDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll() {
    return this.warehouseStockService.findAll();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.warehouseStockService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateWarehousestockDto: UpdateWarehousestockDto,
  ) {
    return this.warehouseStockService.update(id, updateWarehousestockDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.warehouseStockService.remove(id);
  }
}
