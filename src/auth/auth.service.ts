import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginAuthDto } from './dto/login-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}


  private async generateToken(userId: string, role: string) {
    const payload = {
      sub: userId,
      role: role,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      accessToken: token,
    };
  }

  async signup(createAuthDto: CreateAuthDto) {
    const { username, password, email } = createAuthDto;

    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existingUser) {
      throw new ConflictException('Username or Email already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        ...createAuthDto,
        username,
        email,
        password: hashedPassword,
        role: createAuthDto.role ? createAuthDto.role : "USER",
      },
    });

    const resp = {
      username: newUser.username,
      fullName: newUser.fullName,
      email: newUser.email,
      phone: newUser.phone,
      image: newUser.image,
    };

    return resp;
  }

  async login(loginAuthDto: LoginAuthDto) {
    
    const { username, password } = loginAuthDto;

    const user = await this.prisma.user.findUnique({
      where: {
        username: username,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (!user.isActive) {
      throw new ForbiddenException(
        'Your account is disabled. Please contact support.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const {password: removePassword, isActive, createdAt, updatedAt, ...items} = user;

    const generateToken = await this.generateToken(user.id, user.role);

    return {
      items,
      accessToken: generateToken.accessToken,
    };
  }
}
