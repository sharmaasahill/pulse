import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(data: any): Promise<{ token: string, user: any }> {
    const existingEmail = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existingEmail) throw new ConflictException('Email already in use');

    const existingUsername = await this.prisma.user.findUnique({ where: { username: data.username } });
    if (existingUsername) throw new ConflictException('Username already taken');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        name: data.fullName,
        passwordHash,
      },
    });

    const jwt = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { token: jwt, user: { id: user.id, email: user.email, username: user.username, name: user.name } };
  }

  async login(data: any): Promise<{ token: string, user: any }> {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const jwt = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { token: jwt, user: { id: user.id, email: user.email, username: user.username, name: user.name } };
  }
}
