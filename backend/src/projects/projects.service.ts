import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppGateway } from '../realtime/gateway';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AppGateway,
  ) {}

  /**
   * List every project the user belongs to (owned + shared).
   *
   * This drives the dashboard and the sidebar, so it is deliberately a NARROW
   * projection. It previously used `include: { tickets: true, members: { include:
   * { user: true } } }`, which shipped every ticket's title, description and
   * timestamps plus a full user record per membership — many times more data
   * than either screen reads. The dashboard only needs each ticket's status and
   * priority to compute counts, and each member's id and role for the badges.
   */
  list(userId: string) {
    return this.prisma.project.findMany({
      where: {
        members: { some: { userId } },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
        tickets: { select: { id: true, status: true, priority: true } },
        members: { select: { userId: true, role: true } },
      },
    });
  }

  async create(input: { name: string; description?: string; ownerId: string }) {
    const project = await this.prisma.project.create({
      data: {
        name: input.name,
        description: input.description,
        ownerId: input.ownerId,
        members: {
          create: {
            userId: input.ownerId,
            role: 'OWNER',
          },
        },
      },
    });

    this.gateway.emitToUser(input.ownerId, 'project:updated', { type: 'created', project });
    return project;
  }

  getById(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
      include: {
        tickets: {
          include: {
            author: { select: { id: true, email: true, username: true, name: true } },
            assignee: { select: { id: true, email: true, username: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        members: {
          include: {
            user: { select: { id: true, email: true, username: true, name: true } },
          },
        },
        owner: { select: { id: true, email: true, username: true, name: true } },
      },
    });
  }

  async update(id: string, input: { name?: string; description?: string }) {
    const project = await this.prisma.project.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
      },
      include: {
        tickets: { include: { author: true } },
        members: {
          include: {
            user: { select: { id: true, email: true, username: true, name: true } },
          },
        },
      },
    });

    // Notify all members
    for (const member of project.members) {
      this.gateway.emitToUser(member.userId, 'project:updated', { type: 'updated', project });
    }
    return project;
  }

  async delete(id: string) {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id },
        include: { members: true },
      });

      if (!project) throw new Error('Project not found');

      const memberIds = project.members.map(m => m.userId);

      // Cascade delete handles the rest via onDelete: Cascade
      const deletedProject = await this.prisma.project.delete({ where: { id } });

      // Notify all former members
      for (const uid of memberIds) {
        this.gateway.emitToUser(uid, 'project:updated', { type: 'deleted', projectId: id });
      }

      return deletedProject;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }
}
