// Only this dedicated app's synthetic ownership fixtures are administrable.
// This third native account was verified through the live whoami endpoint.
export const FIXTURE_ADMIN_ID: string | null = 'xeA2IcDyvmeuGQbrnNBdVu864GAQxNeU';
export const NORMAL_USER_IDS = ['J6EdYWfngdpcEUdNm1NrO6UXSRsFYiPR', 'NDwafL1r0jnK6MMq1ePtQLZGmpnBhC4O'] as const;
export const SYNTHETIC_EMAIL = 'synthetic-user@example.invalid';
type Row = { fixtureId?: string; owner?: string; auditMarker?: string; email?: string };
export function isFixtureAdmin(userId: string, adminId: string | null = FIXTURE_ADMIN_ID): boolean {
 return !!adminId && !NORMAL_USER_IDS.some(id=>id===adminId) && userId===adminId;
}
export function isTestOwner(owner: string): boolean {
 return NORMAL_USER_IDS.some(id=>id===owner);
}
export function isSyntheticAuditRow(row: Row): boolean {
 return /^[a-f0-9]{15}$/.test(row.fixtureId??'')
  && /^simplyscan_[a-f0-9]{32}(?:_updated)?$/.test(row.auditMarker??'')
  && isTestOwner(row.owner??'') && row.email===SYNTHETIC_EMAIL;
}
