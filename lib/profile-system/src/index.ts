export type Thickness = 5 | 8;
export type ProfileKind = 'edge' | 'connector' | 'gap' | 'light';
export type ProfileColor = 'black' | 'gold' | 'bronze' | 'metallic';
export type Purpose = 'edge' | 'joint' | 'decor' | 'tv';
export type Vec = { x: number; y: number };
export const KINDS: ProfileKind[] = ['edge', 'connector', 'gap', 'light'];
export const COLORS: ProfileColor[] = ['black', 'metallic', 'gold', 'bronze'];
export const KIND_NAMES: Record<ProfileKind, string> = {
  edge: 'Торцевой профиль', connector: 'Соединительный профиль',
  gap: 'Соединительный профиль с разрывом', light: 'Соединительный профиль с подсветкой',
};
export const COLOR_NAMES: Record<ProfileColor, string> = {
  black: 'чёрный', metallic: 'металлик', gold: 'золотой', bronze: 'бронзовый',
};
export const PURPOSE_NAMES: Record<Purpose, string> = {
  edge: 'торцы', joint: 'стыки панелей', decor: 'декор', tv: 'подсветка ТВ',
};
export interface Variant {
  id: string; kind: ProfileKind; color: ProfileColor; thicknessMm: Thickness;
  lengthMm: 3000; name: string; article: string; price: number | null; confirmed: boolean;
}
export const variantId = (kind: ProfileKind, color: ProfileColor, thickness: Thickness) =>
  `${kind}:${color}:${thickness}`;
export function emptyCatalog(): Variant[] {
  return ([5, 8] as Thickness[]).flatMap(thicknessMm => KINDS.flatMap(kind =>
    (kind === 'edge' || kind === 'light' ? ['black'] as ProfileColor[] : COLORS).map(color => ({
      id: variantId(kind, color, thicknessMm), kind, color, thicknessMm, lengthMm: 3000 as const,
      name: `${KIND_NAMES[kind]} ${COLOR_NAMES[color]} · ${thicknessMm} мм`,
      article: '', price: null, confirmed: false,
    }))));
}
export function validateCatalog(value: unknown): value is Variant[] {
  if (!Array.isArray(value) || value.length !== 20) return false;
  const definitions = emptyCatalog();
  const used = new Set<string>();
  const confirmedArticles = new Set<string>();
  return value.every(v => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
    const d = definitions.find(d => d.id === v.id);
    if (!d || used.has(v.id)) return false;
    used.add(v.id);
    if (v.confirmed && typeof v.article === 'string') {
      const article = v.article.trim().toLowerCase();
      if (confirmedArticles.has(article)) return false;
      confirmedArticles.add(article);
    }
    return v.kind === d.kind && v.color === d.color && v.thicknessMm === d.thicknessMm &&
      v.lengthMm === 3000 && typeof v.name === 'string' && v.name.trim().length > 0 &&
      v.name.length <= 200 && typeof v.article === 'string' && v.article.length <= 100 &&
      typeof v.confirmed === 'boolean' &&
      (v.price === null || (typeof v.price === 'number' && Number.isFinite(v.price) && v.price > 0)) &&
      (!v.confirmed || (v.article.trim().length > 0 && v.price !== null)) &&
      Object.keys(v).every(k => ['id','kind','color','thicknessMm','lengthMm','name','article','price','confirmed'].includes(k));
  });
}
export function validatePanelThicknesses(value: unknown): value is Record<string, Thickness> {
  return !!value && typeof value === 'object' && !Array.isArray(value) &&
    Object.entries(value).every(([article, thickness]) => article.length > 0 &&
      article.length <= 100 && (thickness === 5 || thickness === 8));
}
export function styleVariant(style: string, thickness: Thickness): string | null {
  if (style === 'none') return null;
  if (style === 'edge' || style === 'edge_black') return variantId('edge', 'black', thickness);
  if (style.startsWith('edge_')) throw new Error('Торцевой профиль доступен только в чёрном цвете. Подтвердите замену старого варианта.');
  const kind: ProfileKind = style === 'gap' || style.endsWith('_gap') ? 'gap'
    : style === 'light' || style.endsWith('_light') ? 'light' : 'connector';
  const color = style === 'gap' || style === 'light' ? 'black' : style.replace(/_(gap|light)$/, '');
  if (!COLORS.includes(color as ProfileColor) || (kind === 'light' && color !== 'black'))
    throw new Error(`Недоступный вариант профиля «${style}». Подсветка — только чёрная.`);
  return variantId(kind, color as ProfileColor, thickness);
}
export function variantStyle(id: string): string {
  const [kind, color] = id.split(':');
  return kind === 'edge' ? 'edge_black' : kind === 'connector' ? color! : `${color}_${kind}`;
}
export interface PanelMaterial {
  id: string; article: string; noMetallicProfile?: boolean; slatOverlay?: boolean;
  textureStretch?: boolean; panelWidthMm?: number; panelHeightMm?: number;
}
export const excluded = (p: PanelMaterial | undefined) =>
  !!p && (p.noMetallicProfile === true || p.slatOverlay === true || p.textureStretch === true);
