import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppGateway } from '../realtime/gateway';
import { EmailService } from './email.service';

export interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  link?: string;
  projectId?: string;
  ticketId?: string;
  actorName?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AppGateway,
    private readonly email: EmailService,
  ) {}

  /** Persist a single notification for a user and push it in real time. */
  async create(input: NotificationPayload & { userId: string }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        projectId: input.projectId,
        ticketId: input.ticketId,
        actorName: input.actorName,
      },
    });

    // Push to the user's personal room so the bell updates instantly
    this.gateway.emitToUser(input.userId, 'notification:new', notification);
    return notification;
  }

  /**
   * Notify every member of a project (optionally excluding the actor).
   * Members who are currently offline also receive an email (if SMTP is set up).
   */
  async notifyProjectMembers(projectId: string, payload: NotificationPayload, exceptUserId?: string) {
    try {
      const members = await this.prisma.membership.findMany({
        where: { projectId },
        include: { user: true },
      });

      const recipients = members.filter((m) => m.userId !== exceptUserId);
      if (recipients.length === 0) return;

      const connectedUsers = this.gateway.getConnectedUsers(projectId);

      await Promise.all(
        recipients.map(async (member) => {
          await this.create({ ...payload, userId: member.userId, projectId });

          // Email fallback for offline members
          const isOffline = !connectedUsers.includes(member.userId);
          if (isOffline && member.user.email && !member.user.email.endsWith('@pulse.local')) {
            await this.email.send(member.user.email, payload.title, payload.message);
          }
        }),
      );
    } catch (error) {
      this.logger.error(`notifyProjectMembers failed: ${(error as Error).message}`);
    }
  }

  /** Backwards-compatible helper retained for existing callers. */
  async notifyProjectMembersIfOffline(projectId: string, message: string) {
    return this.notifyProjectMembers(projectId, {
      type: 'project_update',
      title: 'Project update',
      message,
      link: `/projects/${projectId}`,
      projectId,
    });
  }

  /** Most recent notifications for a user. */
  listForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId !== userId) throw new ForbiddenException('Not your notification');
    return this.prisma.notification.update({ where: { id }, data: { read: true } });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { success: true };
  }
}
