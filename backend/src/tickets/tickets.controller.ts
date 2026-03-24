import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt.guard';
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
}

@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get(':id')
  get(@Param('id') id: string) {
    return this.tickets.get(id);
  }

  @Post()
  create(@Body() dto: CreateTicketDto) {
    return this.tickets.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.tickets.update(id, { ...dto });
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.tickets.delete(id);
  }
}


