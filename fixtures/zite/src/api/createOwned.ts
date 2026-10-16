import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { isFixtureAdmin, isTestOwner, SYNTHETIC_EMAIL } from '../fixturePolicy';
const inputSchema=z.object({id:z.string().regex(/^[a-f0-9]{15}$/),data:z.object({owner:z.string(),auditMarker:z.string().regex(/^simplyscan_[a-f0-9]{32}(?:_updated)?$/)}).strict()}).strict();
export default createEndpoint({
 authenticated:true,inputSchema,
 execute:async({input,context})=>{
  const parsed=inputSchema.safeParse(input);
  if(!parsed.success)throw new ZiteError({code:'BAD_REQUEST',message:'Invalid fixture input'});
  input=parsed.data;
  const admin=isFixtureAdmin(context.user.id);
  if(admin?!isTestOwner(input.data.owner):input.data.owner!==context.user.id)throw new ZiteError({code:'FORBIDDEN',message:'Owner mismatch'});
  const existing=await zite.simplyscanAuditOwned.findOne({filters:{fixtureId:input.id}});
  if(existing)throw new ZiteError({code:'FORBIDDEN',message:'Fixture exists'});
  await zite.simplyscanAuditOwned.create({record:{fixtureId:input.id,owner:input.data.owner,auditMarker:input.data.auditMarker,email:SYNTHETIC_EMAIL}});
  return {ok:true};
 }
});
