import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyCatalog, validateCatalog, validatePanelThicknesses, styleVariant, collectInstalledRuns,
  profileQuote, packInstalledRuns, automaticRowSeams, type ProfileSurface, type InstalledRun, type ProfileInput } from './index.ts';

const panel = {id:'p',article:'P',panelWidthMm:1220,panelHeightMm:2800};
const surface = (patch: Partial<ProfileSurface> = {}): ProfileSurface => ({
  panelCount:2,dividerPositions:[.5],sectorMaterials:{0:panel,1:panel},
  moldingStyle:'black',hMoldingStyle:'none',hMoldingPositions:[],
  wallWidthMm:1000,wallHeightMm:1800,...patch,
});
const input = (surfaces=[surface()], patch: Partial<ProfileInput> = {}): ProfileInput =>
  ({thickness:5,zone:'wall',surfaces,...patch});
const catalog = () => emptyCatalog().map((v,i)=>({...v,article:`TEST-${i}`,price:100+i,confirmed:true}));
const run = (id: string,lengthMm: number,patch: Partial<InstalledRun> = {}): InstalledRun => ({
  id,variantId:'connector:black:5',surface:0,purpose:'joint',from:{x:0,y:0},to:{x:0,y:1},
  lengthMm,intersectionsMm:[],...patch,
});

