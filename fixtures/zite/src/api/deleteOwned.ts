import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { isFixtureAdmin, isSyntheticAuditRow } from '../fixturePolicy';
const inputSchema=z.object({id:z.string().regex(/^[a-f0-9]{15}$/)}).strict();
export default createEndpoint({
 authenticated:true,inputSchema,
 execute:async({input,context})=>{
  const parsed=inputSchema.safeParse(input);
  if(!parsed.success)throw new ZiteError({code:'BAD_REQUEST',message:'Invalid fixture input'});
  input=parsed.data;
  const admin=isFixtureAdmin(context.user.id);
  const row=await zite.simplyscanAuditOwned.findOne({filters:admin?{fixtureId:input.id}:{fixtureId:input.id,owner:context.user.id}});
  if(!row || (admin?!isSyntheticAuditRow(row):!/^simplyscan_[a-f0-9]{32}(?:_updated)?$/.test(row.auditMarker??'')))throw new ZiteError({code:'FORBIDDEN',message:'Not a disposable owned fixture'});
  await zite.simplyscanAuditOwned.delete({id:row.id});
  return {ok:true};
 }
});
