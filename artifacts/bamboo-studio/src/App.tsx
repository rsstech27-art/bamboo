import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Layout, Eraser, RotateCcw, Download, Check, Columns, Undo2, Sun, Moon } from 'lucide-react';

const BASE = import.meta.env.BASE_URL;

const PANEL_SERIES = [
  {
    id: 'metall-25', name: 'Металлическая серия',
    panels: [
      { id: '2210-25', article: '2210-25', name: 'Матов. серебро',       color: '#8fa0a8', texture: `${BASE}textures/tex-117.jpg` },
      { id: '2211-25', article: '2211-25', name: 'Матов. серый',         color: '#7a8890', texture: `${BASE}textures/tex-118.jpg` },
      { id: '2212-25', article: '2212-25', name: 'Матов. коричневый',    color: '#7a6548', texture: `${BASE}textures/tex-119.jpg` },
      { id: '2215-25', article: '2215-25', name: 'Узорч. серый',         color: '#909898', texture: `${BASE}textures/tex-122.jpg` },
    ],
  },
  {
    id: 'liqmetall-25', name: 'Жидкий металл -25',
    panels: [
      { id: '2218-25', article: '2218-25', name: 'Зола',                 color: '#909090', texture: `${BASE}textures/tex-126.jpg` },
      { id: '2219-25', article: '2219-25', name: 'Золото',               color: '#c0a060', texture: `${BASE}textures/tex-127.jpg` },
      { id: '2220-25', article: '2220-25', name: 'Серебро',              color: '#b0bac5', texture: `${BASE}textures/tex-128.jpg` },
      { id: '2221-25', article: '2221-25', name: 'Шампанское',           color: '#c8b898', texture: `${BASE}textures/tex-129.jpg` },
    ],
  },
  {
    id: 'pet-25', name: 'ПЭТ матовая',
    panels: [
      { id: '2225-25', article: '2225-25', name: 'Шампанское',           color: '#c0a880', texture: `${BASE}textures/tex-133.jpg` },
      { id: '2226-25', article: '2226-25', name: 'Античн. бронза',       color: '#a07850', texture: `${BASE}textures/tex-134.jpg` },
      { id: '2227-25', article: '2227-25', name: 'Золото (длинное)',      color: '#b09050', texture: `${BASE}textures/tex-135.jpg` },
      { id: '2228-25', article: '2228-25', name: 'Красный (длинный)',     color: '#a83040', texture: `${BASE}textures/tex-136.jpg` },
    ],
  },
  {
    id: 'galv-15', name: 'Гальваническая',
    panels: [
      { id: '2005-15', article: '2005-15', name: 'Античн. бронза',       color: '#a87858', texture: `${BASE}textures/tex-140.jpg` },
      { id: '2006-15', article: '2006-15', name: 'Зола',                 color: '#808880', texture: `${BASE}textures/tex-141.jpg` },
      { id: '2007-15', article: '2007-15', name: 'Сотовое золото',       color: '#c8a830', texture: `${BASE}textures/tex-142.jpg` },
      { id: '2008-15', article: '2008-15', name: 'Вспышка золота',       color: '#c09060', texture: `${BASE}textures/tex-143.jpg` },
    ],
  },
  {
    id: 'liqmetall-10', name: 'Жидкий металл -10',
    panels: [
      { id: '2121-10', article: '2121-10', name: 'Косм. зола',           color: '#606870', texture: `${BASE}textures/tex-147.jpg` },
      { id: '2122-10', article: '2122-10', name: 'Gucci',                color: '#707878', texture: `${BASE}textures/tex-148.jpg` },
      { id: '2123-10', article: '2123-10', name: 'Античн. бронза',       color: '#987060', texture: `${BASE}textures/tex-149.jpg` },
      { id: '2124-10', article: '2124-10', name: 'Хамелеон',             color: '#d8c8b0', texture: `${BASE}textures/tex-150.jpg` },
      { id: '2125-10', article: '2125-10', name: 'Millard',              color: '#c0b0a8', texture: `${BASE}textures/tex-154.jpg` },
      { id: '2126-10', article: '2126-10', name: 'Таро-фиолетовый',      color: '#687060', texture: `${BASE}textures/tex-155.jpg` },
      { id: '2129-10', article: '2129-10', name: 'Красная медь',         color: '#b89088', texture: `${BASE}textures/tex-156.jpg` },
      { id: '2130-10', article: '2130-10', name: 'Латунь',               color: '#b89040', texture: `${BASE}textures/tex-157.jpg` },
      { id: '2131-10', article: '2131-10', name: 'Золото',               color: '#c8a060', texture: `${BASE}textures/tex-158.jpg` },
    ],
  },
  {
    id: 'particles-10', name: 'Частицы',
    panels: [
      { id: '2132-10', article: '2132-10', name: 'Сине-серые',           color: '#808898', texture: `${BASE}textures/tex-162.jpg` },
      { id: '2133-10', article: '2133-10', name: 'Конопляная зола',      color: '#909878', texture: `${BASE}textures/tex-163.jpg` },
      { id: '2134-10', article: '2134-10', name: 'Золото',               color: '#b09060', texture: `${BASE}textures/tex-164.jpg` },
      { id: '2135-10', article: '2135-10', name: 'Красн.-коричн.',       color: '#906050', texture: `${BASE}textures/tex-165.jpg` },
    ],
  },
  {
    id: 'stone-gravel', name: 'Щебень / Камень',
    panels: [
      { id: '8205-10', article: '8205-10', name: 'Кофе из щебня',        color: '#906848', texture: `${BASE}textures/tex-175.jpg` },
      { id: '8206-10', article: '8206-10', name: 'Перл. камень',         color: '#d0c8b8', texture: `${BASE}textures/tex-176.jpg` },
      { id: '8815-15', article: '8815-15', name: 'Камень золото',        color: '#c0a040', texture: `${BASE}textures/tex-177.jpg` },
      { id: '8816-15', article: '8816-15', name: 'Красн. медн. пластина',color: '#6a3030', texture: `${BASE}textures/tex-178.jpg` },
      { id: '6311-8',  article: '6311-8',  name: 'Серый щебень',         color: '#909090', texture: `${BASE}textures/tex-182.jpg` },
      { id: '6315-8',  article: '6315-8',  name: 'Грунт. щебень',        color: '#706860', texture: `${BASE}textures/tex-183.jpg` },
      { id: '8201-8',  article: '8201-8',  name: 'Позол. латунь',        color: '#908050', texture: `${BASE}textures/tex-184.jpg` },
      { id: '8202-8',  article: '8202-8',  name: 'Розовая медь',         color: '#b89080', texture: `${BASE}textures/tex-185.jpg` },
    ],
  },
  {
    id: 'patina-copper', name: 'Патина / Медь',
    panels: [
      { id: '8203-8',  article: '8203-8',  name: 'Позол. ржавчина',      color: '#c09878', texture: `${BASE}textures/tex-189.jpg` },
      { id: '8204-8',  article: '8204-8',  name: 'Зелёная медь',         color: '#709080', texture: `${BASE}textures/tex-190.jpg` },
      { id: '8805-8',  article: '8805-8',  name: 'Медь оранжевая',       color: '#b06828', texture: `${BASE}textures/tex-191.jpg` },
      { id: '8806-8',  article: '8806-8',  name: 'Медь зелёная ржавч.',  color: '#607060', texture: `${BASE}textures/tex-192.jpg` },
      { id: '8807-10', article: '8807-10', name: 'Красн. ржав. камень',  color: '#685040', texture: `${BASE}textures/tex-196.jpg` },
      { id: '8808-10', article: '8808-10', name: 'Серый ржав. камень',   color: '#504840', texture: `${BASE}textures/tex-197.jpg` },
    ],
  },
  {
    id: 'linen-cement', name: 'Льняное / Цемент',
    panels: [
      { id: '8207-5',  article: '8207-5',  name: 'Льняное серебро',      color: '#c0c0c0', texture: `${BASE}textures/tex-198.jpg` },
      { id: '8208-5',  article: '8208-5',  name: 'Серо-коричн. золото',  color: '#b0a890', texture: `${BASE}textures/tex-199.jpg` },
      { id: '8209-5',  article: '8209-5',  name: 'Красн. бел. серебр.',  color: '#c0b8b8', texture: `${BASE}textures/tex-203.jpg` },
      { id: '8210-5',  article: '8210-5',  name: 'Синий серый серебр.',  color: '#a0b0c0', texture: `${BASE}textures/tex-204.jpg` },
      { id: '8211-5',  article: '8211-5',  name: 'Пик серого серебра',   color: '#b0b8c0', texture: `${BASE}textures/tex-205.jpg` },
      { id: '8212-5',  article: '8212-5',  name: 'Цементный ясень',      color: '#a0a098', texture: `${BASE}textures/tex-206.jpg` },
    ],
  },
  {
    id: 'rainbow', name: 'Радуга / Хамелеон',
    panels: [
      { id: '2216-10', article: '2216-10', name: 'Жемчужно-голубой',     color: '#8090c0', texture: `${BASE}textures/tex-210.jpg` },
      { id: '2222-30', article: '2222-30', name: 'Столб радужн. света',  color: '#c0c8d0', texture: `${BASE}textures/tex-211.jpg` },
      { id: '2223-30', article: '2223-30', name: 'Туманный ирис',        color: '#d0c0d0', texture: `${BASE}textures/tex-213.jpg` },
    ],
  },
  {
    id: 'mirror-gloss', name: 'Зеркальная глянцевая',
    panels: [
      { id: '8011-15', article: '8011-15', name: 'Зеркал. белая',        color: '#e8e8e8', texture: `${BASE}textures/tex-217.jpg` },
      { id: '8012-15', article: '8012-15', name: 'Зеркал. чёрная',       color: '#282828', texture: `${BASE}textures/tex-218.jpg` },
      { id: '8023-15', article: '8023-15', name: 'Молочный чай',         color: '#c8b890', texture: `${BASE}textures/tex-219.jpg` },
    ],
  },
  {
    id: 'wood', name: 'Натуральное дерево',
    panels: [
      { id: 'W-331', article: 'W-331', name: 'Дуб натуральный',     color: '#c8a870', texture: `${BASE}textures/tex-331.jpg`, textureStretch: true },
      { id: 'W-332', article: 'W-332', name: 'Дуб бежевый',         color: '#d4b888', texture: `${BASE}textures/tex-332.jpg`, textureStretch: true },
      { id: 'W-334', article: 'W-334', name: 'Дуб слоновая кость',  color: '#dcc89a', texture: `${BASE}textures/tex-334.jpg`, textureStretch: true },
      { id: 'W-340', article: 'W-340', name: 'Дуб медовый',         color: '#c8a060', texture: `${BASE}textures/tex-340.jpg`, textureStretch: true },
      { id: 'W-341', article: 'W-341', name: 'Дуб янтарный',        color: '#b89050', texture: `${BASE}textures/tex-341.jpg`, textureStretch: true },
      { id: 'W-342', article: 'W-342', name: 'Дуб светлый',         color: '#d8c090', texture: `${BASE}textures/tex-342.jpg`, textureStretch: true },
      { id: 'W-349', article: 'W-349', name: 'Ясень натуральный',   color: '#c8a870', texture: `${BASE}textures/tex-349.jpg`, textureStretch: true },
      { id: 'W-350', article: 'W-350', name: 'Ясень белёный',       color: '#d4b880', texture: `${BASE}textures/tex-350.jpg`, textureStretch: true },
      { id: 'W-351', article: 'W-351', name: 'Ясень светлый',       color: '#c8a870', texture: `${BASE}textures/tex-351.jpg`, textureStretch: true },
      { id: 'W-352', article: 'W-352', name: 'Ясень тёплый',        color: '#b08050', texture: `${BASE}textures/tex-352.jpg`, textureStretch: true },
      { id: 'W-333', article: 'W-333', name: 'Орех светлый',        color: '#a88060', texture: `${BASE}textures/tex-333.jpg`, textureStretch: true },
      { id: 'W-336', article: 'W-336', name: 'Ясень серебристый',   color: '#b0a898', texture: `${BASE}textures/tex-336.jpg`, textureStretch: true },
      { id: 'W-343', article: 'W-343', name: 'Дуб дымчатый',        color: '#7a7068', texture: `${BASE}textures/tex-343.jpg`, textureStretch: true },
      { id: 'W-344', article: 'W-344', name: 'Дуб серый',           color: '#807870', texture: `${BASE}textures/tex-344.jpg`, textureStretch: true },
      { id: 'W-353', article: 'W-353', name: 'Ясень серый',         color: '#787068', texture: `${BASE}textures/tex-353.jpg`, textureStretch: true },
      { id: 'W-345', article: 'W-345', name: 'Орех тёмный',         color: '#6a4830', texture: `${BASE}textures/tex-345.jpg`, textureStretch: true },
      { id: 'W-354', article: 'W-354', name: 'Ясень тёмный',        color: '#605848', texture: `${BASE}textures/tex-354.jpg`, textureStretch: true },
      { id: 'W-335', article: 'W-335', name: 'Венге',               color: '#483830', texture: `${BASE}textures/tex-335.jpg`, textureStretch: true },
    ],
  },
  {
    id: 'soft-touch', name: 'Soft-touch / Кожа',
    panels: [
      { id: 'K3001',    article: 'K3001',    name: 'Зернистая кожа',      color: '#e8e0d8', texture: `${BASE}textures/tex-255.jpg`, textureScale: 8  },
      { id: 'K3002',    article: 'K3002',    name: 'Кожа личи',           color: '#8a7868', texture: `${BASE}textures/tex-257.jpg`, textureScale: 8  },
      { id: 'K3003',    article: 'K3003',    name: 'Плетёная кожа',       color: '#9a8878', texture: `${BASE}textures/tex-256.jpg`, textureScale: 10 },
      { id: 'K3004',    article: 'K3004',    name: 'Вафельная кожа',      color: '#888888', texture: `${BASE}textures/tex-258.jpg`, textureScale: 8  },
      { id: '1011-8',   article: '1011-8',   name: 'Тёмно-сер. облачный', color: '#5a5452', texture: `${BASE}textures/tex-263.jpg`, textureScale: 6  },
      { id: '1013-8',   article: '1013-8',   name: 'Бобовый песок',       color: '#b0a898', texture: `${BASE}textures/tex-265.jpg`, textureScale: 8  },
      { id: '1014-8',   article: '1014-8',   name: 'Бавар. коричневый',   color: '#c09080', texture: `${BASE}textures/tex-267.jpg`, textureScale: 6  },
      { id: '1015-8',   article: '1015-8',   name: 'Ванильный жёлтый',    color: '#d8c8a8', texture: `${BASE}textures/tex-264.jpg`, textureScale: 6  },
      { id: '1017-8',   article: '1017-8',   name: 'Сев. ветер серый',    color: '#d0ccc8', texture: `${BASE}textures/tex-266.jpg`, textureScale: 6  },
      { id: '1083-5',   article: '1083-5',   name: 'Клеточка чёрная',     color: '#202020', texture: `${BASE}textures/tex-270.jpg`, textureScale: 8  },
      { id: '1002A-5',  article: '1002A-5',  name: 'Белая гладь',         color: '#f0eeec', texture: '' },
      { id: '1085-5',   article: '1085-5',   name: 'Нежная гладь',        color: '#d8c8b8', texture: '' },
      { id: '1082-5',   article: '1082-5',   name: 'Тёмная гладь',        color: '#303030', texture: '' },
      { id: '1080-5',   article: '1080-5',   name: 'Светло-сер. гладь',   color: '#909898', texture: '' },
      { id: '1216-5',   article: '1216-5',   name: 'Весеннее чувство',    color: '#e2d5ca', texture: '' },
      { id: '1217-5',   article: '1217-5',   name: 'Коричневая кожа',     color: '#9a8f87', texture: '' },
      { id: '1218-5',   article: '1218-5',   name: 'Белый нефрит',        color: '#f3efe0', texture: '' },
      { id: '1219-5',   article: '1219-5',   name: 'Лондонский туман',    color: '#c4bcb4', texture: '' },
      { id: '1220-5',   article: '1220-5',   name: 'Подкова серая',       color: '#9fa5ab', texture: '' },
      { id: '1221-5',   article: '1221-5',   name: 'Сумерки',             color: '#7e8896', texture: '' },
      { id: '1222-5',   article: '1222-5',   name: 'Венец. серая кожа',   color: '#5e6672', texture: '' },
      { id: '1223-5',   article: '1223-5',   name: 'Элегантный серый',    color: '#6e6a60', texture: '' },
      { id: '1055-5',   article: '1055-5',   name: 'Растопл. молоко',     color: '#edf1f4', texture: '' },
      { id: '1056-5',   article: '1056-5',   name: 'Платиновый серый',    color: '#c8cccd', texture: '' },
      { id: '1057-5',   article: '1057-5',   name: 'Сюэфу',               color: '#c6d0da', texture: '' },
      { id: '1001-5',   article: '1001-5',   name: 'Серый шоколад',       color: '#786860', texture: '' },
    ],
  },
];

