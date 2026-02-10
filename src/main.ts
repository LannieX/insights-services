import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'dotenv/config';
import { TransformInterceptor } from './common/transform.interceptor';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';
import { AllExceptionFilter } from './common/all-exception.filter';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new PrismaExceptionFilter(), new AllExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
  console.log(`PORT ${await app.getUrl()}`);
}
bootstrap();