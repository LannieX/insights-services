import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
    constructor(private readonly prisma: PrismaService) {}
async create(dataDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(dataDto.password, 10);

    return this.prisma.user.create({
      data: {
        ...dataDto,
        password: hashedPassword,
      },
      select: {
      username: true,
      fullName: true,
      email: true,
      phone: true,
      createdAt: true,
    },
    });
  }

  findAll() {
    return this.prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      image: true,
      role: true,
      isActive: true,
    }
  });
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id }
    })
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    })
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
