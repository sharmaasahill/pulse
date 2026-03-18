import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(input: { name: string; description?: string; ownerId: string }) {
    return this.prisma.project.create({
      data: {
        name: input.name,
        description: input.description,
        ownerId: input.ownerId,
      },
    });
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
    return this.prisma.project.update({
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
  }

  async delete(id: string) {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id }
      });
      
      if (!project) {
        throw new Error('Project not found');
      }

      // Delete in the correct order to avoid foreign key constraint violations
      await this.prisma.activity.deleteMany({ where: { projectId: id } });
      await this.prisma.membership.deleteMany({ where: { projectId: id } });
      await this.prisma.ticket.deleteMany({ where: { projectId: id } });
      return await this.prisma.project.delete({ where: { id } });
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }
}
