import { Global, Module } from '@nestjs/common';
import { AuthzService } from './authz.service';
import { RoleGuard } from './guards/role.guard';

/**
 * Global module exposing cross-cutting authorization helpers
 * (AuthzService for service-level checks, RoleGuard for route-level checks).
 */
@Global()
@Module({
  providers: [AuthzService, RoleGuard],
  exports: [AuthzService, RoleGuard],
})
export class CommonModule {}
