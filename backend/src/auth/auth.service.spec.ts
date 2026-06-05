import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let prisma: any;
  let jwt: any;
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };
    service = new AuthService(prisma, jwt);
  });

  describe('register', () => {
    const dto = { email: 'a@b.com', username: 'alice', fullName: 'Alice', password: 'secret123' };

    it('rejects a duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 'existing' });
      await expect(service.register(dto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a duplicate username', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce({ id: 'existing' }); // username check
      await expect(service.register(dto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('hashes the password and returns a token + user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'u1', email: data.email, username: data.username, name: data.name }),
      );

      const result = await service.register(dto);

      const createArg = prisma.user.create.mock.calls[0][0].data;
      expect(createArg.passwordHash).toBeDefined();
      expect(createArg.passwordHash).not.toBe(dto.password);
      await expect(bcrypt.compare(dto.password, createArg.passwordHash)).resolves.toBe(true);

      expect(result.token).toBe('signed.jwt.token');
      expect(result.user).toEqual({ id: 'u1', email: 'a@b.com', username: 'alice', name: 'Alice' });
    });
  });

  describe('login', () => {
    it('rejects an unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ email: 'no@x.com', password: 'x' })).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a wrong password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com', username: 'alice', name: 'Alice', passwordHash });
      await expect(service.login({ email: 'a@b.com', password: 'wrong' })).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns a token + user on valid credentials', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com', username: 'alice', name: 'Alice', passwordHash });

      const result = await service.login({ email: 'a@b.com', password: 'correct-password' });

      expect(result.token).toBe('signed.jwt.token');
      expect(result.user).toEqual({ id: 'u1', email: 'a@b.com', username: 'alice', name: 'Alice' });
      expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'u1', email: 'a@b.com' });
    });
  });
});
