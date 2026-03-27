import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppGateway } from '../realtime/gateway';
import { ActivitiesService } from '../activities/activities.service';
import { MemberRole } from '@prisma/client';
import { randomUUID } from 'crypto';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AppGateway,
    private readonly activities: ActivitiesService,
  ) {}

  // Get or create invite for a project
  async getOrCreate(projectId: string, userId: string) {
    // Verify ownership
    await this.verifyOwner(projectId, userId);

    let invite = await this.prisma.invite.findFirst({ where: { projectId } });
    if (!invite) {
      invite = await this.prisma.invite.create({
        data: { projectId, code: generateCode() },
      });
    }
    return invite;
  }

  // Regenerate the invite token and code
  async regenerate(projectId: string, userId: string) {
    await this.verifyOwner(projectId, userId);

    const invite = await this.prisma.invite.findFirst({ where: { projectId } });
    if (!invite) throw new NotFoundException('No invite found');

    return this.prisma.invite.update({
      where: { id: invite.id },
      data: {
        token: randomUUID(),
        code: generateCode(),
      },
    });
  }

  // Toggle enable/disable
  async setEnabled(projectId: string, userId: string, enabled: boolean) {
    await this.verifyOwner(projectId, userId);
    const invite = await this.prisma.invite.findFirst({ where: { projectId } });
    if (!invite) throw new NotFoundException('No invite found');
    return this.prisma.invite.update({ where: { id: invite.id }, data: { enabled } });
  }

  // Update expiry
  async setExpiry(projectId: string, userId: string, expiresAt: Date | null) {
    await this.verifyOwner(projectId, userId);
    const invite = await this.prisma.invite.findFirst({ where: { projectId } });
    if (!invite) throw new NotFoundException('No invite found');
    return this.prisma.invite.update({ where: { id: invite.id }, data: { expiresAt } });
  }

  // Update default role for new joiners
  async setRole(projectId: string, userId: string, role: MemberRole) {
    if (role === 'OWNER') throw new BadRequestException('Cannot set invite role to OWNER');
    await this.verifyOwner(projectId, userId);
    const invite = await this.prisma.invite.findFirst({ where: { projectId } });
    if (!invite) throw new NotFoundException('No invite found');
    return this.prisma.invite.update({ where: { id: invite.id }, data: { role } });
  }

  // Join via invite token
  async joinByToken(token: string, userId: string) {
    const invite = await this.prisma.invite.findUnique({ where: { token }, include: { project: true } });
    if (!invite) throw new NotFoundException('Invalid invite link');
    return this.processJoin(invite, userId);
  }

  // Join via access code
  async joinByCode(code: string, userId: string) {
    const invite = await this.prisma.invite.findUnique({ where: { code: code.toUpperCase() }, include: { project: true } });
    if (!invite) throw new NotFoundException('Invalid access code');
    return this.processJoin(invite, userId);
  }

  private async processJoin(invite: any, userId: string) {
    if (!invite.enabled) throw new ForbiddenException('This invite has been disabled');
    if (invite.expiresAt && new Date() > invite.expiresAt) {
      throw new ForbiddenException('This invite has expired');
    }

    // Check if already a member
    const existing = await this.prisma.membership.findUnique({
      where: { userId_projectId: { userId, projectId: invite.projectId } },
    });
    if (existing) return { project: invite.project, alreadyMember: true };

    // Add member
    await this.prisma.membership.create({
      data: { userId, projectId: invite.projectId, role: invite.role },
    });

    // Log activity
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    await this.activities.log({
      projectId: invite.projectId,
      actorId: userId,
      type: 'member_joined',
      message: `${user?.name || user?.username} joined the project`,
    });

    // Notify project members
    this.gateway.emitTicketUpdated(invite.projectId, {
      type: 'member_joined',
      userId,
      userName: user?.name || user?.username,
    });

    // Notify the joining user so their sidebar refreshes
    this.gateway.emitToUser(userId, 'project:updated', { type: 'joined', projectId: invite.projectId });

    return { project: invite.project, alreadyMember: false };
  }

  private async verifyOwner(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId === userId) return;

    const membership = await this.prisma.membership.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });
    if (!membership || membership.role !== 'OWNER') {
      throw new ForbiddenException('Only the project owner can manage invites');
    }
  }
}
