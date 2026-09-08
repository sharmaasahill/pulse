import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

// The columns we are safe to send back to the client.
// We NEVER select passwordHash so it can't leak through the API.
const SAFE_USER_SELECT = {
  id: true,
  email: true,
  username: true,
  name: true,
  isSuperUser: true,
  createdAt: true,
} as const;

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
        passwordHash: '',
      },
    });
  }

  /** Return the current user's profile (never includes the password hash). */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Update editable profile fields. Username and email are unique in the
   * schema, so we check for conflicts against *other* users before updating
   * (otherwise Prisma would throw a raw constraint error).
   */
  async updateProfile(
    userId: string,
    input: { name?: string; username?: string; email?: string },
  ) {
    if (input.username) {
      const existing = await this.prisma.user.findUnique({
        where: { username: input.username },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Username already taken');
      }
    }

    if (input.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: input.email },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Email already in use');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        username: input.username,
        email: input.email,
      },
      select: SAFE_USER_SELECT,
    });
  }

  /**
   * Change the user's password. We require the current password and verify it
   * with bcrypt before setting the new one, so a stolen session token alone
   * can't silently change someone's password.
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Accounts created implicitly (e.g. via ticket author email) have an empty
    // hash. For those there is nothing to verify against — allow setting one.
    if (user.passwordHash) {
      const matches = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!matches) throw new UnauthorizedException('Current password is incorrect');
    }

    if (newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true };
  }
}
