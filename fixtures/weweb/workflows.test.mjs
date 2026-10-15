import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workflow, users } from './build-workflows.mjs';
const id='a123456789abcde';
const marker='simplyscan_'+'a'.repeat(32);
const evaluate=(binding,context)=>new Function('context',binding.code)(context);
const context=(actor,data={owner:users.owner,auditMarker:marker})=>({auth:{isAuthenticated:actor!==null,user:actor?{id:users[actor]??actor}:undefined},parameters:{id,data}});
for(const op of ['read','create','update','delete']) {
 test(`${op}: anonymous and unrelated users denied`,()=>{
  const guard=workflow(op).actions.guard.value;
  assert.equal(evaluate(guard,context(null)),false);
  assert.equal(evaluate(guard,context('unrelated-user')),false);
  assert.equal(evaluate(guard,context('owner')),true);
  assert.equal(evaluate(guard,{...context('owner'),parameters:{id:'../all',data:{owner:users.owner,auditMarker:marker}}}),false);
 });
}
for(const op of ['create','update']) {
 test(`${op}: immutable owner, exact data shape, synthetic markers`,()=>{
  const guard=workflow(op).actions.guard.value;
  assert.equal(evaluate(guard,context('owner',{owner:users.other,auditMarker:marker})),false);
  assert.equal(evaluate(guard,context('other')),false);
  assert.equal(evaluate(guard,context('other',{owner:users.other,auditMarker:marker})),true);
  assert.equal(evaluate(guard,context('admin')),true);
  assert.equal(evaluate(guard,context('owner',{owner:users.owner,auditMarker:'real-record'})),false);
  assert.equal(evaluate(guard,context('owner',{owner:users.owner,auditMarker:marker,extra:true})),false);
 });
}
for(const op of ['read','update','delete']) {
 test(`${op}: server-side filters never trust a caller-supplied owner`,()=>{
  const w=workflow(op), filters=evaluate(w.actions.database.filters,context('other'));
  assert.ok(filters.conditions.some(c=>c.field==='fixtureId'&&c.value===id));
  assert.ok(filters.conditions.some(c=>c.field==='owner'&&c.value===users.other));
  if(op==='update')assert.deepEqual(w.actions.database.columns,['auditMarker']);
  if(op==='delete')assert.ok(filters.conditions.some(c=>c.field==='auditMarker'&&c.operator==='$match'));
 });
}
