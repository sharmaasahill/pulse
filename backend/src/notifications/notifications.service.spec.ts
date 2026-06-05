import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let prisma: any;
  let gateway: any;
  let email: any;
  let service: NotificationsService;

  beforeEach(() => {
    prisma = {
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      membership: { findMany: jest.fn() },
    };
    gateway = { emitToUser: jest.fn(), getConnectedUsers: jest.fn().mockReturnValue([]) };
    email = { send: jest.fn().mockResolvedValue(true) };
    service = new NotificationsService(prisma, gateway, email);
  });

  describe('create', () => {
    it('persists the notification and pushes it to the user room', async () => {
      const created = { id: 'n1', userId: 'u1' };
      prisma.notification.create.mockResolvedValue(created);

      const result = await service.create({ userId: 'u1', type: 'ticket_created', title: 'T', message: 'M' });

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 'u1', type: 'ticket_created' }) }),
      );
      expect(gateway.emitToUser).toHaveBeenCalledWith('u1', 'notification:new', created);
      expect(result).toBe(created);
    });
  });

  describe('notifyProjectMembers', () => {
    it('notifies all members except the actor and emails offline ones', async () => {
      prisma.membership.findMany.mockResolvedValue([
        { userId: 'actor', user: { email: 'actor@x.com' } },
        { userId: 'online', user: { email: 'online@x.com' } },
        { userId: 'offline', user: { email: 'offline@x.com' } },
      ]);
      gateway.getConnectedUsers.mockReturnValue(['online']);
      prisma.notification.create.mockResolvedValue({ id: 'n' });

      await service.notifyProjectMembers('p1', { type: 'x', title: 'T', message: 'M' }, 'actor');

      // actor excluded → only 2 notifications created
      expect(prisma.notification.create).toHaveBeenCalledTimes(2);
      // only the offline member is emailed
      expect(email.send).toHaveBeenCalledTimes(1);
      expect(email.send).toHaveBeenCalledWith('offline@x.com', 'T', 'M');
    });

    it('skips internal @pulse.local emails', async () => {
      prisma.membership.findMany.mockResolvedValue([
        { userId: 'system', user: { email: 'system@pulse.local' } },
      ]);
      gateway.getConnectedUsers.mockReturnValue([]);
      prisma.notification.create.mockResolvedValue({ id: 'n' });

      await service.notifyProjectMembers('p1', { type: 'x', title: 'T', message: 'M' });

      expect(prisma.notification.create).toHaveBeenCalledTimes(1);
      expect(email.send).not.toHaveBeenCalled();
    });
  });

  describe('markRead', () => {
    it('throws NotFound when the notification does not exist', async () => {
      prisma.notification.findUnique.mockResolvedValue(null);
      await expect(service.markRead('n1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws Forbidden when the notification belongs to another user', async () => {
      prisma.notification.findUnique.mockResolvedValue({ id: 'n1', userId: 'someone-else' });
      await expect(service.markRead('n1', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('marks the notification read for its owner', async () => {
      prisma.notification.findUnique.mockResolvedValue({ id: 'n1', userId: 'u1' });
      prisma.notification.update.mockResolvedValue({ id: 'n1', read: true });
      await service.markRead('n1', 'u1');
      expect(prisma.notification.update).toHaveBeenCalledWith({ where: { id: 'n1' }, data: { read: true } });
    });
  });
});
