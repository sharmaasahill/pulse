import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppGateway } from '../realtime/gateway';
import { ActivitiesService } from '../activities/activities.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthzService } from '../common/authz.service';

const TICKET_INCLUDE = {
  author: { select: { id: true, email: true, username: true, name: true } },
  assignee: { select: { id: true, email: true, username: true, name: true } },
} as const;

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AppGateway,
    private readonly activities: ActivitiesService,
    private readonly notifications: NotificationsService,
    private readonly authz: AuthzService,
  ) {}

  /** Read a single ticket — caller must be a member of its project. */
  async get(id: string, userId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id }, include: TICKET_INCLUDE });
    if (!ticket) throw new NotFoundException('Ticket not found');
    await this.authz.requireMembership(userId, ticket.projectId);
    return ticket;
  }

  async create(input: { projectId: string; title: string; description?: string; authorId?: string; authorEmail?: string; assigneeId?: string; priority?: any; status?: any }) {
    // Find or create user for the author
    let authorId = input.authorId;
    if (!authorId && input.authorEmail) {
      // Use the provided email to find or create user
      const user = await this.prisma.user.upsert({
        where: { email: input.authorEmail },
        update: {},
        create: {
          email: input.authorEmail,
          name: input.authorEmail.split('@')[0],
          username: input.authorEmail.split('@')[0] + Math.random().toString(36).substring(7),
          passwordHash: '',
        },
      });
      authorId = user.id;
    } else if (!authorId) {
      // Fallback to system user
      const defaultUser = await this.prisma.user.upsert({
        where: { email: 'system@pulse.local' },
        update: {},
        create: { email: 'system@pulse.local', name: 'System', username: 'system_user', passwordHash: '' },
      });
      authorId = defaultUser.id;
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        projectId: input.projectId,
        title: input.title,
        description: input.description,
        authorId: authorId,
        assigneeId: input.assigneeId || null,
        priority: input.priority,
        status: input.status,
      },
      include: TICKET_INCLUDE,
    });

    this.gateway.emitTicketUpdated(ticket.projectId, { type: 'created', ticket });
    await this.activities.log({ projectId: ticket.projectId, ticketId: ticket.id, actorId: authorId, type: 'create', message: `Ticket created: ${ticket.title}` });

    // Notify project members about the new ticket (except the author)
    await this.notifications.notifyProjectMembers(
      ticket.projectId,
      {
        type: 'ticket_created',
        title: 'New ticket',
        message: `New ticket: ${ticket.title}`,
        link: `/projects/${ticket.projectId}`,
        ticketId: ticket.id,
      },
      authorId,
    );

    // Direct notification to the assignee (if any, and not the author)
    if (ticket.assigneeId && ticket.assigneeId !== authorId) {
      await this.notifications.create({
        userId: ticket.assigneeId,
        type: 'ticket_assigned',
        title: 'Assigned to you',
        message: `You were assigned: ${ticket.title}`,
        link: `/projects/${ticket.projectId}`,
        projectId: ticket.projectId,
        ticketId: ticket.id,
      });
    }

    return ticket;
  }

  async update(id: string, input: Record<string, unknown> & { actorId?: string }) {
    const { actorId, ...data } = input as any;

    const existing = await this.prisma.ticket.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Ticket not found');

    // Authorization: actor must be EDITOR+ on the ticket's project
    let actorIdToUse = actorId;
    if (actorIdToUse) {
      await this.authz.requireRole(actorIdToUse, existing.projectId, 'EDITOR');
    } else {
      // Fallback to system user (internal/automation calls)
      const defaultUser = await this.prisma.user.upsert({
        where: { email: 'system@pulse.local' },
        update: {},
        create: { email: 'system@pulse.local', name: 'System', username: 'system_user', passwordHash: '' },
      });
      actorIdToUse = defaultUser.id;
    }

    const assigneeChanged =
      Object.prototype.hasOwnProperty.call(data, 'assigneeId') && data.assigneeId !== existing.assigneeId;

    const ticket = await this.prisma.ticket.update({ where: { id }, data: data as any, include: TICKET_INCLUDE });
    this.gateway.emitTicketUpdated(ticket.projectId, { type: 'updated', ticket });
    await this.activities.log({ projectId: ticket.projectId, ticketId: ticket.id, actorId: actorIdToUse, type: 'update', message: `Ticket updated: ${ticket.title}` });

    // Notify a newly-assigned user
    if (assigneeChanged && ticket.assigneeId && ticket.assigneeId !== actorIdToUse) {
      await this.notifications.create({
        userId: ticket.assigneeId,
        type: 'ticket_assigned',
        title: 'Assigned to you',
        message: `You were assigned: ${ticket.title}`,
        link: `/projects/${ticket.projectId}`,
        projectId: ticket.projectId,
        ticketId: ticket.id,
      });
    }

    return ticket;
  }

  async delete(id: string, actorId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    // Authorization: actor must be EDITOR+ on the ticket's project
    await this.authz.requireRole(actorId, ticket.projectId, 'EDITOR');

    await this.prisma.ticket.delete({ where: { id } });
    this.gateway.emitTicketUpdated(ticket.projectId, { type: 'deleted', ticket });
    await this.activities.log({ projectId: ticket.projectId, ticketId: ticket.id, actorId, type: 'delete', message: `Ticket deleted: ${ticket.title}` });
    return ticket;
  }
}
