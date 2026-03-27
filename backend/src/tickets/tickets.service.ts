import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppGateway } from '../realtime/gateway';
import { ActivitiesService } from '../activities/activities.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AppGateway,
    private readonly activities: ActivitiesService,
    private readonly notifications: NotificationsService,
  ) {}

  get(id: string) {
    return this.prisma.ticket.findUnique({ where: { id } });
  }

  async create(input: { projectId: string; title: string; description?: string; authorId?: string; authorEmail?: string; priority?: any; status?: any }) {
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
          passwordHash: ''
        }
      });
      authorId = user.id;
    } else if (!authorId) {
      // Fallback to system user
      const defaultUser = await this.prisma.user.upsert({
        where: { email: 'system@pulse.local' },
        update: {},
        create: { email: 'system@pulse.local', name: 'System', username: 'system_user', passwordHash: '' }
      });
      authorId = defaultUser.id;
    }

    const ticket = await this.prisma.ticket.create({ 
      data: { 
        projectId: input.projectId,
        title: input.title,
        description: input.description,
        authorId: authorId,
        priority: input.priority,
        status: input.status
      } 
    });
    this.gateway.emitTicketUpdated(ticket.projectId, { type: 'created', ticket });
    await this.activities.log({ projectId: ticket.projectId, ticketId: ticket.id, actorId: authorId, type: 'create', message: `Ticket created: ${ticket.title}` });
    await this.notifications.notifyProjectMembersIfOffline(ticket.projectId, `New ticket: ${ticket.title}`);
    return ticket;
  }

  async update(id: string, input: Record<string, unknown> & { actorId?: string }) {
    const { actorId, ...data } = input as any;
    
    // Find or create a default user for the actor
    let actorIdToUse = actorId;
    if (!actorIdToUse) {
      const defaultUser = await this.prisma.user.upsert({
        where: { email: 'system@pulse.local' },
        update: {},
        create: { email: 'system@pulse.local', name: 'System', username: 'system_user', passwordHash: '' }
      });
      actorIdToUse = defaultUser.id;
    }

    const ticket = await this.prisma.ticket.update({ where: { id }, data: data as any });
    this.gateway.emitTicketUpdated(ticket.projectId, { type: 'updated', ticket });
    await this.activities.log({ projectId: ticket.projectId, ticketId: ticket.id, actorId: actorIdToUse, type: 'update', message: `Ticket updated: ${ticket.title}` });
    await this.notifications.notifyProjectMembersIfOffline(ticket.projectId, `Ticket updated: ${ticket.title}`);
    return ticket;
  }

  async delete(id: string, actorId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return null;

    await this.prisma.ticket.delete({ where: { id } });
    this.gateway.emitTicketUpdated(ticket.projectId, { type: 'deleted', ticket });
    await this.activities.log({ projectId: ticket.projectId, ticketId: ticket.id, actorId, type: 'delete', message: `Ticket deleted: ${ticket.title}` });
    await this.notifications.notifyProjectMembersIfOffline(ticket.projectId, `Ticket deleted: ${ticket.title}`);
    return ticket;
  }
}