export interface EdgeSides { top: boolean; bottom: boolean; left: boolean; right: boolean }
export interface Decoration { id: string; surface: number; style: string; from: Vec; to: Vec }
export interface ProfileSurface {
  panelCount: number; dividerPositions: number[]; sectorMaterials: Record<number, PanelMaterial>;
  moldingStyle: string; hMoldingStyle: string; hMoldingPositions: number[];
  dividerStyleOverrides?: Record<number, string>; hMoldingStyleOverrides?: Record<number, string>;
  wallWidthMm: number; wallHeightMm: number; panelOrientation?: string;
  jointProfilePosition?: string[]; edgeProfileSides?: EdgeSides; vProfileStyle?: string;
  adoptedSeamOriginals?: number[];
  hMoldingCompanions?: Record<string, number>;
}
export interface InstalledRun {
  id: string; variantId: string; surface: number; purpose: Purpose; from: Vec; to: Vec;
  lengthMm: number; hidden?: boolean; intersectionsMm: number[];
  purposes?: Purpose[];
}
export interface ProfileInput {
  thickness: Thickness; surfaces: ProfileSurface[]; decorations?: Decoration[];
  defaultPanel?: PanelMaterial; zone: string | null; wraps?: boolean[];
  tv?: { surface: number; widthMm: number; heightMm: number; edges: boolean[] };
  hiddenColumn?: { perimeterMm: number; heightMm: number };
  boxJoints?: { surface: number; style: string };
}
export function automaticRowSeams(height: number, panelHeight: number, positions: string[]): number[] {
  if(!(height>panelHeight && panelHeight>0)) return [];
  const rows=Math.ceil(height/panelHeight), rem=height-(rows-1)*panelHeight;
  const top=positions.includes('top'), bottom=positions.includes('bottom');
  if(top&&bottom) return Array.from({length:rows},(_,i)=>(rem/2+i*panelHeight)/height);
  if(top) return Array.from({length:rows-1},(_,i)=>(rem+i*panelHeight)/height);
  if(bottom) return Array.from({length:rows-1},(_,i)=>(i+1)*panelHeight/height);
  return Array.from({length:Math.max(0,rows-2)},(_,i)=>(i+1)*panelHeight/height);
}

