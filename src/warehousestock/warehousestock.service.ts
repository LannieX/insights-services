import { Injectable } from '@nestjs/common';
import { CreateWarehousestockDto } from './dto/create-warehousestock.dto';
import { UpdateWarehousestockDto } from './dto/update-warehousestock.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class WarehouseStockService {
    constructor(private prisma: PrismaService) {}
  create(createWarehousestockDto: CreateWarehousestockDto) {
    return this.prisma.warehouseStock.create({
      data: createWarehousestockDto
    })
  }

  findAll() {
    return this.prisma.warehouseStock.findMany()
  }

  findOne(id: string) {
    return this.prisma.warehouseStock.findUnique({
      where: { id }
    })
  }

  update(id: string, updateWarehousestockDto: UpdateWarehousestockDto) {
    return this.prisma.warehouseStock.update({
      where: { id },
      data: updateWarehousestockDto
    })
  }

  remove(id: string) {
    return this.prisma.warehouseStock.delete({
      where: { id }
    })
  }
}
