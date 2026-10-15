import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
export default createEndpoint({
 authenticated:true,inputSchema:z.object({id:z.string().regex(/^[a-f0-9]{15}$/)}).strict(),
 execute:async({input,context})=>{
  const row=await zite.simplyscanAuditOwned.findOne({filters:{fixtureId:input.id,owner:context.user.id}});
  if(!row || !/^simplyscan_[a-f0-9]{32}(?:_updated)?$/.test(row.auditMarker??''))throw new ZiteError({code:'FORBIDDEN',message:'Not a disposable owned fixture'});
  await zite.simplyscanAuditOwned.delete({id:row.id});
  return {ok:true};
 }
});
