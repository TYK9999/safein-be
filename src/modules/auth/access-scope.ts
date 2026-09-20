import type { SiteRole, TenantRole } from '../../database/schema';
import type { SiteAccess } from './permissions';

/**
 * How API queries filter rows. Enforced in services; also returned on login so
 * the React app knows what tenant / site context to send.
 *
 * Shared library rows (tenant_id IS NULL on document, content_pack, …) are
 * readable by every non-platform role in addition to the rules below.
 */
export type DataScope =
  | { kind: 'platform' }
  | { kind: 'tenant'; tenantId: number }
  | { kind: 'site'; tenantId: number; siteIds: number[] };

export function resolveDataScope(input: {
  isPlatformAdmin: boolean;
  tenantId: number;
  tenantRole: TenantRole;
  sites: SiteAccess[];
}): DataScope {
  if (input.isPlatformAdmin) return { kind: 'platform' };
  if (input.tenantRole === 'tenant_admin') {
    return { kind: 'tenant', tenantId: input.tenantId };
  }
  return {
    kind: 'site',
    tenantId: input.tenantId,
    siteIds: input.sites.map((s) => s.siteId),
  };
}

/** Site-scoped roles that only see assigned sites (not whole-tenant data). */
export function isSiteScopedRole(
  tenantRole: TenantRole,
  siteRoles: SiteRole[],
): boolean {
  return tenantRole !== 'tenant_admin' && siteRoles.length > 0;
}
