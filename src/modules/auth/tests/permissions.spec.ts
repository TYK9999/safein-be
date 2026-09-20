import {
  buildUserPermissions,
  rankPrimaryRole,
} from '../permissions';
import { resolveDataScope } from '../access-scope';

describe('rankPrimaryRole', () => {
  it('prefers platform admin over every membership', () => {
    expect(
      rankPrimaryRole({
        isPlatformAdmin: true,
        tenantRole: 'member',
        siteRoles: ['worker'],
      }),
    ).toBe('platform_admin');
  });

  it('uses tenant_admin before site jobs', () => {
    expect(
      rankPrimaryRole({
        isPlatformAdmin: false,
        tenantRole: 'tenant_admin',
        siteRoles: ['supervisor'],
      }),
    ).toBe('tenant_admin');
  });

  it('picks the highest site role', () => {
    expect(
      rankPrimaryRole({
        isPlatformAdmin: false,
        tenantRole: 'member',
        siteRoles: ['worker', 'site_manager', 'supervisor'],
      }),
    ).toBe('site_manager');
  });

  it('falls back to member with no site job', () => {
    expect(
      rankPrimaryRole({
        isPlatformAdmin: false,
        tenantRole: 'member',
        siteRoles: [],
      }),
    ).toBe('member');
  });
});

describe('resolveDataScope', () => {
  it('gives platform scope to SafeIn5 admin', () => {
    expect(
      resolveDataScope({
        isPlatformAdmin: true,
        tenantId: 2,
        tenantRole: 'member',
        sites: [{ siteId: 1, role: 'supervisor' }],
      }),
    ).toEqual({ kind: 'platform' });
  });

  it('gives tenant scope to client admin', () => {
    expect(
      resolveDataScope({
        isPlatformAdmin: false,
        tenantId: 2,
        tenantRole: 'tenant_admin',
        sites: [{ siteId: 1, role: 'supervisor' }],
      }),
    ).toEqual({ kind: 'tenant', tenantId: 2 });
  });

  it('gives site scope to supervisors and managers', () => {
    expect(
      resolveDataScope({
        isPlatformAdmin: false,
        tenantId: 2,
        tenantRole: 'member',
        sites: [
          { siteId: 4, role: 'supervisor' },
          { siteId: 9, role: 'worker' },
        ],
      }),
    ).toEqual({ kind: 'site', tenantId: 2, siteIds: [4, 9] });
  });
});

describe('buildUserPermissions', () => {
  it('maps nav slugs and landing for a supervisor', () => {
    const permissions = buildUserPermissions({
      tenantId: 2,
      isPlatformAdmin: false,
      tenantRole: 'member',
      sites: [{ siteId: 4, role: 'supervisor' }],
      grants: [
        'nav.queue',
        'nav.jobs',
        'nav.sites',
        'echoes.confirm',
        'tasks.view',
      ],
    });
    expect(permissions.primaryRole).toBe('supervisor');
    expect(permissions.land).toBe('queue');
    expect(permissions.dataScope).toEqual({
      kind: 'site',
      tenantId: 2,
      siteIds: [4],
    });
    expect(permissions.can['echoes.confirm']).toBe(true);
    expect(permissions.can['tasks.create']).toBeUndefined();
    expect(permissions.allow).toEqual(
      expect.arrayContaining(['queue', 'jobs', 'sites']),
    );
    expect(permissions.nav).toEqual(
      expect.arrayContaining(['sites', 'jobs', 'queue']),
    );
  });

  it('treats users/tenants nav as onboarding', () => {
    const permissions = buildUserPermissions({
      tenantId: 1,
      isPlatformAdmin: true,
      tenantRole: 'tenant_admin',
      sites: [],
      grants: ['nav.clients', 'nav.users'],
    });
    expect(permissions.allow).toEqual(
      expect.arrayContaining(['tenants', 'users', 'onboarding']),
    );
  });
});
