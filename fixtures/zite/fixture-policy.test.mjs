import test from 'node:test';
import assert from 'node:assert/strict';
import { isFixtureAdmin, isTestOwner, isSyntheticAuditRow, NORMAL_USER_IDS, SYNTHETIC_EMAIL } from './src/fixturePolicy.ts';
const row={fixtureId:'a'.repeat(15),owner:NORMAL_USER_IDS[0],auditMarker:'simplyscan_'+'b'.repeat(32),email:SYNTHETIC_EMAIL};
test('admin identity is exact, separate, and fails closed when unconfigured',()=>{
 assert.equal(isFixtureAdmin('fixture-admin','fixture-admin'),true);
 assert.equal(isFixtureAdmin('other','fixture-admin'),false);
 assert.equal(isFixtureAdmin('fixture-admin',null),false);
 for(const user of NORMAL_USER_IDS) assert.equal(isFixtureAdmin(user,user),false);
});
test('only the two established owners are in admin seed scope',()=>{
 for(const id of NORMAL_USER_IDS)assert.equal(isTestOwner(id),true);
 for(const id of ['', 'fixture-admin', NORMAL_USER_IDS[0]+'suffix'])assert.equal(isTestOwner(id),false);
});
test('both test owners and updated audit markers qualify',()=>{
 for(const owner of NORMAL_USER_IDS) for(const suffix of ['', '_updated'])
  assert.equal(isSyntheticAuditRow({...row,owner,auditMarker:row.auditMarker+suffix}),true);
});
test('admin cannot access records outside any synthetic scope boundary',()=>{
 for(const patch of [
  {fixtureId:'simplyscan_public_canary_v1'}, {fixtureId:'a'.repeat(16)},
  {fixtureId:'A'.repeat(15)}, {auditMarker:'ordinary-record'}, {auditMarker:row.auditMarker+'_extra'},
  {owner:'foreign-owner'}, {email:'another@example.invalid'},
  {fixtureId:undefined}, {owner:undefined}, {email:undefined}, {auditMarker:undefined}
 ])assert.equal(isSyntheticAuditRow({...row,...patch}),false,JSON.stringify(patch));
});
