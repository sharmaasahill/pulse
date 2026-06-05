import { ForbiddenException } from '@nestjs/common';
import { AuthzService } from './authz.service';

describe('AuthzService', () => {
  let prisma: { membership: { findUnique: jest.Mock } };
  let authz: AuthzService;

  beforeEach(() => {
    prisma = { membership: { findUnique: jest.fn() } };
    authz = new AuthzService(prisma as any);
  });

  describe('requireMembership', () => {
    it('returns the membership when the user is a member', async () => {
      const membership = { id: 'm1', role: 'VIEWER' };
      prisma.membership.findUnique.mockResolvedValue(membership);
      await expect(authz.requireMembership('u1', 'p1')).resolves.toBe(membership);
    });

    it('throws when the user is not a member', async () => {
      prisma.membership.findUnique.mockResolvedValue(null);
      await expect(authz.requireMembership('u1', 'p1')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('requireRole', () => {
    it('passes when the membership meets the minimum role', async () => {
      prisma.membership.findUnique.mockResolvedValue({ role: 'OWNER' });
      await expect(authz.requireRole('u1', 'p1', 'EDITOR')).resolves.toBeTruthy();
    });

    it('throws when the membership is below the minimum role', async () => {
      prisma.membership.findUnique.mockResolvedValue({ role: 'VIEWER' });
      await expect(authz.requireRole('u1', 'p1', 'EDITOR')).rejects.toThrow('Requires EDITOR role or higher');
    });
  });
});
