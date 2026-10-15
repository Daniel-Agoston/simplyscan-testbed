import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
export default createEndpoint({
 authenticated:true,inputSchema:z.object({}).strict(),
 execute:async({context})=>({id:context.user.id})
});
