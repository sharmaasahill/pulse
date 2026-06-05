import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { meetsRole } from './guards/role.guard';

/**
 * Centralized project-membership / role authorization used by services that
 * operate on nested resources (tickets, comments) where the request only
 * carries the resource id and the projectId must be resolved first.
 */
@Injectable()
export class AuthzService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns the membership or throws if the user is not a member. */
  async requireMembership(userId: string, projectId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });
    if (!membership) throw new ForbiddenException('Not a member of this project');
    return membership;
  }

  /** Throws unless the user is a member with at least `minRole`. */
  async requireRole(userId: string, projectId: string, minRole: string) {
    const membership = await this.requireMembership(userId, projectId);
    if (!meetsRole(membership.role, minRole)) {
      throw new ForbiddenException(`Requires ${minRole} role or higher`);
    }
    return membership;
  }
}
