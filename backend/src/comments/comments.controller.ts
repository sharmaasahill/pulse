import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CommentsService } from './comments.service';

class CreateCommentDto {
  @IsString()
  ticketId!: string;

  @IsString()
  content!: string;
}

@UseGuards(JwtAuthGuard)
@Controller('comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get(':ticketId')
  list(@Param('ticketId') ticketId: string) {
    return this.comments.list(ticketId);
  }

  @Post()
  create(@Body() dto: CreateCommentDto, @Req() req: any) {
    return this.comments.create({ ...dto, authorId: req.user.userId });
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.comments.delete(id, req.user.userId);
  }
}
