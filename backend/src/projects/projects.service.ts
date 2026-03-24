import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppGateway } from '../realtime/gateway';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AppGateway,
  ) {}

  list(userId: string) {
    return this.prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      include: { tickets: true },
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
            role: 'owner'
          }
        }
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
            author: true
          }
        }
      },
    });
  }

  async update(id: string, input: { name?: string; description?: string }) {
    const project = await this.prisma.project.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description
      },
      include: { 
        tickets: {
          include: {
            author: true
          }
        }
      }
    });

    this.gateway.emitToUser(project.ownerId, 'project:updated', { type: 'updated', project });
    return project;
  }

  async delete(id: string) {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id }
      });
      
      if (!project) {
        throw new Error('Project not found');
      }

      const ownerId = project.ownerId;

      // Delete in the correct order to avoid foreign key constraint violations
      await this.prisma.activity.deleteMany({ where: { projectId: id } });
      await this.prisma.membership.deleteMany({ where: { projectId: id } });
      await this.prisma.ticket.deleteMany({ where: { projectId: id } });
      const deletedProject = await this.prisma.project.delete({ where: { id } });

      this.gateway.emitToUser(ownerId, 'project:updated', { type: 'deleted', projectId: id });
      return deletedProject;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }
}
