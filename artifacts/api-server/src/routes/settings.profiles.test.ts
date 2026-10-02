import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { emptyCatalog, type Variant } from '@workspace/profile-system';

const store = vi.hoisted(()=>({value: null as unknown}));
vi.mock('@workspace/db',()=>({
  db:{
    transaction: async (fn: (tx: unknown)=>Promise<unknown>)=>fn({
      select:()=>({from:()=>({where:()=>({for:async()=>store.value===null?[]:[{value:store.value}]})})}),
      update:()=>({set:(row:{value:unknown})=>({where:async()=>{store.value=row.value;}})}),
    }),
  },
}));
import router from './settings';
const app=express();
app.use(express.json());
app.use((req,_res,next)=>{
  const role=req.header('x-test-role') ?? '';
  req.session={isManager:!!role,isAdmin:role==='admin',
    managerPerms:role==='prices'?{prices:{canEdit:true}}:role==='products'?{products:{canEdit:true}}:{}
  } as typeof req.session;
  next();
});
app.use('/api',router);
const path='/api/settings/profile_variants/prices';
const fixture=()=>emptyCatalog().map((v,i)=>i===0?{...v,article:'TEST-EDGE-5',price:550,confirmed:true}:v);
beforeEach(()=>{store.value=fixture();});

describe('profile price editing preserves roles and classifications',()=>{
  it('requires a manager session',async()=>{expect((await request(app).patch(path).send({})).status).toBe(401);});
  it.each(['read','products'])('%s role cannot edit prices via price endpoint',async role=>{
    expect((await request(app).patch(path).set('x-test-role',role).send({})).status).toBe(403);
  });
  it('price editor can change only positive prices of confirmed variants',async()=>{
    const before=fixture(), id=before[0]!.id;
    expect((await request(app).patch(path).set('x-test-role','prices').send({[id]:777})).status).toBe(200);
    expect(store.value).toEqual(before.map(v=>v.id===id?{...v,price:777}:v));
  });
  it('admin retains price editing access',async()=>{
    expect((await request(app).patch(path).set('x-test-role','admin').send({[fixture()[0]!.id]:888})).status).toBe(200);
  });
  it.each([0,-1,'550',null])('invalid price %s does not change saved catalog',async price=>{
    const before=fixture();
    expect((await request(app).patch(path).set('x-test-role','prices').send({[before[0]!.id]:price})).status).toBe(400);
    expect(store.value).toEqual(before);
  });
  it('price editor cannot confirm an inactive article',async()=>{
    expect((await request(app).patch(path).set('x-test-role','prices').send({[fixture()[1]!.id]:600})).status).toBe(409);
    expect((store.value as Variant[])[1]!.confirmed).toBe(false);
  });
  it('unknown variant is rejected',async()=>{
    expect((await request(app).patch(path).set('x-test-role','prices').send({fake:600})).status).toBe(409);
  });
  it('no catalog is not replaced by invented defaults',async()=>{
    store.value=null;
    expect((await request(app).patch(path).set('x-test-role','prices').send({})).status).toBe(409);
    expect(store.value).toBe(null);
  });
  it('price editor cannot replace catalog or thickness mappings',async()=>{
    for(const key of ['profile_variants','panel_thicknesses'])
      expect((await request(app).put(`/api/settings/${key}`).set('x-test-role','prices').send({})).status).toBe(403);
  });
  it('price editor cannot reset catalog or thickness mappings',async()=>{
    for(const key of ['profile_variants','panel_thicknesses'])
      expect((await request(app).delete(`/api/settings/${key}`).set('x-test-role','prices')).status).toBe(403);
  });
});