/** Union actual collinear coverage, not its UI representations. Contacts alone are not overlaps. */
export function normalizeInstalledRuns(source: InstalledRun[]): InstalledRun[] {
  const runs=source.map(r=>({...r,from:{...r.from},to:{...r.to},intersectionsMm:[],
    purposes:r.purposes?[...r.purposes]:[r.purpose]}));
  for(let i=0;i<runs.length;i++) for(let j=i+1;j<runs.length;j++) {
    const a=runs[i]!,b=runs[j]!;
    if(a.surface!==b.surface || !!a.hidden!==!!b.hidden) continue;
    const dx=a.to.x-a.from.x,dy=a.to.y-a.from.y, norm=dx*dx+dy*dy;
    if(norm<1e-16) continue;
    const cross=(p:Vec)=>(p.x-a.from.x)*dy-(p.y-a.from.y)*dx;
    if(Math.abs(cross(b.from))>1e-7*Math.sqrt(norm) ||
       Math.abs(cross(b.to))>1e-7*Math.sqrt(norm)) continue;
    const t=(p:Vec)=>((p.x-a.from.x)*dx+(p.y-a.from.y)*dy)/norm;
    const lo=Math.min(t(b.from),t(b.to)), hi=Math.max(t(b.from),t(b.to));
    if(Math.min(1,hi)-Math.max(0,lo)<1e-7) continue;
    const purposes=[...new Set([...(a.purposes??[a.purpose]),...(b.purposes??[b.purpose])])];
    if(a.variantId!==b.variantId) {
      if(a.purpose==='tv'&&b.purpose==='joint'&&lo>=-1e-7&&hi<=1+1e-7) {
        a.purposes=purposes;runs.splice(j,1);j=i;continue;
      }
      if(b.purpose==='tv'&&a.purpose==='joint'&&lo<=1e-7&&hi>=1-1e-7) {
        runs[i]={...b,purposes};runs.splice(j,1);j=i;continue;
      }
      throw new Error('На одном участке выбраны разные профили. Удалите наложение декора или измените стык.');
    }
    const begin=Math.min(0,lo),end=Math.max(1,hi), origin={...a.from};
    a.from={x:origin.x+dx*begin,y:origin.y+dy*begin};
    a.to={x:origin.x+dx*end,y:origin.y+dy*end};
    a.lengthMm*=(end-begin);a.purposes=purposes;
    runs.splice(j,1);j=i;
  }
  return runs;
}
export function collectInstalledRuns(input: ProfileInput): InstalledRun[] {
  let runs: InstalledRun[] = [];
  const add = (surface: number, key: string, style: string, purpose: Purpose, from: Vec, to: Vec,
    width: number, height: number, hidden = false) => {
    if (from.x > to.x || (from.x === to.x && from.y > to.y)) [from,to] = [to,from];
    const id = styleVariant(style, input.thickness);
    if (!id) return;
    const lengthMm = Math.hypot((to.x - from.x) * width, (to.y - from.y) * height);
    if (!(lengthMm > 0 && Number.isFinite(lengthMm))) return;
    const duplicate = runs.find(r => r.surface === surface && r.hidden === hidden &&
      Math.hypot(r.from.x-from.x,r.from.y-from.y) < 1e-7 &&
      Math.hypot(r.to.x-to.x,r.to.y-to.y) < 1e-7);
    // A light run serving TV and a panel joint is one physical installation.
    if (duplicate) {
      duplicate.purposes=[...new Set([...(duplicate.purposes??[duplicate.purpose]),purpose])];
      if (purpose === 'tv' && duplicate.purpose === 'joint') {
        duplicate.variantId = id; duplicate.purpose = purpose;
      } else if (duplicate.variantId !== id) {
        throw new Error('На одном участке выбраны разные профили. Удалите наложение декора или измените стык.');
      }
      return;
    }
    runs.push({ id: `${surface}:${key}`, variantId: id, surface, purpose, from, to,
      lengthMm, hidden, intersectionsMm: [] });
  };
  input.surfaces.forEach((s, q) => {
    const w = s.wallWidthMm, h = s.wallHeightMm;
    if (!(w > 0 && h > 0)) return;
    const boundaries = [0, ...s.dividerPositions, 1];
    const dividesHoriz = s.panelOrientation === 'horizontal';
    const mat = (index: number) => s.sectorMaterials[index] ?? input.defaultPanel;
    const sectorAt = (x: number) => Math.max(0, boundaries.findIndex((b, i) => i > 0 && x < b) - 1);
    const permitted = (a: number, b: number) => !excluded(mat(a)) && !excluded(mat(b));
    // Only internal boundaries. External termination is exclusively an end profile.
    s.dividerPositions.forEach((x, i) => {
      if (permitted(i, i + 1)) add(q, `divider:${i}`, s.dividerStyleOverrides?.[i] ?? s.moldingStyle,
        'joint', dividesHoriz ? {x:0,y:x} : { x, y: 0 }, dividesHoriz ? {x:1,y:x} : { x, y: 1 }, w, h);
    });
    const horizontalPlacements = s.hMoldingPositions.flatMap((y,i)=>{
      const mag=s.hMoldingCompanions?.[y.toFixed(6)];
      return [{y,i,key:'primary'},...(mag===undefined?[]:[y+mag,y-mag]
        .filter(c=>c>0&&c<1).map((c,k)=>({y:c,i,key:`companion:${k}`})))];
    });
    horizontalPlacements.forEach(({y,i,key}) => {
      const style = s.hMoldingStyleOverrides?.[i] ?? s.hMoldingStyle;
      if (dividesHoriz) {
        const sector = sectorAt(Math.min(.999999,y));
        if (!excluded(mat(sector))) add(q,`horizontal:${i}:${key}`,style,'joint',{x:0,y},{x:1,y},w,h);
        return;
      }
      // Split by material eligibility, not by unrelated physical profile crossings.
      let start: number | null = null;
      for (let index = 0; index < s.panelCount; index++) {
        const eligible = !excluded(mat(index));
        if (eligible && start === null) start = boundaries[index]!;
        if (start !== null && (!eligible || index === s.panelCount - 1)) {
          const end = eligible && index === s.panelCount - 1 ? 1 : boundaries[index]!;
          add(q, `horizontal:${i}:${key}:${index}`, style, 'joint', { x: start, y }, { x: end, y }, w, h);
          start = null;
        }
      }
    });
    // Real panel seams, shared by renderer and proposal. Disabled style stays disabled.
    const horizontal = s.panelOrientation === 'horizontal' || s.panelOrientation === 'lengthwise';
    const primary = mat(0);
    const panelW = horizontal ? (primary?.panelHeightMm ?? 2800) : (primary?.panelWidthMm ?? 1220);
    const panelH = horizontal ? (primary?.panelWidthMm ?? 1220) : (primary?.panelHeightMm ?? 2800);
    for (let mm = panelW; mm < w; mm += panelW) {
      const x = mm / w;
      if (!dividesHoriz && s.dividerPositions.some(b => Math.abs(x-b) < .005)) continue;
      if (dividesHoriz) {
        for (let i=0;i<s.panelCount;i++)
          if (!excluded(mat(i))) add(q,`seam-v:${mm}:${i}`,s.moldingStyle,'joint',
            {x,y:boundaries[i]!},{x,y:boundaries[i+1]!},w,h);
        continue;
      }
      const left = sectorAt(Math.max(0, x - .0001)), right = sectorAt(Math.min(.999999, x + .0001));
      if (permitted(left, right)) add(q, `seam-v:${mm}`, s.moldingStyle, 'joint',
        { x, y: 0 }, { x, y: 1 }, w, h);
    }
    const ys=automaticRowSeams(h,panelH,s.jointProfilePosition??['bottom']);
    const rowStyle = s.hMoldingStyle === 'none' ? s.moldingStyle : s.hMoldingStyle;
    ys.forEach((y, yi) => {
      if (horizontalPlacements.some(b => Math.abs(b.y-y) < .005) ||
          s.adoptedSeamOriginals?.some(b=>Math.abs(b-y)<1e-7)) return;
      if (dividesHoriz) {
        if (s.dividerPositions.some(b=>Math.abs(b-y)<.005)) return;
        const above = sectorAt(Math.max(0,y-.0001)), below = sectorAt(Math.min(.999999,y+.0001));
        if (permitted(above,below)) add(q,`seam-h:${yi}`,rowStyle,'joint',{x:0,y},{x:1,y},w,h);
        return;
      }
      let start: number | null = null;
      for (let i = 0; i < s.panelCount; i++) {
        const eligible = !excluded(mat(i));
        if (eligible && start === null) start = boundaries[i]!;
        if (start !== null && (!eligible || i === s.panelCount-1)) {
          const end = eligible && i === s.panelCount-1 ? 1 : boundaries[i]!;
          add(q, `seam-h:${yi}:${i}`, rowStyle, 'joint', { x: start, y }, { x: end, y }, w, h);
          start = null;
        }
      }
    });
    const ep = s.edgeProfileSides;
    // Openings have only the explicitly selected top/bottom abutments.
    const opening = input.zone === 'window' || input.zone === 'door';
    if (ep?.top) add(q, 'edge:top', 'edge_black', 'edge', {x:0,y:0},{x:1,y:0},w,h);
    if (ep?.bottom) add(q, 'edge:bottom', 'edge_black', 'edge', {x:0,y:1},{x:1,y:1},w,h);
    if (!opening && ep?.left) add(q, 'edge:left', 'edge_black', 'edge', {x:0,y:0},{x:0,y:1},w,h);
    if (!opening && ep?.right) add(q, 'edge:right', 'edge_black', 'edge', {x:1,y:0},{x:1,y:1},w,h);
    if (q > 0 && s.vProfileStyle && s.vProfileStyle !== 'none' && input.zone === 'wall-niche') {
      const prev = input.surfaces[q-1]!;
      add(q-1, `niche:${q}`, s.vProfileStyle, 'decor', {x:1,y:0},{x:1,y:1},
        prev.wallWidthMm, prev.wallHeightMm);
    }
    if (q > 0 && !input.wraps?.[q-1] && input.zone !== 'wall-niche' &&
        input.zone !== 'window' && input.zone !== 'door' && input.zone !== 'tv') {
      const prev = input.surfaces[q-1]!;
      const left = prev.sectorMaterials[prev.panelCount-1] ?? input.defaultPanel;
      if (!excluded(left) && !excluded(mat(0))) add(q-1, `surface-joint:${q}`,
        prev.moldingStyle !== 'none' ? prev.moldingStyle : s.moldingStyle, 'joint',
        {x:1,y:0},{x:1,y:1},prev.wallWidthMm,prev.wallHeightMm);
    }
  });
  for (const d of input.decorations ?? []) {
    const s = input.surfaces[d.surface];
    if (s) add(d.surface, `decor:${d.id}`, d.style, 'decor', d.from, d.to, s.wallWidthMm, s.wallHeightMm);
  }
  if (input.boxJoints) {
    const { surface, style } = input.boxJoints;
    const s = input.surfaces[surface];
    if (s && style !== 'none' && !excluded(s.sectorMaterials[0] ?? input.defaultPanel)) {
      const horizontal = s.panelOrientation === 'horizontal';
      const boundaries = [0,...s.dividerPositions,1];
      const edge = (i:number,a:Vec,b:Vec,key='') => {
        // Selected lighting replaces the whole joint edge, including material-split portions.
        if(input.tv?.surface===surface && input.tv.edges[i]) return;
        add(surface,`box:${i}${key}`,style,'joint',a,b,s.wallWidthMm,s.wallHeightMm);
      };
      const eligible = (i:number)=>!excluded(s.sectorMaterials[i] ?? input.defaultPanel);
      for(const i of [0,1,2,3]) {
        const split = horizontal ? i===1||i===3 : i===0||i===2;
        if(!split) {
          const last = horizontal ? i===2 : i===1;
          if(!eligible(last?s.panelCount-1:0)) continue;
          if(i===0) edge(i,{x:0,y:0},{x:1,y:0});
          if(i===1) edge(i,{x:1,y:0},{x:1,y:1});
          if(i===2) edge(i,{x:0,y:1},{x:1,y:1});
          if(i===3) edge(i,{x:0,y:0},{x:0,y:1});
          continue;
        }
        let start:number|null=null;
        for(let j=0;j<s.panelCount;j++) {
          const allowed=eligible(j);
          if(allowed&&start===null) start=boundaries[j]!;
          if(start!==null&&(!allowed||j===s.panelCount-1)) {
            const end=allowed&&j===s.panelCount-1?1:boundaries[j]!;
            if(horizontal) edge(i,{x:i===1?1:0,y:start},{x:i===1?1:0,y:end},`:${j}`);
            else edge(i,{x:start,y:i===2?1:0},{x:end,y:i===2?1:0},`:${j}`);
            start=null;
          }
        }
      }
    }
  }
  if (input.tv) {
    const {surface,widthMm:w,heightMm:h,edges} = input.tv;
    const endpoints: [Vec,Vec][] = [
      [{x:0,y:0},{x:1,y:0}],[{x:1,y:0},{x:1,y:1}],
      [{x:0,y:1},{x:1,y:1}],[{x:0,y:0},{x:0,y:1}],
    ];
    endpoints.forEach(([a,b],i) => { if (edges[i]) add(surface,`tv:${i}`,'light','tv',a,b,w,h); });
  }
  if (input.hiddenColumn) {
    const {perimeterMm:p,heightMm:h} = input.hiddenColumn;
    const primary = input.defaultPanel;
    const style = input.surfaces[0]?.moldingStyle ?? 'none';
    if (p > 0 && h > 0 && !excluded(primary) && style !== 'none') {
      const allJoints = Math.max(0,Math.ceil(p/(primary?.panelWidthMm ?? 1220)) -
        (input.wraps ?? []).filter(Boolean).length);
      const visible = runs.filter(r => r.purpose === 'joint' && r.from.x === r.to.x).length;
      for (let i=0;i<Math.max(0,allJoints-visible);i++)
        add(-1,`hidden-v:${i}`,style,'joint',{x:i,y:0},{x:i,y:1},p,h,true);
      const visibleWidth = input.surfaces.reduce((n,s)=>n+s.wallWidthMm,0);
      const hiddenWidth = Math.max(0,p-visibleWidth);
      for(let y=primary?.panelHeightMm ?? 2800;y<h;y+=primary?.panelHeightMm ?? 2800)
        if(hiddenWidth>0) add(-1,`hidden-h:${y}`,style,'joint',{x:0,y:y/h},{x:1,y:y/h},hiddenWidth,h,true);
    }
  }
  runs=normalizeInstalledRuns(runs);
  // Physical intersections only, within the same surface.
  for (let i=0;i<runs.length;i++) for(let j=i+1;j<runs.length;j++) {
    const a=runs[i]!, b=runs[j]!;
    if (a.surface!==b.surface || a.hidden || b.hidden) continue;
    const ax=a.to.x-a.from.x, ay=a.to.y-a.from.y, bx=b.to.x-b.from.x, by=b.to.y-b.from.y;
    const det=ax*by-ay*bx;
    if(Math.abs(det)<1e-9) continue;
    const dx=b.from.x-a.from.x, dy=b.from.y-a.from.y;
    const t=(dx*by-dy*bx)/det, u=(dx*ay-dy*ax)/det;
    if(t>=0&&t<=1&&u>=0&&u<=1) {
      if(t>1e-7&&t<1-1e-7) a.intersectionsMm.push(t*a.lengthMm);
      if(u>1e-7&&u<1-1e-7) b.intersectionsMm.push(u*b.lengthMm);
    }
  }
  return runs;
}
export interface CutPiece { runId: string; lengthMm: number; startMm: number }
export interface StockBar { remainingMm: number; pieces: CutPiece[] }
export interface QuoteGroup {
  variant: Variant; runs: InstalledRun[]; bars: StockBar[]; totalLengthMm: number;
  purposes: Purpose[]; quantity: number;
}
export function packInstalledRuns(runs: InstalledRun[]): StockBar[] {
  const bars: StockBar[] = [];
  const pieces: CutPiece[] = [];
  for(const run of runs) {
    // No discretionary splices: whole <=3m segments first; long segments continue at 3m.
    for(let start=0;start<run.lengthMm-.001;start+=3000)
      pieces.push({runId:run.id,startMm:start,lengthMm:Math.min(3000,run.lengthMm-start)});
  }
  pieces.sort((a,b)=>b.lengthMm-a.lengthMm);
  for(const piece of pieces) {
    const bar=bars.filter(b=>b.remainingMm+.001>=piece.lengthMm)
      .sort((a,b)=>a.remainingMm-b.remainingMm)[0];
    if(bar) { bar.pieces.push(piece); bar.remainingMm=Math.max(0,bar.remainingMm-piece.lengthMm); }
    else bars.push({remainingMm:3000-piece.lengthMm,pieces:[piece]});
  }
  return bars;
}
export function profileQuote(runs: InstalledRun[], catalog: Variant[]): QuoteGroup[] {
  const groups = new Map<string, InstalledRun[]>();
  for(const run of runs) groups.set(run.variantId,[...(groups.get(run.variantId)??[]),run]);
  return [...groups].map(([id,groupRuns])=>{
    const variant=catalog.find(v=>v.id===id);
    if(!variant?.confirmed || !variant.article.trim() || !(variant.price!>0))
      throw new Error(`Не подтверждены артикул и цена профиля «${variant?.name ?? id}». Заполните вариант в кабинете менеджера.`);
    const bars=packInstalledRuns(groupRuns);
    return {variant,runs:groupRuns,bars,quantity:bars.length,
      totalLengthMm:groupRuns.reduce((n,r)=>n+r.lengthMm,0),
       purposes:[...new Set(groupRuns.flatMap(r=>r.purposes??[r.purpose]))]};
  });
}
/** Quantity only, without requiring or substituting any price. Never pool different variants. */
export function profileStockCount(runs: InstalledRun[]): number {
  return [...new Set(runs.map(r=>r.variantId))].reduce((n,id)=>
    n+packInstalledRuns(runs.filter(r=>r.variantId===id)).length,0);
}