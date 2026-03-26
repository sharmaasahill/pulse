import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ActivitiesService } from './activities.service';

@UseGuards(JwtAuthGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get('notifications')
  getNotifications(@Request() req: any) {
    return this.activities.getNotifications(req.user.id);
  }

  @Get(':projectId')
  list(@Param('projectId') projectId: string) {
    return this.activities.listRecent(projectId);
  }
}


