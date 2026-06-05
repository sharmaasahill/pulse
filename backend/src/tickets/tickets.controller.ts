import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, Req } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RoleGuard, RequireRole } from '../common/guards/role.guard';
import { TicketsService } from './tickets.service';
import { Prisma } from '@prisma/client';

class CreateTicketDto {
  @IsString()
  projectId!: string;
  @IsString()
  title!: string;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  @IsString()
  authorEmail?: string;
  @IsOptional()
  @IsString()
  assigneeId?: string;
  @IsOptional()
  priority?: Prisma.TicketCreateInput['priority'];
  @IsOptional()
  status?: Prisma.TicketCreateInput['status'];
}

class UpdateTicketDto {
  @IsOptional()
  status?: Prisma.TicketUncheckedUpdateInput['status'];
  @IsOptional()
  priority?: Prisma.TicketUncheckedUpdateInput['priority'];
  @IsOptional()
  @IsString()
  title?: string;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  assigneeId?: string | null;
}

@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get(':id')
  get(@Req() req: any, @Param('id') id: string) {
    return this.tickets.get(id, req.user.userId);
  }

  // projectId is in the body, so RoleGuard can enforce EDITOR+ here.
  @Post()
  @RequireRole('EDITOR')
  create(@Req() req: any, @Body() dto: CreateTicketDto) {
    return this.tickets.create({ ...dto, authorId: req.user.userId });
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.tickets.update(id, { ...dto, actorId: req.user.userId });
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.tickets.delete(id, req.user.userId);
  }
}
