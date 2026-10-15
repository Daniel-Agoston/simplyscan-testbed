import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
export default createEndpoint({
 authenticated:true,inputSchema:z.object({id:z.string().regex(/^[a-f0-9]{15}$/),data:z.object({owner:z.string(),auditMarker:z.string().regex(/^simplyscan_[a-f0-9]{32}(?:_updated)?$/)}).strict()}).strict(),
 execute:async({input,context})=>{
  if(input.data.owner!==context.user.id)throw new ZiteError({code:'FORBIDDEN',message:'Ownership is immutable'});
  const row=await zite.simplyscanAuditOwned.findOne({filters:{fixtureId:input.id,owner:context.user.id}});
  if(!row)throw new ZiteError({code:'FORBIDDEN',message:'Not your fixture'});
  await zite.simplyscanAuditOwned.update({id:row.id,record:{auditMarker:input.data.auditMarker}});
  return {ok:true};
 }
});
