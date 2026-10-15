// Native WeWeb audit fixtures, confined to a dedicated synthetic-data table.
// These use an explicit audit request contract (id + data), not a general CRUD
// form: server bindings whitelist fields and enforce the disposable marker.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
export const projectId = '7f3938b0-c436-468b-ae2b-cdf05cf231fc';
export const table = 'simplyscan_audit_owned';
export const users = {
  admin: '01a141b3-bc98-73f0-b4dc-4c0542015d69',
  owner: '01a141b3-a766-7df3-b8b8-69e4c421dfee',
  other: '01a141b3-b373-7e64-a44f-57331032b39b',
};
const binding = code => ({ __wwtype: 'js', code });
const action = (id, type, next, properties) => ({ id, type, name: id, __wwdescription: id, next, ...properties });
export function workflow(operation) {
  const writesData = ['create', 'update'].includes(operation);
  const methods = { read: 'GET', create: 'POST', update: 'PATCH', delete: 'DELETE' };
  if (!methods[operation]) throw new Error('Unsupported operation');
  const guard = `// Only dedicated test users and disposable fixture identifiers are accepted.
const userId = context.auth?.user?.id;
const admin = userId === ${JSON.stringify(users.admin)};
const permittedUser = ${JSON.stringify(Object.values(users))}.includes(userId);
const validId = typeof context.parameters.id === 'string' && /^[a-f0-9]{15}$/.test(context.parameters.id);
${writesData ? `const data = context.parameters.data;
const validData = data && typeof data === 'object' && !Array.isArray(data)
  && Object.keys(data).length === 2 && Object.hasOwn(data, 'owner') && Object.hasOwn(data, 'auditMarker')
  && ${JSON.stringify([users.owner, users.other])}.includes(data.owner)
  && typeof data.auditMarker === 'string' && /^simplyscan_[a-f0-9]{32}(?:_updated)?$/.test(data.auditMarker);
return !!(context.auth?.isAuthenticated && permittedUser && validId && validData && (admin || data.owner === userId));`
    : 'return !!(context.auth?.isAuthenticated && permittedUser && validId);'}`;
  const filters = binding(`// Both the requested fixture and native authenticated owner constrain the query.
const conditions = [{field:'fixtureId',operator:'$eq',value:context.parameters.id}];
if (context.auth.user.id !== ${JSON.stringify(users.admin)}) conditions.push({field:'owner',operator:'$eq',value:context.auth.user.id});
${operation === 'delete' ? "conditions.push({field:'auditMarker',operator:'$match',value:'^simplyscan_[a-f0-9]{32}(_updated)?$'});" : ''}
return {link:'$and',conditions};`);
  const fields = {
    owner: binding('return context.parameters.data.owner;'),
    auditMarker: binding('return context.parameters.data.auditMarker;'),
  };
  let database;
  if (operation === 'read') database = { tableName: table, columns: {fixtureId:true,owner:true,auditMarker:true}, formulaColumns:{}, filters, limit:1, offset:0,count:false };
  if (operation === 'create') database = { tableName:table, mode:'single',data:{fixtureId:binding('return context.parameters.id;'),...fields},columns:['fixtureId','owner','auditMarker'],returnData:true,upsert:false };
  if (operation === 'update') database = { tableName:table,updateMode:'by-filters',filters,data:{auditMarker:fields.auditMarker},columns:['auditMarker'],returnData:true };
  if (operation === 'delete') database = { tableName:table,deleteMode:'by-filters',filters,returnData:true };
  const rowExpression = operation === 'read' ? 'context.workflow.database.result.data[0]' : 'context.workflow.database.result[0]';
  return {
    projectId,name:`SimplyScan audit ${operation}`,description:'Dedicated synthetic ownership audit; never a production-data endpoint',
    // WeWeb prefixes paths with /api and passes named body parameters directly.
    type:'api',meta:{path:`/simplyscan-audit/${operation}`,method:'POST',security:{accessRule:'authenticated'}},
    parameters:[{name:'id',type:'string',required:true},...(writesData?[{name:'data',type:'object',required:true}]:[])],
    firstAction:'guard',actions:{
      guard:action('guard','if',null,{value:binding(guard),branches:[{value:true,id:'database'},{value:false,id:'denied'}]}),
      denied:action('denied','return-response',null,{args:{status:403,contentType:'application/json',body:{error:'Forbidden'}}}),
      database:action('database',`table-${operation==='read'?'select':operation==='create'?'insert':operation}`,'response',database),
      response:action('response','return-response',null,{args:{status:binding(operation==='read'?'return 200;':`return ${rowExpression} ? 200 : 403;`),contentType:'application/json',body:binding(`const row = ${rowExpression}; return {record: row ? {id:row.fixtureId,owner:row.owner,auditMarker:row.auditMarker} : null};`)}}),
    },
  };
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const directory=join(fileURLToPath(new URL('.',import.meta.url)),'workflows');
  await mkdir(directory,{recursive:true});
  for(const op of ['read','create','update','delete']) await writeFile(join(directory,`${op}.json`),JSON.stringify(workflow(op),null,2)+'\n');
  console.log('Generated four bounded native WeWeb audit workflows.');
}
