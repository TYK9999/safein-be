import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';

import { APP_DB } from '../../database/db.provider';
import type { AccessRoleKey, AccessRoleKind, DB, SiteRole } from '../../database/schema';
import {
  buildUserPermissions,
  permissionGrantKey,
  type SiteAccess,
  type UserPermissions,
} from './permissions';

@Injectable()
export class PermissionsService {
  constructor(@Inject(APP_DB) private readonly db: Kysely<DB>) {}

  async forUser(input: {
    userId: number;
    tenantId: number;
    isPlatformAdmin: boolean;
    tenantRole: 'member' | 'tenant_admin';
  }): Promise<UserPermissions> {
    const siteRows = await this.db
      .selectFrom('user_site_membership as m')
      .innerJoin('site as s', 's.id', 'm.site_id')
      .innerJoin('role as r', 'r.id', 'm.role_id')
      .select(['m.site_id', 'r.key as role'])
      .where('m.user_id', '=', input.userId)
      .where('s.tenant_id', '=', input.tenantId)
      .where('r.scope', '=', 'site')
      .execute();

    const sites: SiteAccess[] = siteRows.map((row) => ({
      siteId: row.site_id,
      role: row.role as SiteRole,
    }));

    const keys: Array<{ kind: AccessRoleKind; key: AccessRoleKey }> = [
      { kind: 'tenant', key: input.tenantRole },
    ];
    if (input.isPlatformAdmin) {
      keys.push({ kind: 'platform', key: 'platform_admin' });
    }
    for (const site of sites) {
      keys.push({ kind: 'site', key: site.role });
    }

    const grants = await this.grantsForRoles(keys);
    return buildUserPermissions({
      tenantId: input.tenantId,
      isPlatformAdmin: input.isPlatformAdmin,
      tenantRole: input.tenantRole,
      sites,
      grants,
    });
  }

  private async grantsForRoles(
    keys: Array<{ kind: AccessRoleKind; key: AccessRoleKey }>,
  ): Promise<string[]> {
    if (keys.length === 0) return [];
    const rows = await this.db
      .selectFrom('role_permission as rp')
      .innerJoin('permission as p', 'p.id', 'rp.permission_id')
      .innerJoin('role as r', 'r.id', 'rp.role_id')
      .select(['p.resource', 'p.action'])
      .distinct()
      .where((eb) =>
        eb.or(
          keys.map((k) =>
            eb.and([
              eb('r.scope', '=', k.kind),
              eb('r.key', '=', k.key),
            ]),
          ),
        ),
      )
      .execute();
    return rows.map((row) => permissionGrantKey(row.resource, row.action));
  }
}
