import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TicketsService } from './tickets.service';

describe('TicketsService', () => {
  let prisma: any;
  let gateway: any;
  let activities: any;
  let notifications: any;
  let authz: any;
  let service: TicketsService;

  beforeEach(() => {
    prisma = {
      ticket: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: { upsert: jest.fn() },
      membership: { findUnique: jest.fn() },
    };
    gateway = { emitTicketUpdated: jest.fn(), emitToUser: jest.fn() };
    activities = { log: jest.fn().mockResolvedValue(undefined) };
    notifications = {
      notifyProjectMembers: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockResolvedValue(undefined),
    };
    authz = {
      requireMembership: jest.fn().mockResolvedValue({ role: 'EDITOR' }),
      requireRole: jest.fn().mockResolvedValue({ role: 'EDITOR' }),
    };
    service = new TicketsService(prisma, gateway, activities, notifications, authz);
  });

  describe('get', () => {
    it('throws NotFound for a missing ticket', async () => {
      prisma.ticket.findUnique.mockResolvedValue(null);
      await expect(service.get('t1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('requires membership of the ticket project', async () => {
      prisma.ticket.findUnique.mockResolvedValue({ id: 't1', projectId: 'p1' });
      await service.get('t1', 'u1');
      expect(authz.requireMembership).toHaveBeenCalledWith('u1', 'p1');
    });
  });

  describe('create', () => {
    it('creates a ticket, emits, logs and notifies members', async () => {
      const ticket = { id: 't1', projectId: 'p1', title: 'Task', assigneeId: null };
      prisma.ticket.create.mockResolvedValue(ticket);

      const result = await service.create({ projectId: 'p1', title: 'Task', authorId: 'author1' });

      expect(result).toBe(ticket);
      expect(gateway.emitTicketUpdated).toHaveBeenCalledWith('p1', { type: 'created', ticket });
      expect(activities.log).toHaveBeenCalled();
      expect(notifications.notifyProjectMembers).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ type: 'ticket_created', ticketId: 't1' }),
        'author1',
      );
      expect(notifications.create).not.toHaveBeenCalled();
    });

    it('directly notifies the assignee when set and different from author', async () => {
      const ticket = { id: 't1', projectId: 'p1', title: 'Task', assigneeId: 'assignee1' };
      prisma.ticket.create.mockResolvedValue(ticket);

      await service.create({ projectId: 'p1', title: 'Task', authorId: 'author1', assigneeId: 'assignee1' });

      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'assignee1', type: 'ticket_assigned', ticketId: 't1' }),
      );
    });

    it('does not notify the assignee when they are the author', async () => {
      const ticket = { id: 't1', projectId: 'p1', title: 'Task', assigneeId: 'author1' };
      prisma.ticket.create.mockResolvedValue(ticket);

      await service.create({ projectId: 'p1', title: 'Task', authorId: 'author1', assigneeId: 'author1' });

      expect(notifications.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws NotFound for a missing ticket', async () => {
      prisma.ticket.findUnique.mockResolvedValue(null);
      await expect(service.update('t1', { actorId: 'u1' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('enforces EDITOR role on the project', async () => {
      prisma.ticket.findUnique.mockResolvedValue({ id: 't1', projectId: 'p1', assigneeId: null });
      authz.requireRole.mockRejectedValueOnce(new ForbiddenException('Requires EDITOR role or higher'));
      await expect(service.update('t1', { actorId: 'viewer1', title: 'x' })).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.ticket.update).not.toHaveBeenCalled();
    });

    it('notifies a newly assigned user', async () => {
      prisma.ticket.findUnique.mockResolvedValue({ id: 't1', projectId: 'p1', assigneeId: null });
      const updated = { id: 't1', projectId: 'p1', title: 'Task', assigneeId: 'assignee1' };
      prisma.ticket.update.mockResolvedValue(updated);

      await service.update('t1', { actorId: 'editor1', assigneeId: 'assignee1' });

      expect(authz.requireRole).toHaveBeenCalledWith('editor1', 'p1', 'EDITOR');
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'assignee1', type: 'ticket_assigned' }),
      );
    });

    it('does not notify when the assignee is unchanged', async () => {
      prisma.ticket.findUnique.mockResolvedValue({ id: 't1', projectId: 'p1', assigneeId: 'assignee1' });
      prisma.ticket.update.mockResolvedValue({ id: 't1', projectId: 'p1', title: 'Task', assigneeId: 'assignee1' });

      await service.update('t1', { actorId: 'editor1', title: 'Renamed' });

      expect(notifications.create).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('throws NotFound for a missing ticket', async () => {
      prisma.ticket.findUnique.mockResolvedValue(null);
      await expect(service.delete('t1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('enforces EDITOR role before deleting', async () => {
      prisma.ticket.findUnique.mockResolvedValue({ id: 't1', projectId: 'p1', title: 'Task' });
      authz.requireRole.mockRejectedValueOnce(new ForbiddenException('nope'));
      await expect(service.delete('t1', 'viewer1')).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.ticket.delete).not.toHaveBeenCalled();
    });

    it('deletes, emits and logs when authorized', async () => {
      const ticket = { id: 't1', projectId: 'p1', title: 'Task' };
      prisma.ticket.findUnique.mockResolvedValue(ticket);

      const result = await service.delete('t1', 'editor1');

      expect(authz.requireRole).toHaveBeenCalledWith('editor1', 'p1', 'EDITOR');
      expect(prisma.ticket.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
      expect(gateway.emitTicketUpdated).toHaveBeenCalledWith('p1', { type: 'deleted', ticket });
      expect(result).toBe(ticket);
    });
  });
});
