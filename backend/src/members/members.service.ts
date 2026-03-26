import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppGateway } from '../realtime/gateway';
import { ActivitiesService } from '../activities/activities.service';
import { MemberRole } from '@prisma/client';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AppGateway,
    private readonly activities: ActivitiesService,
  ) {}

  async list(projectId: string) {
    return this.prisma.membership.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, email: true, username: true, name: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async changeRole(memberId: string, newRole: MemberRole, actorId: string) {
    const member = await this.prisma.membership.findUnique({
      where: { id: memberId },
      include: { user: true },
    });
    if (!member) throw new NotFoundException('Member not found');

    if (member.role === 'OWNER') throw new ForbiddenException('Cannot change the owner\'s role');
    if (newRole === 'OWNER') throw new ForbiddenException('Cannot promote to owner');

    // Verify actor is owner
    const actor = await this.prisma.membership.findUnique({
      where: { userId_projectId: { userId: actorId, projectId: member.projectId } },
    });
    if (!actor || actor.role !== 'OWNER') throw new ForbiddenException('Only the owner can change roles');

    const updated = await this.prisma.membership.update({
      where: { id: memberId },
      data: { role: newRole },
      include: { user: { select: { id: true, email: true, username: true, name: true } } },
    });

    await this.activities.log({
      projectId: member.projectId,
      actorId,
      type: 'role_changed',
      message: `${member.user.name || member.user.username}'s role changed to ${newRole}`,
    });

    // Notify the affected user
    this.gateway.emitToUser(member.userId, 'project:updated', {
      type: 'role_changed',
      projectId: member.projectId,
      newRole,
    });

    // Notify all project members
    this.gateway.emitTicketUpdated(member.projectId, {
      type: 'member_updated',
      member: updated,
    });

    return updated;
  }

  async remove(memberId: string, actorId: string) {
    const member = await this.prisma.membership.findUnique({
      where: { id: memberId },
      include: { user: true },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (member.role === 'OWNER') throw new ForbiddenException('Cannot remove the project owner');

    // Verify actor is owner
    const actor = await this.prisma.membership.findUnique({
      where: { userId_projectId: { userId: actorId, projectId: member.projectId } },
    });
    if (!actor || actor.role !== 'OWNER') throw new ForbiddenException('Only the owner can remove members');

    await this.prisma.membership.delete({ where: { id: memberId } });

    await this.activities.log({
      projectId: member.projectId,
      actorId,
      type: 'member_removed',
      message: `${member.user.name || member.user.username} was removed from the project`,
    });

    // Notify the removed user so their sidebar/dashboard updates
    this.gateway.emitToUser(member.userId, 'project:updated', {
      type: 'removed',
      projectId: member.projectId,
    });

    // Notify remaining members
    this.gateway.emitTicketUpdated(member.projectId, {
      type: 'member_removed',
      userId: member.userId,
    });

    return { success: true };
  }

  async leave(projectId: string, userId: string) {
    const member = await this.prisma.membership.findUnique({
      where: { userId_projectId: { userId, projectId } },
      include: { user: true },
    });
    if (!member) throw new NotFoundException('Not a member');
    if (member.role === 'OWNER') throw new ForbiddenException('Owner cannot leave. Transfer ownership first.');

    await this.prisma.membership.delete({ where: { id: member.id } });

    await this.activities.log({
      projectId,
      actorId: userId,
      type: 'member_left',
      message: `${member.user.name || member.user.username} left the project`,
    });

    this.gateway.emitToUser(userId, 'project:updated', { type: 'left', projectId });
    this.gateway.emitTicketUpdated(projectId, { type: 'member_removed', userId });

    return { success: true };
  }
}
