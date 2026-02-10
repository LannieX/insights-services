import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { CustomerModule } from './customer/customer.module';
import { ProductModule } from './product/product.module';
import { OrderModule } from './order/order.module';
import { WarehousestockModule } from './warehousestock/warehousestock.module';
import { OverviewModule } from './overview/overview.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule, 
    UserModule,
    AuthModule,
    CustomerModule,
    ProductModule,
    OrderModule,
    WarehousestockModule,
    OverviewModule
  ],
  controllers: [AppController],
  providers: [
    AppService, 
  ],
})
export class AppModule {}