import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ProjectsService } from './projects.service';

class CreateProjectDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;
  
  @IsOptional()
  @IsString()
  description?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(@Req() req: any) {
    return this.projects.list(req.user.userId);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateProjectDto) {
    return this.projects.create({ ...dto, ownerId: req.user.userId });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.projects.getById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projects.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    try {
      const result = await this.projects.delete(id);
      return { success: true, data: result };
    } catch (error) {
      console.error('Delete project error:', error);
      throw error;
    }
  }
}