test('20 fixed variants; 10 per thickness; no prices/articles invented',()=>{
  const c=emptyCatalog();
  assert.equal(c.length,20);assert.equal(c.filter(v=>v.thicknessMm===5).length,10);
  assert.ok(c.every(v=>v.article===''&&v.price===null&&!v.confirmed&&v.lengthMm===3000));
  assert.equal(c.filter(v=>v.kind==='edge').length,2);
  assert.ok(c.filter(v=>v.kind==='edge'||v.kind==='light').every(v=>v.color==='black'));
  assert.ok(validateCatalog(c));assert.ok(validateCatalog(catalog()));
});
test('immutable characteristics and positive prices validated',()=>{
  for(const patch of [{lengthMm:2000},{kind:'decor'},{color:'white'},{thicknessMm:6},{confirmed:true},
    {price:0},{price:Infinity},{name:''},{extra:true}]) {
    const c=emptyCatalog();Object.assign(c[0]!,patch);assert.equal(validateCatalog(c),false);
  }
  assert.equal(validateCatalog(emptyCatalog().slice(1)),false);
});
test('confirmed articles cannot accidentally be reused across different variants',()=>{
  const c=catalog();c[1]!.article=c[0]!.article;assert.equal(validateCatalog(c),false);
});
test('thickness is explicit metadata, never inferred from article suffix',()=>{
  assert.ok(validatePanelThicknesses({'123-25':5,'456-8':8}));
  assert.equal(validatePanelThicknesses({'123-25':2.5}),false);
  assert.equal(validatePanelThicknesses([]),false);
});
test('legacy aliases preserve type, disallowed light/end colors fail explicitly',()=>{
  assert.equal(styleVariant('gap',8),'gap:black:8');
  assert.equal(styleVariant('light',5),'light:black:5');
  assert.equal(styleVariant('edge',8),'edge:black:8');
  assert.equal(styleVariant('gold',5),'connector:gold:5');
  assert.throws(()=>styleVariant('edge_gold',5));assert.throws(()=>styleVariant('gold_light',5));
  assert.equal(styleVariant('none',5),null);
});
test('only internal joins; no phantom connectors at external edges',()=>{
  const r=collectInstalledRuns(input());assert.equal(r.length,1);
  assert.equal(r[0]!.from.x,.5);assert.equal(r[0]!.lengthMm,1800);
});
test('end profiles on every configured surface have independent physical dimensions',()=>{
  const a=surface({moldingStyle:'none',edgeProfileSides:{top:true,bottom:true,left:false,right:false}});
  const b=surface({moldingStyle:'none',wallWidthMm:800,edgeProfileSides:{top:false,bottom:false,left:true,right:false}});
  const r=collectInstalledRuns(input([a,b]));
  assert.deepEqual(r.map(r=>r.lengthMm),[1000,1000,1800]);
  assert.ok(r.every(r=>r.variantId==='edge:black:5'));
});
test('one excluded neighbor prevents EVERY automatic connector color and type',()=>{
  for(const style of ['black','gold','metallic','bronze','gold_gap','black_light']) {
    for(const excluded of [{noMetallicProfile:true},{slatOverlay:true},{textureStretch:true}]) {
      const r=collectInstalledRuns(input([surface({moldingStyle:style,sectorMaterials:{0:{...panel,...excluded},1:panel}})]));
      assert.equal(r.length,0,style);
    }
  }
});
test('individual override none removes a join; gold-gap overrides exactly one',()=>{
  assert.equal(collectInstalledRuns(input([surface({dividerStyleOverrides:{0:'none'}})])).length,0);
  assert.equal(collectInstalledRuns(input([surface({dividerStyleOverrides:{0:'gold_gap'}})]))[0]!.variantId,'gap:gold:5');
});
test('horizontal joins split only at excluded material, not arbitrary intersections',()=>{
  const r=collectInstalledRuns(input([surface({moldingStyle:'none',hMoldingStyle:'black',
    hMoldingPositions:[.5],sectorMaterials:{0:panel,1:{...panel,noMetallicProfile:true}}})]));
  assert.equal(r.length,1);assert.equal(r[0]!.lengthMm,500);
});
test('horizontal panel layout maps dividers along the same axis as rendering',()=>{
  const r=collectInstalledRuns(input([surface({panelOrientation:'horizontal',wallHeightMm:1000})]));
  assert.equal(r.length,1);assert.deepEqual(r[0]!.from,{x:0,y:.5});
  assert.deepEqual(r[0]!.to,{x:1,y:.5});assert.equal(r[0]!.lengthMm,1000);
});
test('disabled row seams are absent; no fallback profile when none is selected',()=>{
  const r=collectInstalledRuns(input([surface({moldingStyle:'none',wallHeightMm:4200})]));
  assert.equal(r.length,0);
});
test('windows and doors use only selected top/bottom end abutments; no automatic perimeter',()=>{
  for(const zone of ['window','door']) {
    const s=surface({moldingStyle:'none',edgeProfileSides:{top:false,bottom:true,left:true,right:true}});
    const r=collectInstalledRuns(input([s],{zone}));assert.equal(r.length,1);
    assert.equal(r[0]!.purpose,'edge');assert.equal(r[0]!.lengthMm,1000);
  }
});
test('door/window internal material joins still exist',()=>{
  for(const zone of ['window','door']) assert.equal(collectInstalledRuns(input([surface()],{zone})).length,1);
});
test('manual decorative use retains existing type, length uses wall dimensions',()=>{
  const r=collectInstalledRuns(input([surface({moldingStyle:'none'})],{
    decorations:[{id:'d',surface:0,style:'edge_black',from:{x:0,y:.5},to:{x:1,y:.5}}],
  }));
  assert.equal(r[0]!.purpose,'decor');assert.equal(r[0]!.variantId,'edge:black:5');assert.equal(r[0]!.lengthMm,1000);
});
test('reverse endpoints cannot double-count a physical run',()=>{
  const r=collectInstalledRuns(input([surface()],{decorations:[
    {id:'d',surface:0,style:'black',from:{x:.5,y:1},to:{x:.5,y:0}},
  ]}));
  assert.equal(r.length,1);
});
test('incompatible overlapping profiles fail, not silently double-counted',()=>{
  assert.throws(()=>collectInstalledRuns(input([surface()],{decorations:[
    {id:'d',surface:0,style:'gold',from:{x:.5,y:0},to:{x:.5,y:1}},
  ]})),/разные профили/);
});
test('TV only enabled sides and measured dimensions; joints covered by light counted once',()=>{
  const s=surface({moldingStyle:'none'});
  const r=collectInstalledRuns(input([s],{zone:'tv',boxJoints:{surface:0,style:'black'},
    tv:{surface:0,widthMm:1000,heightMm:1800,edges:[true,false,true,false]}}));
  assert.equal(r.length,4);assert.equal(r.filter(r=>r.purpose==='tv').length,2);
  assert.deepEqual(r.filter(r=>r.purpose==='tv').map(r=>r.lengthMm),[1000,1000]);
  assert.ok(r.filter(r=>r.purpose==='tv').every(r=>r.variantId==='light:black:5'));
});
test('crossings only within same physical surface and do not automatically split runs',()=>{
  const a=surface({hMoldingStyle:'black',hMoldingPositions:[.5]});
  const r=collectInstalledRuns(input([a]));
  assert.equal(r.length,2);assert.ok(r.every(r=>r.intersectionsMm.length===1));
  assert.equal(packInstalledRuns(r).length,1);
  const different=collectInstalledRuns(input([surface(),surface({moldingStyle:'none',hMoldingStyle:'black',hMoldingPositions:[.5]})],{zone:'window'}));
  assert.ok(different.every(r=>r.intersectionsMm.length===0));
});
test('box corner joins exclude wood-facing segments for all colors; TV light is never double counted',()=>{
  const s=surface({moldingStyle:'none',sectorMaterials:{0:panel,1:{...panel,textureStretch:true}}});
  for(const style of ['black','gold','bronze','metallic']) {
    const r=collectInstalledRuns(input([s],{zone:'tv',boxJoints:{surface:0,style}}));
    assert.equal(r.length,3);
    assert.deepEqual(r.map(r=>r.lengthMm).sort((a,b)=>a-b),[500,500,1800]);
  }
  const r=collectInstalledRuns(input([s],{zone:'tv',boxJoints:{surface:0,style:'black'},
    tv:{surface:0,widthMm:1000,heightMm:1800,edges:[true,true,true,true]}}));
  assert.equal(r.length,4);assert.ok(r.every(r=>r.purpose==='tv'));
});
test('hidden column construction is part of the SAME list and quote',()=>{
  const r=collectInstalledRuns(input([surface()],{zone:'column',hiddenColumn:{perimeterMm:6000,heightMm:4200},defaultPanel:panel}));
  assert.ok(r.some(r=>r.hidden));
  const q=profileQuote(r,catalog());assert.equal(q.reduce((n,g)=>n+g.runs.length,0),r.length);
});
test('no hidden forced column profiles when disabled',()=>{
  const r=collectInstalledRuns(input([surface({moldingStyle:'none'})],{zone:'column',hiddenColumn:{perimeterMm:6000,heightMm:4200}}));
  assert.equal(r.length,0);
});
test('2 × 1.8m needs 2 stock bars; 3 × 1.8m needs 3',()=>{
  assert.equal(packInstalledRuns([run('a',1800),run('b',1800)]).length,2);
  assert.equal(packInstalledRuns([run('a',1800),run('b',1800),run('c',1800)]).length,3);
});
test('2.4m cannot be assembled from arbitrary scraps',()=>{
  const bars=packInstalledRuns([run('a',1800),run('b',1800),run('c',2400)]);
  assert.equal(bars.length,3);
  assert.equal(bars.flatMap(b=>b.pieces).filter(p=>p.runId==='c').length,1);
});
test('4.2m needs continuation, compatible offcut can be reused',()=>{
  const bars=packInstalledRuns([run('a',4200),run('b',1800)]);
  assert.equal(bars.length,2);
  assert.deepEqual(bars.flatMap(b=>b.pieces).filter(p=>p.runId==='a').map(p=>p.lengthMm).sort((a,b)=>b-a),[3000,1200]);
});
test('packing never mixes thickness, color or kind',()=>{
  const r=[run('a',1000),run('b',1000,{variantId:'connector:black:8'}),run('c',1000,{variantId:'edge:black:5'})];
  assert.equal(profileQuote(r,catalog()).length,3);
});
test('compatible scraps pooled across surfaces and orientations',()=>{
  const r=[run('a',1000),run('b',2000,{surface:1,from:{x:0,y:.5},to:{x:1,y:.5}})];
  const q=profileQuote(r,catalog());assert.equal(q.length,1);assert.equal(q[0]!.quantity,1);
});
test('unconfirmed prices explicitly block quote; no zero or legacy fallback',()=>{
  assert.throws(()=>profileQuote([run('a',1000)],emptyCatalog()),/Не подтверждены/);
});
test('quote does not mutate catalog or derive classification from freeform name',()=>{
  const c=catalog();c[0]!.name='Соединительный (переименован менеджером)';
  const copy=JSON.stringify(c);const q=profileQuote([run('a',1000,{variantId:c[0]!.id})],c);
  assert.equal(q[0]!.variant.kind,'edge');assert.equal(JSON.stringify(c),copy);
  assert.equal(q[0]!.variant.price,100);
});
test('nested compatible decoration is ONE physical 2.4m run and one bar, with both purposes',()=>{
  const r=collectInstalledRuns(input([surface({wallHeightMm:2400})],{decorations:[
    {id:'nested',surface:0,style:'black',from:{x:.5,y:.25},to:{x:.5,y:.75}},
  ]}));
  assert.equal(r.length,1);assert.equal(r[0]!.lengthMm,2400);
  const q=profileQuote(r,catalog());
  assert.equal(q[0]!.totalLengthMm,2400);assert.equal(q[0]!.quantity,1);
  assert.deepEqual(new Set(q[0]!.purposes),new Set(['joint','decor']));
});
test('nested incompatible decoration fails, including reversed endpoint order',()=>{
  for(const [a,b] of [[.25,.75],[.75,.25]]) {
    assert.throws(()=>collectInstalledRuns(input([surface({wallHeightMm:2400})],{decorations:[
      {id:'nested',surface:0,style:'gold',from:{x:.5,y:a!},to:{x:.5,y:b!}},
    ]})),/разные профили/);
  }
});
test('partially overlapping compatible decorations union coverage, not bill overlap twice',()=>{
  const r=collectInstalledRuns(input([surface({moldingStyle:'none'})],{decorations:[
    {id:'a',surface:0,style:'black',from:{x:0,y:.2},to:{x:.6,y:.2}},
    {id:'b',surface:0,style:'black',from:{x:.4,y:.2},to:{x:1,y:.2}},
  ]}));
  assert.equal(r.length,1);assert.equal(r[0]!.lengthMm,1000);
  assert.equal(profileQuote(r,catalog())[0]!.quantity,1);
});
test('compatible collinear bridge merges all overlapping segments independent of insertion order',()=>{
  const ds=[
    {id:'a',surface:0,style:'black',from:{x:0,y:.2},to:{x:.4,y:.2}},
    {id:'b',surface:0,style:'black',from:{x:.6,y:.2},to:{x:1,y:.2}},
    {id:'bridge',surface:0,style:'black',from:{x:.3,y:.2},to:{x:.7,y:.2}},
  ];
  for(const decorations of [ds,[ds[2]!,ds[1]!,ds[0]!]]) {
    const r=collectInstalledRuns(input([surface({moldingStyle:'none'})],{decorations}));
    assert.equal(r.length,1);assert.ok(Math.abs(r[0]!.lengthMm-1000)<.001);
  }
});
test('seam adopted from 2800mm and dragged to 2100mm replaces, not duplicates original',()=>{
  const r=collectInstalledRuns(input([surface({panelCount:1,dividerPositions:[],wallHeightMm:4200,
    moldingStyle:'none',hMoldingStyle:'black',hMoldingPositions:[.5],
    adoptedSeamOriginals:[2800/4200],hMoldingCompanions:{'0.500000':2800/4200},
  })]));
  assert.equal(r.length,1);assert.equal(r[0]!.from.y,.5);
  assert.equal(profileQuote(r,catalog())[0]!.totalLengthMm,1000);
});
test('paired adopted seams move together; original automatic positions stay suppressed',()=>{
  const s=surface({panelCount:1,dividerPositions:[],wallHeightMm:7000,
    moldingStyle:'none',hMoldingStyle:'black',hMoldingPositions:[.7],
    adoptedSeamOriginals:[.4,.8],hMoldingCompanions:{'0.700000':.4},
  });
  const r=collectInstalledRuns(input([s]));
  assert.equal(r.length,2);
  assert.deepEqual(r.map(r=>Math.round(r.from.y*7000)).sort((a,b)=>a-b),[2100,4900]);
  assert.equal(profileQuote(r,catalog())[0]!.quantity,1);
  const reload=collectInstalledRuns(input(JSON.parse(JSON.stringify([s,s])),{zone:'window'}));
  assert.equal(reload.length,4);assert.equal(reload.filter(r=>r.surface===1).length,2);
});
test('disabled adopted primary also disables its companions without restoring original seam',()=>{
  const r=collectInstalledRuns(input([surface({panelCount:1,dividerPositions:[],wallHeightMm:7000,
    moldingStyle:'none',hMoldingStyle:'black',hMoldingPositions:[.7],hMoldingStyleOverrides:{0:'none'},
    adoptedSeamOriginals:[.4,.8],hMoldingCompanions:{'0.700000':.4},
  })]));
  assert.equal(r.length,0);
});
test('shared auto seam geometry matches full panel height with top/bottom short pieces',()=>{
  assert.deepEqual(automaticRowSeams(7000,2800,['top']),[.2,.6]);
  assert.deepEqual(automaticRowSeams(7000,2800,['bottom']),[.4,.8]);
  assert.deepEqual(automaticRowSeams(7000,2800,['top','bottom']),[.1,.5,.9]);
});