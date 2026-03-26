import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, IsBoolean, IsEnum } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { InvitesService } from './invites.service';
import { MemberRole } from '@prisma/client';

class SetExpiryDto {
  @IsOptional()
  @IsString()
  expiresAt?: string | null; // ISO string or null
}

class SetEnabledDto {
  @IsBoolean()
  enabled!: boolean;
}

class SetRoleDto {
  @IsEnum(MemberRole)
  role!: MemberRole;
}

class JoinByCodeDto {
  @IsString()
  code!: string;
}

@UseGuards(JwtAuthGuard)
@Controller('invites')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Get(':projectId')
  getOrCreate(@Param('projectId') projectId: string, @Req() req: any) {
    return this.invites.getOrCreate(projectId, req.user.userId);
  }

  @Post(':projectId/regenerate')
  regenerate(@Param('projectId') projectId: string, @Req() req: any) {
    return this.invites.regenerate(projectId, req.user.userId);
  }

  @Patch(':projectId/enabled')
  setEnabled(@Param('projectId') projectId: string, @Body() dto: SetEnabledDto, @Req() req: any) {
    return this.invites.setEnabled(projectId, req.user.userId, dto.enabled);
  }

  @Patch(':projectId/expiry')
  setExpiry(@Param('projectId') projectId: string, @Body() dto: SetExpiryDto, @Req() req: any) {
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    return this.invites.setExpiry(projectId, req.user.userId, expiresAt);
  }

  @Patch(':projectId/role')
  setRole(@Param('projectId') projectId: string, @Body() dto: SetRoleDto, @Req() req: any) {
    return this.invites.setRole(projectId, req.user.userId, dto.role);
  }

  @Post('join/:token')
  joinByToken(@Param('token') token: string, @Req() req: any) {
    return this.invites.joinByToken(token, req.user.userId);
  }

  @Post('join-code')
  joinByCode(@Body() dto: JoinByCodeDto, @Req() req: any) {
    return this.invites.joinByCode(dto.code, req.user.userId);
  }
}
