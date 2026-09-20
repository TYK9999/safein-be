import type { DataScope } from './access-scope';
import { resolveDataScope } from './access-scope';
import type { SiteRole, TenantRole } from '../../database/schema';

export const SITE_ROLE_RANK: Record<SiteRole, number> = {
  worker: 1,
  supervisor: 2,
  site_manager: 3,
};

export type PrimaryAccessRole =
  | 'platform_admin'
  | 'tenant_admin'
  | 'site_manager'
  | 'supervisor'
  | 'worker'
  | 'member';

export interface SiteAccess {
  siteId: number;
  role: SiteRole;
}

export interface UserPermissions {
  /** Highest role for the React app (nav + landing). */
  primaryRole: PrimaryAccessRole;
  isPlatformAdmin: boolean;
  tenantRole: TenantRole;
  /** Row-level filter: platform (all), tenant (+ shared library), or assigned sites. */
  dataScope: DataScope;
  sites: SiteAccess[];
  /** Section keys matching docs/index.html ROLES.nav / allow. */
  nav: string[];
  allow: string[];
  land: string;
  /** Flat map: `if (permissions.can['tasks.create'])`. */
  can: Record<string, true>;
  /** Same keys as `can`, for `.includes()`. */
  grants: string[];
}

const NAV_FROM_SLUG: Record<string, string> = {
  'nav.clients': 'tenants',
  'nav.users': 'users',
  'nav.setup': 'setup',
  'nav.sites': 'sites',
  'nav.spaces': 'spaces',
  'nav.jobs': 'jobs',
  'nav.queue': 'queue',
  'nav.analytics': 'analytics',
  'nav.content': 'content',
  'nav.docs': 'docs',
};

const LANDING: Record<PrimaryAccessRole, string> = {
  platform_admin: 'setup-client',
  tenant_admin: 'jobs',
  site_manager: 'jobs',
  supervisor: 'queue',
  worker: 'queue',
  member: 'users',
};

const NAV_ORDER = [
  'onboarding',
  'docs',
  'content',
  'sites',
  'jobs',
  'queue',
  'analytics',
  'users',
  'spaces',
  'setup',
  'tenants',
];

export function rankPrimaryRole(input: {
  isPlatformAdmin: boolean;
  tenantRole: TenantRole;
  siteRoles: SiteRole[];
}): PrimaryAccessRole {
  if (input.isPlatformAdmin) return 'platform_admin';
  if (input.tenantRole === 'tenant_admin') return 'tenant_admin';
  let best: SiteRole | null = null;
  for (const role of input.siteRoles) {
    if (!best || SITE_ROLE_RANK[role] > SITE_ROLE_RANK[best]) best = role;
  }
  if (best === 'site_manager') return 'site_manager';
  if (best === 'supervisor') return 'supervisor';
  if (best === 'worker') return 'worker';
  return 'member';
}

export function permissionGrantKey(resource: string, action: string): string {
  return `${resource}.${action}`;
}

export function grantsToCan(grants: string[]): Record<string, true> {
  const can: Record<string, true> = {};
  for (const grant of grants) can[grant] = true;
  return can;
}

export function buildUserPermissions(input: {
  tenantId: number;
  isPlatformAdmin: boolean;
  tenantRole: TenantRole;
  sites: SiteAccess[];
  grants: string[];
}): UserPermissions {
  const grants = [...new Set(input.grants)].sort();
  const primaryRole = rankPrimaryRole({
    isPlatformAdmin: input.isPlatformAdmin,
    tenantRole: input.tenantRole,
    siteRoles: input.sites.map((s) => s.role),
  });
  const allowSet = new Set<string>();
  for (const grant of grants) {
    const section = NAV_FROM_SLUG[grant];
    if (section) allowSet.add(section);
  }
  if (allowSet.has('users') || allowSet.has('tenants')) {
    allowSet.add('onboarding');
  }
  const allow = [...allowSet];
  const nav = NAV_ORDER.filter((key) => allowSet.has(key));
  const dataScope = resolveDataScope({
    isPlatformAdmin: input.isPlatformAdmin,
    tenantId: input.tenantId,
    tenantRole: input.tenantRole,
    sites: input.sites,
  });
  return {
    primaryRole,
    isPlatformAdmin: input.isPlatformAdmin,
    tenantRole: input.tenantRole,
    dataScope,
    sites: input.sites,
    nav,
    allow,
    land: LANDING[primaryRole],
    can: grantsToCan(grants),
    grants,
  };
}
