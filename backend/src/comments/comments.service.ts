import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppGateway } from '../realtime/gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AppGateway,
    private readonly notifications: NotificationsService,
  ) {}

  async list(ticketId: string, userId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    // Only project members may read comments
    const membership = await this.prisma.membership.findUnique({
      where: { userId_projectId: { userId, projectId: ticket.projectId } },
    });
    if (!membership) throw new ForbiddenException('Not a member of this project');

    return this.prisma.comment.findMany({
      where: { ticketId },
      include: {
        author: { select: { id: true, email: true, username: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(input: { ticketId: string; content: string; authorId: string }) {
    // Get ticket to find projectId
    const ticket = await this.prisma.ticket.findUnique({ where: { id: input.ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    // Verify membership
    const membership = await this.prisma.membership.findUnique({
      where: { userId_projectId: { userId: input.authorId, projectId: ticket.projectId } },
    });
    if (!membership) throw new ForbiddenException('Not a member of this project');

    const comment = await this.prisma.comment.create({
      data: {
        ticketId: input.ticketId,
        content: input.content,
        authorId: input.authorId,
      },
      include: {
        author: { select: { id: true, email: true, username: true, name: true } },
      },
    });

    // Emit real-time event to all users viewing this project
    this.gateway.emitTicketUpdated(ticket.projectId, {
      type: 'comment_created',
      ticketId: input.ticketId,
      comment,
    });

    // Notify other project members about the new comment
    const author = comment.author?.name || comment.author?.username || 'Someone';
    await this.notifications.notifyProjectMembers(
      ticket.projectId,
      {
        type: 'comment_created',
        title: 'New comment',
        message: `${author} commented on "${ticket.title}"`,
        link: `/projects/${ticket.projectId}`,
        ticketId: ticket.id,
      },
      input.authorId,
    );

    return comment;
  }

  async delete(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { ticket: true },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) {
      throw new ForbiddenException('Can only delete your own comments');
    }

    await this.prisma.comment.delete({ where: { id: commentId } });

    this.gateway.emitTicketUpdated(comment.ticket.projectId, {
      type: 'comment_deleted',
      ticketId: comment.ticketId,
      commentId,
    });

    return { success: true };
  }
}
