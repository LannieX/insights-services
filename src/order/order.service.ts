import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Status } from '@prisma/client';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  private generateOrderNumber(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const char1 = letters.charAt(Math.floor(Math.random() * letters.length));
    const char2 = letters.charAt(Math.floor(Math.random() * letters.length));
    const digits = Math.floor(10000 + Math.random() * 90000); // 10000-99999

    return `${char1}${char2}${digits}`;
  }

  async create(dto: CreateOrderDto) {
    const { productId, customerId, quantity, totalPrice } = dto;

    return this.prisma.$transaction(async (tx) => {
      const stock = await tx.warehouseStock.findFirst({
        where: { productId },
      });

      if (!stock) {
        throw new NotFoundException('Product stock not found');
      }

      if (stock.remaining < quantity) {
        throw new BadRequestException(
          `Not enough stock. Remaining: ${stock.remaining}`,
        );
      }

      const newRemaining = stock.remaining - quantity;
      let newStatus: Status = 'OK';

      if (newRemaining === 0) {
        newStatus = 'OUT';
      } else if (newRemaining < 10) {
        newStatus = 'LOW';
      } else {
        newStatus = 'OK';
      }

      await tx.warehouseStock.update({
        where: { id: stock.id },
        data: {
          remaining: newRemaining,
          status: newStatus,
        },
      });

      let orderNumber = this.generateOrderNumber();
      let isUnique = false;
      let attempts = 0;

      while (!isUnique && attempts < 5) {
        const existingOrder = await tx.order.findUnique({
          where: { orderNumber },
        });

        if (!existingOrder) {
          isUnique = true;
        } else {
          orderNumber = this.generateOrderNumber();
          attempts++;
        }
      }

      if (!isUnique) {
        throw new ConflictException(
          'Failed to generate unique order number. Please try again.',
        );
      }

      const order = await tx.order.create({
        data: {
          productId,
          customerId,
          quantity,
          totalPrice,
          orderNumber,
        },
        include: { product: true },
      });

      await tx.activityLog.create({
      data: {
        action: 'ORDER_CREATED',
        description: `New Order #${order.orderNumber} - ${order.product.name} (${quantity} items)`,
      },
    });

    if (newStatus === 'LOW' || newStatus === 'OUT') {
      await tx.activityLog.create({
        data: {
          action: newStatus === 'OUT' ? 'INVENTORY_OUT' : 'INVENTORY_LOW',
          description: `Inventory Alert: ${order.product.name} is ${newStatus === 'OUT' ? 'Out of Stock' : 'running low'}`,
        },
      });
    }

    const { product, ...items } = order

      return items;
    });
  }

  findAll() {
    return this.prisma.order.findMany();
  }

  findOne(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
    });
  }

  update(id: string, updateOrderDto: UpdateOrderDto) {
    return this.prisma.order.update({
      where: { id },
      data: updateOrderDto,
    });
  }

  remove(id: string) {
    return this.prisma.order.delete({
      where: { id },
    });
  }
}