type Panel = { id: string; article: string; name: string; color: string; texture: string; textureScale?: number; textureStretch?: boolean };
type PanelSeries = { id: string; name: string; panels: Panel[] };

const BAMBOO_PANELS: Panel[] = (PANEL_SERIES as PanelSeries[]).flatMap(s => s.panels);
type Point = { x: number; y: number };

const PanelThumb = ({ panel, selected, onClick }: { panel: Panel; selected: boolean; onClick: () => void }) => (
  <button onClick={onClick}
    className={`rounded-xl overflow-hidden border-2 transition-all active:scale-95 ${selected ? 'border-black shadow-md scale-[1.03]' : 'border-transparent hover:border-gray-200'}`}>
    {panel.texture
      ? <img src={panel.texture} className="w-full h-12 object-cover" alt={panel.name} loading="lazy"/>
      : <div className="w-full h-12" style={{ backgroundColor: panel.color }}/>
    }
    <div className="bg-white px-1 pb-1 pt-0.5">
      <div className="text-[7px] font-bold text-center text-gray-600 leading-tight">{panel.name}</div>
      <div className="text-[6px] text-center text-gray-300 font-mono">{panel.article}</div>
    </div>
  </button>
);

const SeriesAccordion = ({
  series, openIds, onToggle, selectedId, onSelect,
}: {
  series: PanelSeries[];
  openIds: Set<string>;
  onToggle: (id: string) => void;
  selectedId: string | undefined;
  onSelect: (panel: Panel) => void;
}) => (
  <div className="space-y-1">
    {series.map(s => (
      <div key={s.id} className="rounded-xl overflow-hidden border border-gray-100">
        <button
          onClick={() => onToggle(s.id)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 transition-colors">
          <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">{s.name}</span>
          <span className="text-[8px] text-gray-400 ml-1">{openIds.has(s.id) ? '▲' : '▼'}</span>
        </button>
        {openIds.has(s.id) && (
          <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-white">
            {s.panels.map(panel => (
              <PanelThumb key={panel.id} panel={panel}
                selected={selectedId === panel.id}
                onClick={() => onSelect(panel)}/>
            ))}
          </div>
        )}
      </div>
    ))}
  </div>
);

const MIN_PANEL_RATIO = 0.03; // minimum panel width: 3% of wall
const DIVIDER_HIT_RADIUS = 10; // px in canvas space

function makeEqualDividers(count: number): number[] {
  const dividers: number[] = [];
  for (let i = 1; i < count; i++) dividers.push(i / count);
  return dividers;
}

const BambooStudio = () => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [step, setStep] = useState<'upload' | 'mark' | 'edit'>('upload');
  const [points, setPoints] = useState<Point[]>([]);
  const [panelCount, setPanelCount] = useState(5);
  // dividerPositions: array of N-1 values in (0,1), sorted ascending
  const [dividerPositions, setDividerPositions] = useState<number[]>(makeEqualDividers(5));
  const [sectorMaterials, setSectorMaterials] = useState<Record<number, Panel>>({});
  const [activeSector, setActiveSector] = useState<number | null>(null);
  const [brushSize, setBrushSize] = useState(40);
  const [isErasing, setIsErasing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);
  const [moldingStyle, setMoldingStyle] = useState<'none' | 'gold' | 'black' | 'metallic' | 'brass'>('none');
  const [moldingWidth, setMoldingWidth] = useState(1);
  const [hMoldingStyle, setHMoldingStyle] = useState<'none' | 'gold' | 'black' | 'metallic' | 'brass'>('none');
  const [hMoldingCount, setHMoldingCount] = useState(1);
  const [hMoldingWidth, setHMoldingWidth] = useState(1);
  const [hMoldingPositions, setHMoldingPositions] = useState<number[]>([0.5]);
  const [openSeries, setOpenSeries] = useState<Set<string>>(() => new Set(['metall-25']));
  const [footerCatalogOpen, setFooterCatalogOpen] = useState(false);
  const [lightMode, setLightMode] = useState<'off' | 'morning' | 'evening'>('off');
  const lightModeRef = useRef<'off' | 'morning' | 'evening'>('off');

  const toggleSeries = (id: string) => setOpenSeries(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Refs for stable drawFullScene
  const imageRef = useRef<HTMLImageElement | null>(null);
  const stepRef = useRef<'upload' | 'mark' | 'edit'>('upload');
  const pointsRef = useRef<Point[]>([]);
  const panelCountRef = useRef(5);
  const dividerPositionsRef = useRef<number[]>(makeEqualDividers(5));
  const sectorMaterialsRef = useRef<Record<number, Panel>>({});
  const activeSectorRef = useRef<number | null>(null);
  const isErasingRef = useRef(false);
  const draggingDividerIndexRef = useRef<number | null>(null);
  const forExportRef = useRef(false);
  const moldingStyleRef = useRef<'none' | 'gold' | 'black' | 'metallic' | 'brass'>('none');
  const moldingWidthRef = useRef(1);
  const hMoldingStyleRef = useRef<'none' | 'gold' | 'black' | 'metallic' | 'brass'>('none');
  const hMoldingCountRef = useRef(1);
  const hMoldingWidthRef = useRef(1);
  const hMoldingPositionsRef = useRef<number[]>([0.5]);
  const draggingHMoldingIndexRef = useRef<number | null>(null);
  // Mask stored as strokes — never gets reset by canvas operations
  const maskStrokesRef = useRef<Array<{ x: number; y: number; r: number }>>([]);
  const maskUndoStackRef = useRef<number[]>([]); // stores stroke-array length before each erase drag
  const textureCacheRef = useRef<Record<string, HTMLImageElement>>({}); // preloaded panel textures

  type HistorySnapshot = {
    sectorMaterials: Record<number, Panel>;
    dividerPositions: number[];
    panelCount: number;
  };
  const historyRef = useRef<HistorySnapshot[]>([]);

  const pushHistory = useCallback(() => {
    historyRef.current.push({
      sectorMaterials: { ...sectorMaterialsRef.current },
      dividerPositions: [...dividerPositionsRef.current],
      panelCount: panelCountRef.current,
    });
    if (historyRef.current.length > 50) historyRef.current.shift();
  }, []);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current.pop()!;
    setSectorMaterials(prev.sectorMaterials);
    setDividerPositions(prev.dividerPositions);
    setPanelCount(prev.panelCount);
  }, []);

  useEffect(() => { imageRef.current = image; }, [image]);
  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { pointsRef.current = points; }, [points]);
  useEffect(() => { panelCountRef.current = panelCount; }, [panelCount]);
  useEffect(() => { dividerPositionsRef.current = dividerPositions; }, [dividerPositions]);
  useEffect(() => { sectorMaterialsRef.current = sectorMaterials; }, [sectorMaterials]);
  useEffect(() => { activeSectorRef.current = activeSector; }, [activeSector]);
  useEffect(() => { isErasingRef.current = isErasing; }, [isErasing]);
  useEffect(() => { moldingStyleRef.current = moldingStyle; }, [moldingStyle]);
  useEffect(() => { moldingWidthRef.current = moldingWidth; }, [moldingWidth]);
  useEffect(() => { hMoldingStyleRef.current = hMoldingStyle; }, [hMoldingStyle]);
  useEffect(() => { hMoldingCountRef.current = hMoldingCount; }, [hMoldingCount]);
  useEffect(() => { hMoldingWidthRef.current = hMoldingWidth; }, [hMoldingWidth]);
  useEffect(() => { hMoldingPositionsRef.current = hMoldingPositions; }, [hMoldingPositions]);
  useEffect(() => { lightModeRef.current = lightMode; }, [lightMode]);

  // Ctrl+Z global undo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo]);

  // Returns the start/end ratio for each sector based on divider positions
  const getSectorBounds = (dividers: number[], count: number) => {
    const bounds: { start: number; end: number }[] = [];
    for (let i = 0; i < count; i++) {
      const start = i === 0 ? 0 : dividers[i - 1];
      const end = i === count - 1 ? 1 : dividers[i];
      bounds.push({ start, end });
    }
    return bounds;
  };

  const drawFullScene = useCallback(() => {
    const img = imageRef.current;
    const canvas = mainCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!img || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    const pts = pointsRef.current;
    const curStep = stepRef.current;
    const curPanelCount = panelCountRef.current;
    const curDividers = dividerPositionsRef.current;
    const curMaterials = sectorMaterialsRef.current;
    const curActiveSector = activeSectorRef.current;
    const curIsErasing = isErasingRef.current;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    if (curStep === 'mark') {
      ctx.fillStyle = '#007aff';
      pts.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
      });
      if (pts.length === 4) {
        ctx.strokeStyle = '#007aff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        pts.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.stroke();
      }
      return;
    }

    if (curStep === 'edit' && pts.length === 4) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tCtx = tempCanvas.getContext('2d');
      if (!tCtx) return;

      const bounds = getSectorBounds(curDividers, curPanelCount);

      for (let i = 0; i < curPanelCount; i++) {
        const { start: rStart, end: rEnd } = bounds[i];

        const p1 = { x: pts[0].x + (pts[1].x - pts[0].x) * rStart, y: pts[0].y + (pts[1].y - pts[0].y) * rStart };
        const p2 = { x: pts[0].x + (pts[1].x - pts[0].x) * rEnd, y: pts[0].y + (pts[1].y - pts[0].y) * rEnd };
        const p3 = { x: pts[3].x + (pts[2].x - pts[3].x) * rEnd, y: pts[3].y + (pts[2].y - pts[3].y) * rEnd };
        const p4 = { x: pts[3].x + (pts[2].x - pts[3].x) * rStart, y: pts[3].y + (pts[2].y - pts[3].y) * rStart };

        const material = curMaterials[i] || BAMBOO_PANELS[0];

        // Draw panel with texture if available, else solid color
        const minX = Math.min(p1.x, p2.x, p3.x, p4.x);
        const maxX = Math.max(p1.x, p2.x, p3.x, p4.x);
        const minY = Math.min(p1.y, p2.y, p3.y, p4.y);
        const maxY = Math.max(p1.y, p2.y, p3.y, p4.y);
        tCtx.save();
        tCtx.beginPath();
        tCtx.moveTo(p1.x, p1.y);
        tCtx.lineTo(p2.x, p2.y);
        tCtx.lineTo(p3.x, p3.y);
        tCtx.lineTo(p4.x, p4.y);
        tCtx.closePath();
        tCtx.clip();

        const cachedTex = textureCacheRef.current[material.id];
        if (cachedTex) {
          const panelW = maxX - minX;
          const panelH = maxY - minY;
          if (material.textureStretch) {
            // Stretch mode: draw image scaled to fill the bounding box, no tiling
            tCtx.drawImage(cachedTex, minX, minY, panelW, panelH);
          } else {
            const ts = material.textureScale ?? 1;
            // If textureScale set: shrink tile to 1/ts (realistic repeat), else auto-fit
            const scale = ts > 1
              ? 1 / ts
              : Math.max(1, panelH / (cachedTex.height * 3));
            const pattern = tCtx.createPattern(cachedTex, 'repeat');
            if (pattern) {
              const m = new DOMMatrix();
              m.scaleSelf(scale, scale);
              m.translateSelf(minX / scale, minY / scale);
              pattern.setTransform(m);
              tCtx.fillStyle = pattern;
            } else {
              tCtx.fillStyle = material.color;
            }
            tCtx.fillRect(minX - 1, minY - 1, panelW + 2, panelH + 2);
          }
        } else {
          tCtx.fillStyle = material.color;
          tCtx.fillRect(0, 0, width, height);
        }

        // Light gradient overlay
        const curLight = lightModeRef.current;
        if (curLight !== 'off') {
          let gx0: number, gy0: number, gx1: number, gy1: number, brightColor: string, fadeColor: string;
          if (curLight === 'morning') {
            gx0 = maxX; gy0 = minY; gx1 = minX; gy1 = maxY;
            brightColor = 'rgba(200,225,255,0.30)';
            fadeColor   = 'rgba(0,10,50,0.07)';
          } else {
            gx0 = minX; gy0 = minY; gx1 = maxX; gy1 = maxY;
            brightColor = 'rgba(255,195,100,0.32)';
            fadeColor   = 'rgba(60,15,0,0.08)';
          }
          const lightGrad = tCtx.createLinearGradient(gx0, gy0, gx1, gy1);
          lightGrad.addColorStop(0, brightColor);
          lightGrad.addColorStop(1, fadeColor);
          tCtx.fillStyle = lightGrad;
          tCtx.fillRect(minX - 1, minY - 1, maxX - minX + 2, maxY - minY + 2);
        }
        tCtx.restore();

        // Re-draw shape outline for selection & dividers
        tCtx.beginPath();
        tCtx.moveTo(p1.x, p1.y);
        tCtx.lineTo(p2.x, p2.y);
        tCtx.lineTo(p3.x, p3.y);
        tCtx.lineTo(p4.x, p4.y);
        tCtx.closePath();

        if (curActiveSector === i && !curIsErasing) {
          tCtx.strokeStyle = 'white';
          tCtx.lineWidth = 3;
          tCtx.stroke();
        }

        tCtx.strokeStyle = 'rgba(0,0,0,0.12)';
        tCtx.lineWidth = 1;
        tCtx.stroke();
      }

      // Draw draggable dividers as visible handles (hidden during export)
      if (!curIsErasing && !forExportRef.current) {
        curDividers.forEach((ratio) => {
          // Point on top edge
          const topX = pts[0].x + (pts[1].x - pts[0].x) * ratio;
          const topY = pts[0].y + (pts[1].y - pts[0].y) * ratio;
          // Point on bottom edge
          const botX = pts[3].x + (pts[2].x - pts[3].x) * ratio;
          const botY = pts[3].y + (pts[2].y - pts[3].y) * ratio;

          tCtx.save();
          tCtx.strokeStyle = 'rgba(255,255,255,0.6)';
          tCtx.lineWidth = 2;
          tCtx.setLineDash([6, 4]);
          tCtx.beginPath();
          tCtx.moveTo(topX, topY);
          tCtx.lineTo(botX, botY);
          tCtx.stroke();
          tCtx.restore();

          // Handle circle at midpoint
          const midX = (topX + botX) / 2;
          const midY = (topY + botY) / 2;
          tCtx.save();
          tCtx.fillStyle = 'white';
          tCtx.strokeStyle = 'rgba(0,0,0,0.3)';
          tCtx.lineWidth = 1.5;
          tCtx.beginPath();
          tCtx.arc(midX, midY, 8, 0, Math.PI * 2);
          tCtx.fill();
          tCtx.stroke();
          // Arrow hints
          tCtx.fillStyle = '#555';
          tCtx.font = 'bold 10px sans-serif';
          tCtx.textAlign = 'center';
          tCtx.textBaseline = 'middle';
          tCtx.fillText('⇔', midX, midY);
          tCtx.restore();
        });
      }

      // Draw moldings on tempCanvas BEFORE mask so eraser can erase through them
      const curMoldingStyle = moldingStyleRef.current;
      const curMoldingWidth = moldingWidthRef.current;
      if (curMoldingStyle !== 'none' && curDividers.length > 0) {
        curDividers.forEach((ratio) => {
          const topX = pts[0].x + (pts[1].x - pts[0].x) * ratio;
          const topY = pts[0].y + (pts[1].y - pts[0].y) * ratio;
          const botX = pts[3].x + (pts[2].x - pts[3].x) * ratio;
          const botY = pts[3].y + (pts[2].y - pts[3].y) * ratio;

          const dx = botX - topX;
          const dy = botY - topY;
          const len = Math.sqrt(dx * dx + dy * dy);
          const px = -dy / len;
          const py = dx / len;
          const hw = curMoldingWidth / 2;
          const midX = (topX + botX) / 2;
          const midY = (topY + botY) / 2;

          const grad = tCtx.createLinearGradient(
            midX + px * hw, midY + py * hw,
            midX - px * hw, midY - py * hw
          );

          if (curMoldingStyle === 'gold') {
            grad.addColorStop(0,    '#5a3d00');
            grad.addColorStop(0.15, '#b8860b');
            grad.addColorStop(0.35, '#ffd700');
            grad.addColorStop(0.5,  '#fff8c0');
            grad.addColorStop(0.65, '#ffd700');
            grad.addColorStop(0.85, '#b8860b');
            grad.addColorStop(1,    '#5a3d00');
          } else if (curMoldingStyle === 'black') {
            grad.addColorStop(0,    '#0a0a0a');
            grad.addColorStop(0.25, '#1c1c1c');
            grad.addColorStop(0.5,  '#383838');
            grad.addColorStop(0.75, '#1c1c1c');
            grad.addColorStop(1,    '#0a0a0a');
          } else if (curMoldingStyle === 'metallic') {
            grad.addColorStop(0,    '#4a4a4a');
            grad.addColorStop(0.2,  '#9a9a9a');
            grad.addColorStop(0.45, '#e8e8e8');
            grad.addColorStop(0.5,  '#ffffff');
            grad.addColorStop(0.55, '#e8e8e8');
            grad.addColorStop(0.8,  '#9a9a9a');
            grad.addColorStop(1,    '#4a4a4a');
          } else if (curMoldingStyle === 'brass') {
            grad.addColorStop(0,    '#2c1f00');
            grad.addColorStop(0.15, '#7a5918');
            grad.addColorStop(0.35, '#c49a27');
            grad.addColorStop(0.5,  '#e8c95a');
            grad.addColorStop(0.65, '#c49a27');
            grad.addColorStop(0.85, '#7a5918');
            grad.addColorStop(1,    '#2c1f00');
          }

          tCtx.save();
          tCtx.strokeStyle = grad;
          tCtx.lineWidth = curMoldingWidth;
          tCtx.lineCap = 'butt';
          tCtx.beginPath();
          tCtx.moveTo(topX, topY);
          tCtx.lineTo(botX, botY);
          tCtx.stroke();
          tCtx.restore();
        });
      }

      // Draw horizontal moldings on tempCanvas BEFORE mask (also eraseable)
      const curHMoldingStyle = hMoldingStyleRef.current;
      const curHMoldingWidth = hMoldingWidthRef.current;
      const curHPositions = hMoldingPositionsRef.current;
      if (curHMoldingStyle !== 'none' && curHPositions.length > 0) {
        curHPositions.forEach((r) => {
          // Left edge: lerp between pts[0] (top-left) and pts[3] (bottom-left)
          const lx = pts[0].x + (pts[3].x - pts[0].x) * r;
          const ly = pts[0].y + (pts[3].y - pts[0].y) * r;
          // Right edge: lerp between pts[1] (top-right) and pts[2] (bottom-right)
          const rx = pts[1].x + (pts[2].x - pts[1].x) * r;
          const ry = pts[1].y + (pts[2].y - pts[1].y) * r;

          const dx = rx - lx;
          const dy = ry - ly;
          const len = Math.sqrt(dx * dx + dy * dy);
          // Perpendicular unit vector (for gradient across molding thickness)
          const px = -dy / len;
          const py = dx / len;
          const hw = curHMoldingWidth / 2;
          const midX = (lx + rx) / 2;
          const midY = (ly + ry) / 2;

          const hGrad = tCtx.createLinearGradient(
            midX + px * hw, midY + py * hw,
            midX - px * hw, midY - py * hw
          );

          if (curHMoldingStyle === 'gold') {
            hGrad.addColorStop(0,    '#5a3d00');
            hGrad.addColorStop(0.15, '#b8860b');
            hGrad.addColorStop(0.35, '#ffd700');
            hGrad.addColorStop(0.5,  '#fff8c0');
            hGrad.addColorStop(0.65, '#ffd700');
            hGrad.addColorStop(0.85, '#b8860b');
            hGrad.addColorStop(1,    '#5a3d00');
          } else if (curHMoldingStyle === 'black') {
            hGrad.addColorStop(0,    '#0a0a0a');
            hGrad.addColorStop(0.25, '#1c1c1c');
            hGrad.addColorStop(0.5,  '#383838');
            hGrad.addColorStop(0.75, '#1c1c1c');
            hGrad.addColorStop(1,    '#0a0a0a');
          } else if (curHMoldingStyle === 'metallic') {
            hGrad.addColorStop(0,    '#4a4a4a');
            hGrad.addColorStop(0.2,  '#9a9a9a');
            hGrad.addColorStop(0.45, '#e8e8e8');
            hGrad.addColorStop(0.5,  '#ffffff');
            hGrad.addColorStop(0.55, '#e8e8e8');
            hGrad.addColorStop(0.8,  '#9a9a9a');
            hGrad.addColorStop(1,    '#4a4a4a');
          } else if (curHMoldingStyle === 'brass') {
            hGrad.addColorStop(0,    '#2c1f00');
            hGrad.addColorStop(0.15, '#7a5918');
            hGrad.addColorStop(0.35, '#c49a27');
            hGrad.addColorStop(0.5,  '#e8c95a');
            hGrad.addColorStop(0.65, '#c49a27');
            hGrad.addColorStop(0.85, '#7a5918');
            hGrad.addColorStop(1,    '#2c1f00');
          }

          tCtx.save();
          tCtx.strokeStyle = hGrad;
          tCtx.lineWidth = curHMoldingWidth;
          tCtx.lineCap = 'butt';
          tCtx.beginPath();
          tCtx.moveTo(lx, ly);
          tCtx.lineTo(rx, ry);
          tCtx.stroke();
          tCtx.restore();

          // Draw drag handle (visible when not erasing and not exporting)
          if (!curIsErasing && !forExportRef.current) {
            tCtx.save();
            tCtx.strokeStyle = 'rgba(255,255,255,0.6)';
            tCtx.lineWidth = 2;
            tCtx.setLineDash([6, 4]);
            tCtx.beginPath();
            tCtx.moveTo(lx, ly);
            tCtx.lineTo(rx, ry);
            tCtx.stroke();
            tCtx.restore();

            tCtx.save();
            tCtx.fillStyle = 'white';
            tCtx.strokeStyle = 'rgba(0,0,0,0.3)';
            tCtx.lineWidth = 1.5;
            tCtx.setLineDash([]);
            tCtx.beginPath();
            tCtx.arc(midX, midY, 8, 0, Math.PI * 2);
            tCtx.fill();
            tCtx.stroke();
            tCtx.fillStyle = '#555';
            tCtx.font = 'bold 10px sans-serif';
            tCtx.textAlign = 'center';
            tCtx.textBaseline = 'middle';
            tCtx.fillText('↕', midX, midY);
            tCtx.restore();
          }
        });
      }

      // Apply eraser mask — replay strokes from memory (never lost on canvas reset)
      if (maskStrokesRef.current.length > 0) {
        const tempMask = document.createElement('canvas');
        tempMask.width = width;
        tempMask.height = height;
        const mCtx = tempMask.getContext('2d')!;
        mCtx.fillStyle = 'black';
        maskStrokesRef.current.forEach(({ x, y, r }) => {
          mCtx.beginPath();
          mCtx.arc(x, y, r, 0, Math.PI * 2);
          mCtx.fill();
        });
        tCtx.globalCompositeOperation = 'destination-out';
        tCtx.drawImage(tempMask, 0, 0);
        tCtx.globalCompositeOperation = 'source-over';
      }

      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.restore();

      // Overlay original photo with 'multiply' blend to preserve room shadows & lighting
      ctx.save();
      ctx.globalAlpha = 0.38;
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(img, 0, 0, width, height);
      ctx.restore();
    }
  }, []);

  // Preload all panel texture images into cache; re-draw when each loads
  useEffect(() => {
    BAMBOO_PANELS.forEach(panel => {
      if (!panel.texture || textureCacheRef.current[panel.id]) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        textureCacheRef.current[panel.id] = img;
        drawFullScene();
      };
      img.src = panel.texture;
    });
  }, [drawFullScene]);

  // Find which divider (index) is near a given canvas point, or -1 if none
  const findNearDivider = useCallback((cx: number, cy: number): number => {
    const pts = pointsRef.current;
    const dividers = dividerPositionsRef.current;
    if (pts.length < 4) return -1;

    for (let d = 0; d < dividers.length; d++) {
      const ratio = dividers[d];
      const topX = pts[0].x + (pts[1].x - pts[0].x) * ratio;
      const topY = pts[0].y + (pts[1].y - pts[0].y) * ratio;
      const botX = pts[3].x + (pts[2].x - pts[3].x) * ratio;
      const botY = pts[3].y + (pts[2].y - pts[3].y) * ratio;
      const midX = (topX + botX) / 2;
      const midY = (topY + botY) / 2;

      const dist = Math.sqrt((cx - midX) ** 2 + (cy - midY) ** 2);
      if (dist <= DIVIDER_HIT_RADIUS * 2) return d;
    }
    return -1;
  }, []);

  // Convert a canvas X position to a wall ratio (0-1)
  const canvasXToWallRatio = useCallback((cx: number, cy: number): number => {
    const pts = pointsRef.current;
    if (pts.length < 4) return 0;

    // Project point onto the top edge interpolation
    const totalLen = Math.sqrt((pts[1].x - pts[0].x) ** 2 + (pts[1].y - pts[0].y) ** 2);
    if (totalLen === 0) return 0;
    const dx = pts[1].x - pts[0].x;
    const dy = pts[1].y - pts[0].y;
    const t = ((cx - pts[0].x) * dx + (cy - pts[0].y) * dy) / (totalLen * totalLen);
    return Math.max(0, Math.min(1, t));
  }, []);

  // Convert canvas position to wall VERTICAL ratio (0=top, 1=bottom)
  const canvasYToWallRatio = useCallback((cx: number, cy: number): number => {
    const pts = pointsRef.current;
    if (pts.length < 4) return 0;
    // Project onto the center vertical axis of the wall
    const topX = (pts[0].x + pts[1].x) / 2;
    const topY = (pts[0].y + pts[1].y) / 2;
    const botX = (pts[2].x + pts[3].x) / 2;
    const botY = (pts[2].y + pts[3].y) / 2;
    const dx = botX - topX;
    const dy = botY - topY;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return 0;
    const t = ((cx - topX) * dx + (cy - topY) * dy) / lenSq;
    return Math.max(0.02, Math.min(0.98, t));
  }, []);

  // Find which horizontal molding handle is near a canvas point, or -1
  const findNearHMolding = useCallback((cx: number, cy: number): number => {
    const pts = pointsRef.current;
    if (pts.length !== 4) return -1;
    const positions = hMoldingPositionsRef.current;
    for (let i = 0; i < positions.length; i++) {
      const r = positions[i];
      const lx = pts[0].x + (pts[3].x - pts[0].x) * r;
      const ly = pts[0].y + (pts[3].y - pts[0].y) * r;
      const rx = pts[1].x + (pts[2].x - pts[1].x) * r;
      const ry = pts[1].y + (pts[2].y - pts[1].y) * r;
      const midX = (lx + rx) / 2;
      const midY = (ly + ry) / 2;
      if (Math.sqrt((cx - midX) ** 2 + (cy - midY) ** 2) <= 14) return i;
    }
    return -1;
  }, []);

  // Initialize canvas only when image changes
  useEffect(() => {
    if (!image || !containerRef.current || !mainCanvasRef.current || !maskCanvasRef.current) return;
    const { width: cW, height: cH } = containerRef.current.getBoundingClientRect();
    const imgW = image.naturalWidth || image.width;
    const imgH = image.naturalHeight || image.height;
    const scale = Math.min(cW / imgW, cH / imgH);
    const drawW = Math.round(imgW * scale);
    const drawH = Math.round(imgH * scale);
    mainCanvasRef.current.width = drawW;
    mainCanvasRef.current.height = drawH;
    mainCanvasRef.current.style.width = `${drawW}px`;
    mainCanvasRef.current.style.height = `${drawH}px`;
    maskCanvasRef.current.width = drawW;
    maskCanvasRef.current.height = drawH;
    drawFullScene();
  }, [image, drawFullScene]);

  // Redraw on state changes without touching canvas dimensions
  useEffect(() => {
    if (!image) return;
    drawFullScene();
  }, [points, step, sectorMaterials, panelCount, dividerPositions, activeSector, isErasing, moldingStyle, moldingWidth, hMoldingStyle, hMoldingCount, hMoldingWidth, hMoldingPositions, lightMode, drawFullScene, image]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const getScreenCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    if (isErasing) {
      // snapshot current stroke count so we can undo this drag
      maskUndoStackRef.current.push(maskStrokesRef.current.length);
      return;
    }
    if (step !== 'edit') return;
    const { x, y } = getCanvasCoords(e);
    const hIdx = findNearHMolding(x, y);
    if (hIdx !== -1) {
      draggingHMoldingIndexRef.current = hIdx;
      return;
    }
    const divIdx = findNearDivider(x, y);
    if (divIdx !== -1) {
      pushHistory();
      draggingDividerIndexRef.current = divIdx;
      setIsDraggingDivider(true);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    draggingDividerIndexRef.current = null;
    draggingHMoldingIndexRef.current = null;
    setIsDraggingDivider(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x: sx, y: sy } = getScreenCoords(e);
    setMousePos({ x: sx, y: sy });

    const { x, y } = getCanvasCoords(e);

    // Dragging a horizontal molding
    if (!isErasing && draggingHMoldingIndexRef.current !== null) {
      const idx = draggingHMoldingIndexRef.current;
      const newRatio = canvasYToWallRatio(x, y);
      setHMoldingPositions(prev => {
        const updated = [...prev];
        updated[idx] = newRatio;
        return [...updated].sort((a, b) => a - b);
      });
      return;
    }

    // Dragging a vertical divider
    if (!isErasing && draggingDividerIndexRef.current !== null) {
      const idx = draggingDividerIndexRef.current;
      const newRatio = canvasXToWallRatio(x, y);
      setDividerPositions(prev => {
        const updated = [...prev];
        const minLeft = idx === 0 ? MIN_PANEL_RATIO : updated[idx - 1] + MIN_PANEL_RATIO;
        const maxRight = idx === updated.length - 1 ? 1 - MIN_PANEL_RATIO : updated[idx + 1] - MIN_PANEL_RATIO;
        updated[idx] = Math.max(minLeft, Math.min(maxRight, newRatio));
        return updated;
      });
      return;
    }

    // Eraser drawing — store strokes in memory so they survive any canvas reset
    if (isErasing && isDrawing) {
      const canvas = mainCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      maskStrokesRef.current.push({ x, y, r: (brushSize / 2) * scaleX });
      drawFullScene();
    }

    // Update cursor based on proximity to handles
    if (step === 'edit' && !isErasing && mainCanvasRef.current) {
      if (findNearHMolding(x, y) !== -1) {
        mainCanvasRef.current.style.cursor = 'ns-resize';
      } else if (findNearDivider(x, y) !== -1) {
        mainCanvasRef.current.style.cursor = 'ew-resize';
      } else {
        mainCanvasRef.current.style.cursor = 'pointer';
      }
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isErasing || isDraggingDivider) return;
    const { x, y } = getCanvasCoords(e);

    // Don't trigger sector selection if click was near a divider or h-molding handle
    if (step === 'edit' && (findNearDivider(x, y) !== -1 || findNearHMolding(x, y) !== -1)) return;

    if (step === 'mark' && points.length < 4) {
      setPoints([...points, { x, y }]);
    } else if (step === 'edit') {
      // Determine which sector was clicked using divider positions
      const pts = pointsRef.current;
      if (pts.length < 4) return;
      const ratio = canvasXToWallRatio(x, y);
      const bounds = getSectorBounds(dividerPositionsRef.current, panelCountRef.current);
      const idx = bounds.findIndex(b => ratio >= b.start && ratio <= b.end);
      if (idx !== -1) {
        setActiveSector(idx === activeSector ? null : idx);
      }
    }
  };

  const clearMask = () => {
    maskStrokesRef.current = [];
    maskUndoStackRef.current = [];
    drawFullScene();
  };

  const undoEraserStroke = () => {
    if (maskUndoStackRef.current.length === 0) return;
    const prevLen = maskUndoStackRef.current.pop()!;
    maskStrokesRef.current = maskStrokesRef.current.slice(0, prevLen);
    drawFullScene();
  };

  const handleSave = () => {
    if (!mainCanvasRef.current) return;
    // Redraw without UI elements, then save, then restore
    forExportRef.current = true;
    drawFullScene();
    const dataUrl = mainCanvasRef.current.toDataURL('image/png');
    forExportRef.current = false;
    drawFullScene();

    const link = document.createElement('a');
    link.download = 'bamboo-studio-project.png';
    link.href = dataUrl;
    link.click();
  };

  const handleChangePanelCount = (count: number) => {
    pushHistory();
    setPanelCount(count);
    setDividerPositions(makeEqualDividers(count));
    setActiveSector(null);
  };

  const handleResetWidths = () => {
    setDividerPositions(makeEqualDividers(panelCount));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (f) => {
        const img = new Image();
        img.onload = () => {
          maskStrokesRef.current = [];
          setImage(img);
          setStep('mark');
          setPoints([]);
          setSectorMaterials({});
          setActiveSector(null);
          setIsErasing(false);
          setPanelCount(5);
          setDividerPositions(makeEqualDividers(5));
        };
        img.src = f.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Compact molding style selector used in both v/h molding panels
  const MoldingStyleRow = ({
    value, onChange, vertical,
  }: { value: string; onChange: (v: 'none'|'gold'|'black'|'metallic'|'brass') => void; vertical: boolean }) => {
    const opts = [
      { id: 'none',     label: 'Нет',  preview: 'bg-gray-100' },
      { id: 'gold',     label: 'Злт',  preview: vertical ? 'bg-gradient-to-r from-yellow-900 via-yellow-300 to-yellow-900' : 'bg-gradient-to-b from-yellow-900 via-yellow-300 to-yellow-900' },
      { id: 'black',    label: 'Чрн',  preview: vertical ? 'bg-gradient-to-r from-black via-gray-600 to-black'            : 'bg-gradient-to-b from-black via-gray-600 to-black' },
      { id: 'metallic', label: 'Мтл',  preview: vertical ? 'bg-gradient-to-r from-gray-500 via-white to-gray-500'         : 'bg-gradient-to-b from-gray-500 via-white to-gray-500' },
      { id: 'brass',    label: 'Лтн',  preview: vertical ? 'bg-gradient-to-r from-yellow-950 via-yellow-500 to-yellow-950' : 'bg-gradient-to-b from-yellow-950 via-yellow-500 to-yellow-950' },
    ] as const;
    return (
      <div className="grid grid-cols-5 gap-1">
        {opts.map(o => (
          <button key={o.id} onClick={() => onChange(o.id)}
            className={`flex flex-col items-center gap-1 transition-all ${value === o.id ? 'opacity-100' : 'opacity-40'}`}>
            <div className={`w-full h-5 rounded border-[1.5px] ${o.preview} ${value === o.id ? 'border-black shadow-sm' : 'border-transparent'}`} />
            <span className="text-[7px] font-bold uppercase text-gray-500 leading-none">{o.label}</span>
          </button>
        ))}
      </div>
    );
  };

  const toolRef = useRef<HTMLElement>(null);
  const scrollToTool = () => toolRef.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="bg-white text-[#1d1d1f] font-sans antialiased">

      {/* ══════════════════════════════════════════
          WEBSITE HEADER — allwall.ru style
      ══════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-[#1c1c1c] text-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          {/* Logo */}
          <a href="https://allwall.ru" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 shrink-0">
            <img src="/favicon.jpg" alt="ALL WALL" className="h-9 w-9 object-contain rounded"/>
            <div className="leading-none">
              <div className="font-black text-base tracking-widest">ALL WALL</div>
              <div className="text-[9px] text-gray-400 tracking-widest uppercase mt-0.5">Технология быстрого монтажа</div>
            </div>
          </a>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
            <a href="https://allwall.ru/catalog/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Каталог</a>
            <a href="https://allwall.ru/about/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">О компании</a>
            <button onClick={scrollToTool} className="hover:text-white transition-colors text-[#7ec662]">Визуализатор</button>
          </nav>

          {/* Phone */}
          <a href="tel:+74951510946" className="shrink-0 text-sm font-bold text-white hover:text-[#7ec662] transition-colors hidden sm:block">
            +7 (495) 151-09-46
          </a>
        </div>
      </header>

      {/* ══════════════════════════════════════════
          HERO — описание и инструкция
      ══════════════════════════════════════════ */}
      <section className="bg-[#1c1c1c] text-white pt-12 pb-14 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-black leading-tight mb-5">
            Визуализатор<br/>стеновых панелей
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-9 leading-relaxed">
            Загрузите фотографию вашего интерьера и посмотрите, как будут выглядеть панели ALL WALL прямо на вашей стене — до покупки и монтажа.
          </p>

          {/* Steps */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-9 text-left">
            {[
              { n: '01', title: 'Загрузите фото', desc: 'Любое фото интерьера с вашей стеной — JPG, PNG или WEBP.' },
              { n: '02', title: 'Отметьте стену', desc: 'Кликните по 4 углам стены по часовой стрелке.' },
              { n: '03', title: 'Подберите панели', desc: 'Выбирайте из 81 варианта — текстуры, цвета, молдинги.' },
              { n: '04', title: 'Сохраните результат', desc: 'Скачайте PNG и покажите дизайнеру или в магазин.' },
            ].map(s => (
              <div key={s.n} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-colors">
                <div className="text-[#7ec662] text-3xl font-black mb-3 leading-none">{s.n}</div>
                <div className="font-bold text-white mb-2 text-sm">{s.title}</div>
                <div className="text-gray-400 text-xs leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>

          <button onClick={scrollToTool}
            className="inline-flex items-center gap-2 bg-[#7ec662] hover:bg-[#6ab352] text-black font-black text-sm px-8 py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-green-900/30">
            Начать подбор
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
          </button>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          APP TOOL
      ══════════════════════════════════════════ */}
      <section ref={toolRef} id="tool" className="flex flex-col bg-[#ebebed] md:h-[calc(100vh-64px)]">
        {/* ── App Nav ── */}
        <nav className="h-12 shrink-0 border-b border-gray-200 bg-white/90 backdrop-blur-xl flex justify-between items-center px-5 z-40">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
              <Layout className="text-white w-4 h-4" />
            </div>
            <span className="font-bold text-sm tracking-tight">BambooStudio Pro</span>
          </div>
          <div className="flex items-center gap-3">
            {step === 'edit' && (
              <button onClick={undo} className="text-xs font-medium text-gray-400 hover:text-black flex items-center gap-1.5 transition-colors" title="Ctrl+Z">
                <Undo2 size={13} /> Отменить
              </button>
            )}
            <button
              onClick={() => { maskStrokesRef.current = []; historyRef.current = []; setStep('upload'); setImage(null); setPoints([]); setSectorMaterials({}); setActiveSector(null); setIsErasing(false); }}
              className="text-xs font-medium text-gray-400 hover:text-black flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw size={13} /> Сброс
            </button>
          </div>
        </nav>

        {/* ── Main: canvas + right tool panel ── */}
        <div className="flex-1 flex flex-col md:flex-row gap-3 p-3 overflow-y-auto md:overflow-hidden md:min-h-0">

        {/* ── Canvas area ── */}
        <div className="flex-1 relative min-w-0 min-h-[55vw] md:min-h-0">
          {step === 'upload' ? (
            <label className="relative flex flex-col items-center justify-center w-full h-full rounded-3xl border-2 border-dashed border-gray-300 cursor-pointer overflow-hidden shadow-sm group">
              {/* Background image at 50% opacity */}
              <div className="absolute inset-0 bg-cover bg-center transition-opacity group-hover:opacity-60"
                style={{ backgroundImage: 'url(/upload-bg.jpg)', opacity: 0.5 }} />
              {/* White tint overlay */}
              <div className="absolute inset-0 bg-white/40" />
              {/* Content */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 shadow-md">
                  <Upload className="text-gray-500 w-7 h-7" />
                </div>
                <p className="text-sm font-bold text-gray-700 drop-shadow">Загрузите фото интерьера</p>
                <p className="text-xs text-gray-500 mt-1 drop-shadow">JPG, PNG, WEBP</p>
              </div>
              <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
            </label>
          ) : (
            <div ref={containerRef} className="relative w-full h-full bg-gray-100 rounded-3xl overflow-hidden shadow-sm border border-gray-200 flex items-center justify-center">
              <canvas
                ref={mainCanvasRef}
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="touch-none block"
                style={{ cursor: isErasing ? 'none' : step === 'mark' ? 'crosshair' : 'pointer', maxWidth: '100%', maxHeight: '100%' }}
              />
              <canvas ref={maskCanvasRef} className="hidden" />

              {isErasing && (
                <div className="absolute pointer-events-none border-2 border-white rounded-full mix-blend-difference bg-white/10"
                  style={{ left: mousePos.x, top: mousePos.y, width: brushSize, height: brushSize, transform: 'translate(-50%,-50%)', zIndex: 100 }} />
              )}
              {step === 'mark' && (
                <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-white/90 text-black px-5 py-1.5 rounded-full text-[10px] font-bold shadow-lg backdrop-blur-md border border-gray-100 uppercase tracking-widest pointer-events-none">
                  {points.length < 4 ? `Кликните на угол стены (${points.length}/4)` : 'Нажмите «Начать примерку»'}
                </div>
              )}
              {step === 'edit' && !isErasing && (
                <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-white/90 text-black px-5 py-1.5 rounded-full text-[10px] font-bold shadow-lg backdrop-blur-md border border-gray-100 uppercase tracking-widest pointer-events-none">
                  {isDraggingDivider ? 'Перемещайте разделитель' : 'Выберите панель или перетащите разделитель'}
                </div>
              )}
              {step === 'edit' && isErasing && (
                <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-red-500 text-white px-5 py-1.5 rounded-full text-[10px] font-bold shadow-lg uppercase tracking-widest pointer-events-none">
                  Режим ластика — рисуйте для удаления
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right tool panel ── */}
        <div className="w-full md:w-[232px] shrink-0 flex flex-col gap-2 overflow-y-auto pb-4 md:pb-1" style={{ scrollbarWidth: 'none' }}>

          {/* MARK step */}
          {step === 'mark' && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-1.5 mb-3">
                <Check size={12} className="text-gray-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Разметка стены</span>
              </div>
              <p className="text-[9px] text-gray-400 mb-4 leading-relaxed">Кликайте по 4 углам стены по часовой стрелке.</p>
              <div className="flex justify-between mb-5">
                {[1,2,3,4].map(i => (
                  <div key={i} className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${points.length >= i ? 'bg-black text-white border-black' : 'text-gray-200 border-gray-100'}`}>
                    {points.length >= i ? <Check size={13}/> : i}
                  </div>
                ))}
              </div>
              {points.length > 0 && (
                <button onClick={() => setPoints(points.slice(0,-1))}
                  className="w-full mb-2 py-1.5 text-[9px] font-bold text-gray-400 hover:text-red-500 flex items-center justify-center gap-1 transition-colors">
                  <Undo2 size={11}/> Отменить точку
                </button>
              )}
              <button disabled={points.length < 4} onClick={() => setStep('edit')}
                className="w-full py-3 bg-black text-white rounded-xl text-xs font-bold shadow disabled:opacity-20 transition-all active:scale-95">
                Начать примерку
              </button>
            </div>
          )}

          {/* EDIT step tools */}
          {step === 'edit' && (<>

            {/* Panels */}
            <div className="bg-white rounded-2xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Columns size={12} className="text-gray-400"/>
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Панели</span>
                </div>
                <button onClick={handleResetWidths} className="text-[8px] font-bold text-gray-300 hover:text-black transition-colors uppercase tracking-wide">сброс</button>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-[9px] text-gray-400 font-bold uppercase">Количество</span>
                <span className="text-[9px] font-bold">{panelCount}</span>
              </div>
              <input type="range" min="1" max="15" value={panelCount}
                onChange={(e) => handleChangePanelCount(parseInt(e.target.value))}
                className="w-full h-0.5 bg-gray-100 rounded-full appearance-none accent-black"/>
            </div>

            {/* Eraser */}
            <div className={`rounded-2xl p-3.5 shadow-sm transition-colors ${isErasing ? 'bg-red-50 ring-2 ring-red-400' : 'bg-white'}`}>
              <div className="flex items-center gap-1.5 mb-2.5">
                <Eraser size={12} className={isErasing ? 'text-red-400' : 'text-gray-400'}/>
                <span className={`text-[9px] font-black uppercase tracking-widest ${isErasing ? 'text-red-400' : 'text-gray-400'}`}>Ластик</span>
              </div>
              <button
                onClick={() => { setIsErasing(!isErasing); setActiveSector(null); }}
                className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  isErasing
                    ? 'bg-red-500 text-white shadow-md shadow-red-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}>
                <Eraser size={14}/>
                {isErasing ? 'Ластик включён — рисуйте' : 'Включить ластик'}
              </button>
              <div className="flex justify-between mt-3 mb-1">
                <span className="text-[9px] text-gray-400 font-bold uppercase">Размер кисти</span>
                <span className="text-[9px] font-bold">{brushSize}px</span>
              </div>
              <input type="range" min="10" max="150" value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-full h-0.5 bg-gray-100 rounded-full appearance-none accent-black"/>
              <div className="flex gap-1.5 mt-2.5">
                <button onClick={undoEraserStroke}
                  className="flex-1 py-1.5 text-[8px] font-bold text-gray-400 hover:text-black flex items-center justify-center gap-1 transition-colors border border-gray-100 rounded-lg hover:border-gray-300">
                  <Undo2 size={9}/> Отмена
                </button>
                <button onClick={clearMask}
                  className="flex-1 py-1.5 text-[8px] font-bold text-gray-400 hover:text-red-500 flex items-center justify-center gap-1 transition-colors border border-gray-100 rounded-lg hover:border-red-200">
                  <RotateCcw size={9}/> Сброс
                </button>
              </div>
            </div>

            {/* Material */}
            <div className="bg-white rounded-2xl p-3.5 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-700 to-yellow-400 shrink-0"/>
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Материал</span>
              </div>
              <p className="text-[8px] text-gray-400 font-bold italic mb-2">
                {activeSector !== null ? `Панель №${activeSector + 1} — выберите материал` : 'Кликните по панели → выберите материал'}
              </p>
              <SeriesAccordion
                series={PANEL_SERIES as PanelSeries[]}
                openIds={openSeries}
                onToggle={toggleSeries}
                selectedId={activeSector !== null ? sectorMaterials[activeSector]?.id : undefined}
                onSelect={(panel) => {
                  pushHistory();
                  if (activeSector !== null) {
                    setSectorMaterials({ ...sectorMaterials, [activeSector]: panel });
                  } else {
                    const all: Record<number, Panel> = {};
                    for (let i = 0; i < panelCount; i++) all[i] = panel;
                    setSectorMaterials(all);
                  }
                  // Auto-collapse all series except the one with the selected panel
                  const owner = (PANEL_SERIES as PanelSeries[]).find(s => s.panels.some(p => p.id === panel.id));
                  if (owner) setOpenSeries(new Set([owner.id]));
                }}
              />
            </div>

            {/* Vertical molding */}
            {panelCount > 1 && (
              <div className="bg-white rounded-2xl p-3.5 shadow-sm">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <div className="w-0.5 h-3.5 bg-yellow-500 rounded-full"/>
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Молдинг верт.</span>
                </div>
                <MoldingStyleRow value={moldingStyle} onChange={(v) => { setMoldingStyle(v); if (v !== 'none') setMoldingWidth(1); }} vertical={true}/>
                {moldingStyle !== 'none' && (
                  <div className="mt-2.5">
                    <div className="flex justify-between mb-1">
                      <span className="text-[9px] text-gray-400 font-bold uppercase">Толщина</span>
                      <span className="text-[9px] font-bold">{moldingWidth}px</span>
                    </div>
                    <input type="range" min="1" max="4" value={moldingWidth}
                      onChange={(e) => setMoldingWidth(parseInt(e.target.value))}
                      className="w-full h-0.5 bg-gray-100 rounded-full appearance-none accent-black"/>
                  </div>
                )}
              </div>
            )}

            {/* Horizontal molding */}
            <div className="bg-white rounded-2xl p-3.5 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2.5">
                <div className="w-3.5 h-0.5 bg-yellow-500 rounded-full"/>
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Молдинг гориз.</span>
              </div>
              <MoldingStyleRow value={hMoldingStyle} onChange={(v) => { setHMoldingStyle(v); if (v !== 'none') setHMoldingWidth(1); }} vertical={false}/>
              {hMoldingStyle !== 'none' && (
                <div className="mt-2.5 space-y-2.5">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[9px] text-gray-400 font-bold uppercase">Количество</span>
                      <span className="text-[9px] font-bold">{hMoldingPositions.length}</span>
                    </div>
                    <input type="range" min="1" max="5" value={hMoldingCount}
                      onChange={(e) => {
                        const n = parseInt(e.target.value);
                        setHMoldingCount(n);
                        setHMoldingPositions(Array.from({length:n},(_,i)=>(i+1)/(n+1)));
                      }}
                      className="w-full h-0.5 bg-gray-100 rounded-full appearance-none accent-black"/>
                    <button onClick={() => setHMoldingPositions(Array.from({length:hMoldingCount},(_,i)=>(i+1)/(hMoldingCount+1)))}
                      className="w-full mt-1.5 py-1 text-[8px] font-bold text-gray-300 hover:text-black flex items-center justify-center gap-1 transition-colors">
                      <Undo2 size={9}/> Выровнять
                    </button>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[9px] text-gray-400 font-bold uppercase">Толщина</span>
                      <span className="text-[9px] font-bold">{hMoldingWidth}px</span>
                    </div>
                    <input type="range" min="1" max="4" value={hMoldingWidth}
                      onChange={(e) => setHMoldingWidth(parseInt(e.target.value))}
                      className="w-full h-0.5 bg-gray-100 rounded-full appearance-none accent-black"/>
                  </div>
                </div>
              )}
            </div>

            {/* Light mode */}
            <div className="bg-white rounded-2xl p-3.5 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Sun size={12} className="text-gray-400"/>
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Освещение</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { key: 'off',     label: 'Выкл',  icon: null },
                  { key: 'morning', label: 'Утро',  icon: 'sun'  },
                  { key: 'evening', label: 'Вечер', icon: 'moon' },
                ] as const).map(({ key, label, icon }) => (
                  <button key={key} onClick={() => setLightMode(key)}
                    className={`py-2 rounded-xl text-[9px] font-bold flex flex-col items-center gap-1 transition-all active:scale-95 ${
                      lightMode === key
                        ? key === 'morning' ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-300'
                          : key === 'evening' ? 'bg-amber-50 text-amber-600 ring-2 ring-amber-300'
                          : 'bg-gray-100 text-gray-700 ring-2 ring-gray-300'
                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                    }`}>
                    {icon === 'sun'  && <Sun  size={14}/>}
                    {icon === 'moon' && <Moon size={14}/>}
                    {!icon && <span className="text-[10px]">○</span>}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Save */}
            <button onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 bg-black text-white text-xs font-bold py-3 rounded-2xl hover:bg-gray-800 transition-all active:scale-95 mt-1 shadow-sm">
              <Download size={13} /> Сохранить PNG
            </button>

          </>)}
        </div>
      </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER — allwall.ru style
      ══════════════════════════════════════════ */}
      <footer className="bg-[#1c1c1c] text-white pt-14 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-10 border-b border-white/10">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <img src="/favicon.jpg" alt="ALL WALL" className="h-8 w-8 object-contain rounded"/>
                <div>
                  <div className="font-black text-sm tracking-widest">ALL WALL</div>
                  <div className="text-[8px] text-gray-500 tracking-widest uppercase">Технология быстрого монтажа</div>
                </div>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Стеновые панели нового поколения. Быстрый монтаж. Премиальный результат.
              </p>
            </div>

            {/* Каталог */}
            <div>
              <button
                className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 md:cursor-default"
                onClick={() => setFooterCatalogOpen(o => !o)}
              >
                <span>Каталог</span>
                <span className="md:hidden text-gray-600">{footerCatalogOpen ? '▲' : '▼'}</span>
              </button>
              <ul className={`space-y-2.5 text-sm text-gray-400 ${footerCatalogOpen ? 'block' : 'hidden'} md:block`}>
                {['Металл', 'Soft-touch / Кожа', 'Жидкий металл', 'Частицы', 'Щебень / Камень', 'Патина / Медь'].map(t => (
                  <li key={t}><a href="https://allwall.ru/catalog/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{t}</a></li>
                ))}
              </ul>
            </div>

            {/* Покупателям */}
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">Покупателям</div>
              <ul className="space-y-2.5 text-sm text-gray-400">
                {[
                  { label: 'Доставка и оплата', href: 'https://allwall.ru/delivery/' },
                  { label: 'Монтаж', href: 'https://allwall.ru/installation/' },
                  { label: 'Точки продаж', href: 'https://allwall.ru/dealers/' },
                  { label: 'О компании', href: 'https://allwall.ru/about/' },
                  { label: 'Контакты', href: 'https://allwall.ru/contacts/' },
                ].map(l => (
                  <li key={l.label}><a href={l.href} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{l.label}</a></li>
                ))}
              </ul>
            </div>

            {/* Контакты */}
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">Контакты</div>
              <div className="space-y-3 text-sm text-gray-400">
                <div>
                  <a href="tel:+74951510946" className="text-white font-bold text-base hover:text-[#7ec662] transition-colors">+7 (495) 151-09-46</a>
                </div>
                <div>
                  <a href="mailto:info@allwall.ru" className="hover:text-white transition-colors">info@allwall.ru</a>
                </div>
                <div className="text-xs leading-relaxed pt-1">
                  Доставка по России и СНГ
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-gray-600">
            <span>© 2024 ALL WALL. Все права защищены.</span>
            <a href="https://allwall.ru/privacy/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400 transition-colors">Политика конфиденциальности</a>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default BambooStudio;
