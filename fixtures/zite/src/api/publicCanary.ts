import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
// Deliberate read-only plant. Only this fixed synthetic row can be returned.
export default createEndpoint({
  description: 'SimplyScan synthetic public data exposure plant',
  inputSchema: z.object({}).strict(),
  execute: async () => {
    const row = await zite.simplyscanAuditOwned.findOne({filters:{fixtureId:'simplyscan_public_canary_v1'}});
    return { records: row ? [{email:row.email, auditMarker:row.auditMarker}] : [] };
  }
});
