import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppGateway } from '../realtime/gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AppGateway,
  ) {}

  async notifyProjectMembersIfOffline(projectId: string, message: string) {
    try {
      // Get all members of the project
      const members = await this.prisma.membership.findMany({
        where: { projectId },
        include: { user: true },
      });

      if (members.length === 0) {
        console.log(`No members found for project ${projectId} - skipping notifications`);
        return;
      }

      // Get currently connected users in this project
      const connectedUsers = this.getConnectedUsers(projectId);
      console.log(`Connected users in project ${projectId}:`, connectedUsers);

      // Find offline members (those not currently connected)
      const offlineMembers = members.filter(member => 
        !connectedUsers.includes(member.userId)
      );

      console.log(`Offline members to notify: ${offlineMembers.length}`);

      // We have removed the email subsystem, so we just log the offline members
      if (offlineMembers.length > 0) {
        console.log(`Email notifications disabled. Would have notified: ${offlineMembers.map(m => m.user.email).join(', ')}`);
      } else {
        console.log(`All members are online for project ${projectId} - no fallback needed`);
      }
    } catch (error) {
      console.error('Failed to parse notifications:', error);
    }
  }

  private getConnectedUsers(projectId: string): string[] {
    // Get all sockets in the project room
    const room = `project:${projectId}`;
    const sockets = this.gateway.server.sockets.adapter.rooms.get(room);
    
    if (!sockets) {
      return [];
    }

    // For now, we'll return empty array since we don't have user ID tracking
    // In a real implementation, you'd store user IDs when they connect
    // and map socket IDs to user IDs
    return [];
  }
}
