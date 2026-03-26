import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

// Role hierarchy: OWNER > EDITOR > VIEWER
const ROLE_HIERARCHY: Record<string, number> = {
  VIEWER: 1,
  EDITOR: 2,
  OWNER: 3,
};

export const REQUIRED_ROLE_KEY = 'requiredRole';
export const RequireRole = (role: string) => SetMetadata(REQUIRED_ROLE_KEY, role);

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRole = this.reflector.getAllAndOverride<string>(REQUIRED_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRole) return true; // No role required — allow

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    if (!userId) throw new ForbiddenException('Not authenticated');

    // Extract projectId from params, body, or query
    const projectId =
      request.params?.projectId ||
      request.body?.projectId ||
      request.query?.projectId;

    if (!projectId) throw new ForbiddenException('Project context required');

    const membership = await this.prisma.membership.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });

    if (!membership) throw new ForbiddenException('Not a member of this project');

    const userLevel = ROLE_HIERARCHY[membership.role] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;

    if (userLevel < requiredLevel) {
      throw new ForbiddenException(`Requires ${requiredRole} role or higher`);
    }

    // Attach membership to request for downstream use
    request.membership = membership;
    return true;
  }
}
