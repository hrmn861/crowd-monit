import test from 'node:test';
import assert from 'node:assert/strict';

function checkRolePermission(userRole: string | null | undefined, allowedRoles: string[]): boolean {
  if (!userRole) return false;
  const normalizedUserRole = userRole.trim().toUpperCase();
  const normalizedAllowed = allowedRoles.map((r) => r.trim().toUpperCase());
  return normalizedAllowed.includes(normalizedUserRole);
}

test('RBAC: Admin has clearance for admin-only modules', () => {
  assert.equal(checkRolePermission('ADMIN', ['ADMIN']), true);
  assert.equal(checkRolePermission('admin', ['ADMIN']), true);
  assert.equal(checkRolePermission('OPERATOR', ['ADMIN']), false);
  assert.equal(checkRolePermission('ANALYST', ['ADMIN']), false);
  assert.equal(checkRolePermission(null, ['ADMIN']), false);
});

test('RBAC: Operator and Admin have clearance for operational control', () => {
  const opRoles = ['ADMIN', 'OPERATOR'];
  assert.equal(checkRolePermission('ADMIN', opRoles), true);
  assert.equal(checkRolePermission('OPERATOR', opRoles), true);
  assert.equal(checkRolePermission('operator', opRoles), true);
  assert.equal(checkRolePermission('ANALYST', opRoles), false);
});

test('RBAC: Analyst and Admin have clearance for telemetry & evaluation', () => {
  const analystRoles = ['ADMIN', 'ANALYST'];
  assert.equal(checkRolePermission('ADMIN', analystRoles), true);
  assert.equal(checkRolePermission('ANALYST', analystRoles), true);
  assert.equal(checkRolePermission('OPERATOR', analystRoles), false);
});
