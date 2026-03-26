import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  log(params: { projectId: string; ticketId?: string; actorId: string; message: string; type: string }) {
    return this.prisma.activity.create({ data: params });
  }

  listRecent(projectId: string) {
    return this.prisma.activity.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        actor: { select: { id: true, name: true, email: true } }
      }
    });
  }

  async getNotifications(userId: string) {
    const members = await this.prisma.membership.findMany({
      where: { userId }, select: { projectId: true }
    });
    const projectIds = members.map(m => m.projectId);

    if (!projectIds.length) return [];

    return this.prisma.activity.findMany({
      where: {
        projectId: { in: projectIds },
        actorId: { not: userId }
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        actor: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } }
      }
    });
  }
}


