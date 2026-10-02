import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { PassThrough } from 'node:stream';
import { ZipArchive } from 'archiver';
import { emptyCatalog } from '@workspace/profile-system';

const writes=vi.hoisted(()=>({keys:[] as string[],transaction:vi.fn()}));
vi.mock('@workspace/db',()=>({db:{transaction:writes.transaction}}));
import router from './backup';
const app=express();
app.use((req,_res,next)=>{
  const role=req.header('x-test-role') ?? '';
  req.session={isManager:!!role,isAdmin:role==='admin',
    managerPerms:role==='products'?{products:{canEdit:true}}:role==='prices'?{prices:{canEdit:true}}:{}
  } as typeof req.session;
  next();
});
app.use('/api',router);
async function zip(settings: Record<string,unknown>) {
  const out=new PassThrough(), chunks:Buffer[]=[];
  const done=new Promise<Buffer>((resolve,reject)=>{
    out.on('data',c=>chunks.push(Buffer.from(c)));
    out.on('end',()=>resolve(Buffer.concat(chunks)));out.on('error',reject);
  });
  const archive=new ZipArchive({zlib:{level:1}});
  archive.on('error',e=>out.destroy(e));archive.pipe(out);
  archive.append(JSON.stringify({version:1,exportedAt:new Date().toISOString(),products:[],settings}),
    {name:'manifest.json'});
  await archive.finalize();return done;
}
beforeEach(()=>{
  writes.keys.length=0;writes.transaction.mockClear();
  writes.transaction.mockImplementation(async (fn:(tx:unknown)=>Promise<unknown>)=>fn({
    insert:()=>({values:(r:{key:string})=>({onConflictDoUpdate:async()=>{writes.keys.push(r.key);}})}),
  }));
});
describe('backup cannot bypass unified catalog permissions',()=>{
  it.each(['prices','read'])('%s cannot restore profile variants',async role=>{
    const r=await request(app).post('/api/backup/import').set('x-test-role',role)
      .set('Content-Type','application/zip').send(await zip({profile_variants:emptyCatalog()}));
    expect(r.status).toBe(403);expect(writes.transaction).not.toHaveBeenCalled();
    expect(writes.keys).toEqual([]);
  });
  it.each(['prices','read'])('%s cannot restore panel thickness mappings',async role=>{
    const r=await request(app).post('/api/backup/import').set('x-test-role',role)
      .set('Content-Type','application/zip').send(await zip({panel_thicknesses:{P:5},molding_prices:{black:999}}));
    expect(r.status).toBe(403);expect(writes.transaction).not.toHaveBeenCalled();
    expect(writes.keys).toEqual([]);
  });
  it.each(['admin','products'])('%s can restore approved catalog settings',async role=>{
    const r=await request(app).post('/api/backup/import').set('x-test-role',role)
      .set('Content-Type','application/zip').send(await zip({profile_variants:emptyCatalog(),panel_thicknesses:{P:5}}));
    expect(r.status).toBe(200);expect(writes.keys).toEqual(['profile_variants','panel_thicknesses']);
  });
  it('legacy price-only archive still works for a price editor',async()=>{
    const r=await request(app).post('/api/backup/import').set('x-test-role','prices')
      .set('Content-Type','application/zip').send(await zip({molding_prices:{black:777}}));
    expect(r.status).toBe(200);expect(writes.keys).toEqual(['molding_prices']);
  });
});