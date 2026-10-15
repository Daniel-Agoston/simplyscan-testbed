import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
export default createEndpoint({
 authenticated:true,inputSchema:z.object({id:z.string().regex(/^[a-f0-9]{15}$/)}).strict(),
 execute:async({input,context})=>{
  const row=await zite.simplyscanAuditOwned.findOne({filters:{fixtureId:input.id,owner:context.user.id}});
  return {record:row?{id:row.fixtureId,owner:row.owner,auditMarker:row.auditMarker}:null};
 }
});
