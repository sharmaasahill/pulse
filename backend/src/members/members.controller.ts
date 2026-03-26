import { Body, Controller, Delete, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { IsEnum } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { MembersService } from './members.service';
import { MemberRole } from '@prisma/client';

class ChangeRoleDto {
  @IsEnum(MemberRole)
  role!: MemberRole;
}

@UseGuards(JwtAuthGuard)
@Controller('members')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get(':projectId')
  list(@Param('projectId') projectId: string) {
    return this.members.list(projectId);
  }

  @Patch(':id/role')
  changeRole(@Param('id') id: string, @Body() dto: ChangeRoleDto, @Req() req: any) {
    return this.members.changeRole(id, dto.role, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.members.remove(id, req.user.userId);
  }

  @Delete(':projectId/leave')
  leave(@Param('projectId') projectId: string, @Req() req: any) {
    return this.members.leave(projectId, req.user.userId);
  }
}
