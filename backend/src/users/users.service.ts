import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateByEmail(email: string) {
    return this.prisma.user.upsert({
      where: { email },
      update: {},
      create: { 
        email, 
        name: email.split('@')[0],
        username: email.split('@')[0] + Math.random().toString(36).substring(7),
        passwordHash: '' 
      },
    });
  }
}

