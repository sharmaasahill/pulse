import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.project.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(input: { name: string; description?: string; ownerId?: string }) {
    // Create project with ownerId or create a default user
    let ownerId = input.ownerId;
    if (!ownerId) {
      // Find or create a default user
      const defaultUser = await this.prisma.user.upsert({
        where: { email: 'system@pulse.local' },
        update: {},
        create: { email: 'system@pulse.local', name: 'System', username: 'system_user', passwordHash: '' }
      });
      ownerId = defaultUser.id;
    }
    
    return this.prisma.project.create({ 
      data: { 
        name: input.name, 
        description: input.description,
        ownerId: ownerId
      } as any 
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
      // First check if project exists
      const project = await this.prisma.project.findUnique({
        where: { id }
      });
      
      if (!project) {
        throw new Error('Project not found');
      }

      // Delete in the correct order to avoid foreign key constraint violations
      // 1. Delete all activities related to this project
      await this.prisma.activity.deleteMany({
        where: { projectId: id }
      });
      
      // 2. Delete all memberships related to this project
      await this.prisma.membership.deleteMany({
        where: { projectId: id }
      });
      
      // 3. Delete all tickets in the project
      await this.prisma.ticket.deleteMany({
        where: { projectId: id }
      });
      
      // 4. Finally delete the project
      return await this.prisma.project.delete({
        where: { id }
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }
}


