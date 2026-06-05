import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleGuard, meetsRole, ROLE_HIERARCHY } from './role.guard';

describe('meetsRole', () => {
  it('respects the OWNER > EDITOR > VIEWER hierarchy', () => {
    expect(meetsRole('OWNER', 'EDITOR')).toBe(true);
    expect(meetsRole('EDITOR', 'EDITOR')).toBe(true);
    expect(meetsRole('VIEWER', 'EDITOR')).toBe(false);
    expect(meetsRole('EDITOR', 'OWNER')).toBe(false);
    expect(meetsRole('VIEWER', 'VIEWER')).toBe(true);
  });

  it('treats unknown / missing roles as the lowest level', () => {
    expect(meetsRole(undefined, 'VIEWER')).toBe(false);
    expect(meetsRole('NONSENSE', 'VIEWER')).toBe(false);
  });

  it('exposes a sane hierarchy map', () => {
    expect(ROLE_HIERARCHY.OWNER).toBeGreaterThan(ROLE_HIERARCHY.EDITOR);
    expect(ROLE_HIERARCHY.EDITOR).toBeGreaterThan(ROLE_HIERARCHY.VIEWER);
  });
});

describe('RoleGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let prisma: { membership: { findUnique: jest.Mock } };
  let guard: RoleGuard;

  const makeContext = (request: any): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    prisma = { membership: { findUnique: jest.fn() } };
    guard = new RoleGuard(reflector as unknown as Reflector, prisma as any);
  });

  it('allows the route when no role is required', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    await expect(guard.canActivate(makeContext({}))).resolves.toBe(true);
    expect(prisma.membership.findUnique).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated request', async () => {
    reflector.getAllAndOverride.mockReturnValue('VIEWER');
    await expect(guard.canActivate(makeContext({ params: { id: 'p1' } }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects when no project context can be resolved', async () => {
    reflector.getAllAndOverride.mockReturnValue('VIEWER');
    await expect(guard.canActivate(makeContext({ user: { userId: 'u1' }, params: {} }))).rejects.toThrow('Project context required');
  });

  it('rejects a non-member', async () => {
    reflector.getAllAndOverride.mockReturnValue('VIEWER');
    prisma.membership.findUnique.mockResolvedValue(null);
    await expect(
      guard.canActivate(makeContext({ user: { userId: 'u1' }, params: { id: 'p1' } })),
    ).rejects.toThrow('Not a member of this project');
  });

  it('rejects a member with insufficient role', async () => {
    reflector.getAllAndOverride.mockReturnValue('OWNER');
    prisma.membership.findUnique.mockResolvedValue({ role: 'EDITOR' });
    await expect(
      guard.canActivate(makeContext({ user: { userId: 'u1' }, params: { id: 'p1' } })),
    ).rejects.toThrow('Requires OWNER role or higher');
  });

  it('allows a member with a sufficient role and resolves projectId from the body', async () => {
    reflector.getAllAndOverride.mockReturnValue('EDITOR');
    prisma.membership.findUnique.mockResolvedValue({ role: 'OWNER' });
    const request: any = { user: { userId: 'u1' }, body: { projectId: 'p1' } };
    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(prisma.membership.findUnique).toHaveBeenCalledWith({
      where: { userId_projectId: { userId: 'u1', projectId: 'p1' } },
    });
    expect(request.membership).toEqual({ role: 'OWNER' });
  });
});
