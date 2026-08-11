import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Layout, Eraser, RotateCcw, Download, Check, Columns, Undo2, Sun, Moon, FileText } from 'lucide-react';
import { PANEL_H_MM, PANEL_W_MM, PANEL_AREA_M2, optimizedPanelCalc, packWidthRemainders, packProfileRuns, columnHiddenJoints, packWindowPieces, windowStdPieces, panelsWord, rowsWord } from './lib/panelCalc';

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
    id: 'reiki', name: 'Рейки (деревянные)',
    panels: [
      { id: 'RK-468', article: 'RK-468', name: 'Дуб светлый',          color: '#d4c090', texture: `${BASE}textures/tex-468.jpg`, textureStretch: true, slatOverlay: true },
      { id: 'RK-443', article: 'RK-443', name: 'Дуб кремовый',         color: '#d0c0a0', texture: `${BASE}textures/tex-443.jpg`, textureStretch: true, slatOverlay: true },
      { id: 'RK-457', article: 'RK-457', name: 'Дуб натуральный',      color: '#c8a870', texture: `${BASE}textures/tex-457.jpg`, textureStretch: true, slatOverlay: true },
      { id: 'RK-464', article: 'RK-464', name: 'Орех медовый',         color: '#b89060', texture: `${BASE}textures/tex-464.jpg`, textureStretch: true, slatOverlay: true },
      { id: 'RK-459', article: 'RK-459', name: 'Дуб беж',              color: '#c0a880', texture: `${BASE}textures/tex-459.jpg`, textureStretch: true, slatOverlay: true },
      { id: 'RK-444', article: 'RK-444', name: 'Дуб тоффи',            color: '#b09880', texture: `${BASE}textures/tex-444.jpg`, textureStretch: true, slatOverlay: true },
      { id: 'RK-445', article: 'RK-445', name: 'Дуб гриж',             color: '#a89070', texture: `${BASE}textures/tex-445.jpg`, textureStretch: true, slatOverlay: true },
      { id: 'RK-469', article: 'RK-469', name: 'Дуб тёплый серый',     color: '#908070', texture: `${BASE}textures/tex-469.jpg`, textureStretch: true, slatOverlay: true },
      { id: 'RK-458', article: 'RK-458', name: 'Ясень серебро',        color: '#b0b0a8', texture: `${BASE}textures/tex-458.jpg`, textureStretch: true, slatOverlay: true },
      { id: 'RK-452', article: 'RK-452', name: 'Дуб серый',            color: '#909898', texture: `${BASE}textures/tex-452.jpg`, textureStretch: true, slatOverlay: true },
      { id: 'RK-465', article: 'RK-465', name: 'Дуб холодный серый',   color: '#808888', texture: `${BASE}textures/tex-465.jpg`, textureStretch: true, slatOverlay: true },
      { id: 'RK-456', article: 'RK-456', name: 'Дуб сланец',           color: '#707068', texture: `${BASE}textures/tex-456.jpg`, textureStretch: true, slatOverlay: true },
      { id: 'RK-449', article: 'RK-449', name: 'Дуб тёмно-коричн.',    color: '#6a5040', texture: `${BASE}textures/tex-449.jpg`, textureStretch: true, slatOverlay: true },
      { id: 'RK-451', article: 'RK-451', name: 'Дуб эспрессо',         color: '#483830', texture: `${BASE}textures/tex-451.jpg`, textureStretch: true, slatOverlay: true },
      { id: 'RK-466', article: 'RK-466', name: 'Орех тёмный',          color: '#503828', texture: `${BASE}textures/tex-466.jpg`, textureStretch: true, slatOverlay: true },
      { id: 'RK-450', article: 'RK-450', name: 'Дуб эбони',            color: '#1c1614', texture: `${BASE}textures/tex-450.jpg`, textureStretch: true, slatOverlay: true },
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

type Panel = { id: string; article: string; name: string; color: string; texture: string; textureScale?: number; textureStretch?: boolean; slatOverlay?: boolean };
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

type MoldingStyle = 'none' | 'gold' | 'black' | 'metallic' | 'brass';
type SurfaceConfig = {
  panelCount: number;
  dividerPositions: number[];
  sectorMaterials: Record<number, Panel>;
  moldingStyle: MoldingStyle;
  moldingWidth: number;
  hMoldingStyle: MoldingStyle;
  hMoldingCount: number;
  hMoldingWidth: number;
  hMoldingPositions: number[];
  wallWidthMm: number;   // 0 = not specified
  wallHeightMm: number;  // 0 = not specified
};
const defaultSurfaceConfig = (): SurfaceConfig => ({
  panelCount: 5,
  dividerPositions: makeEqualDividers(5),
  sectorMaterials: {},
  moldingStyle: 'none',
  moldingWidth: 1,
  hMoldingStyle: 'none',
  hMoldingCount: 1,
  hMoldingWidth: 1,
  hMoldingPositions: [0.5],
  wallWidthMm: 0,
  wallHeightMm: 0,
});

const SURFACE_LABELS = ['Стена 1 · Основная', 'Стена 2', 'Стена 3'];
const COLUMN_SURFACE_LABELS = ['Грань 1 · Основная', 'Грань 2', 'Грань 3'];
const WINDOW_STD_LABELS = ['Откос', 'Подоконник', '—'];
const TV_ZONE_LABELS = ['Передняя · Основная', 'Верхняя', 'Боковая'];
const WINDOW_PAN_LABELS = ['Откос', 'Горизонтальная плоскость', '—'];

// ── Column (колонна) shapes & perimeter helpers ──
type ColumnShape = 'rect' | 'round' | 'triangle';
const COLUMN_SHAPE_LABELS: Record<ColumnShape, string> = {
  rect: 'Прямоугольная', round: 'Круглая / овальная', triangle: 'Треугольная',
};
// sides (mm): rect — 4 стороны; round — [d1, d2] (d2=0 → круг); triangle — 3 стороны
const columnPerimeterMm = (shape: ColumnShape, sides: number[]): number => {
  if (shape === 'rect') return (sides[0] || 0) + (sides[1] || 0) + (sides[2] || 0) + (sides[3] || 0);
  if (shape === 'round') {
    const d1 = sides[0] || 0, d2 = sides[1] || 0;
    if (d1 <= 0) return 0;
    return d2 > 0 ? Math.PI * (d1 + d2) / 2 : Math.PI * d1; // овал — приближение по двум диаметрам
  }
  return (sides[0] || 0) + (sides[1] || 0) + (sides[2] || 0);
};
const columnSizesText = (shape: ColumnShape, sides: number[]): string => {
  const m = (v: number) => (v / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  if (shape === 'rect') return `стороны ${m(sides[0]||0)} × ${m(sides[1]||0)} × ${m(sides[2]||0)} × ${m(sides[3]||0)} м`;
  if (shape === 'round') return (sides[1]||0) > 0 ? `диаметры ${m(sides[0]||0)} × ${m(sides[1]||0)} м` : `диаметр ${m(sides[0]||0)} м`;
  return `стороны ${m(sides[0]||0)} × ${m(sides[1]||0)} × ${m(sides[2]||0)} м`;
};

// Retail price (RUB per panel) by series — placeholder pricing, editable
const SERIES_PRICES: Record<string, number> = {
  'metall-25': 6900, 'liqmetall-25': 6900, 'pet-25': 5900, 'galv-15': 5400,
  'liqmetall-10': 4900, 'particles-10': 4900, 'stone-gravel': 4500,
  'patina-copper': 4500, 'linen-cement': 3900, 'rainbow': 5900,
  'mirror-gloss': 6400, 'wood': 5200, 'reiki': 7900, 'soft-touch': 4700,
};
const PANEL_TO_SERIES: Record<string, string> = {};
PANEL_SERIES.forEach(sr => sr.panels.forEach(pl => { PANEL_TO_SERIES[pl.id] = sr.id; }));
const getPanelPrice = (panelId: string) => SERIES_PRICES[PANEL_TO_SERIES[panelId] ?? ''] ?? 4900;

// Profile (molding) catalogue info for the commercial proposal
// Panel cut-optimization math lives in lib/panelCalc.ts (unit-tested).

const MOLDING_INFO: Record<string, { article: string; name: string; price: number }> = {
  gold:     { article: 'PR-GOLD',  name: 'Профиль золото',        price: 990 },
  black:    { article: 'PR-BLACK', name: 'Профиль чёрный',        price: 890 },
  metallic: { article: 'PR-METAL', name: 'Профиль металлик',      price: 940 },
  brass:    { article: 'PR-BRASS', name: 'Профиль латунь',        price: 990 },
};

// Meter input that keeps its own text while typing — a controlled type="number"
// bound to parseFloat eats the leading «0» of values like «0,5» mid-typing
const MeterInput = ({ valueMm, onChangeMm, placeholder }: {
  valueMm: number; onChangeMm: (mm: number) => void; placeholder?: string;
}) => {
  const [text, setText] = useState(valueMm > 0 ? String(valueMm / 1000).replace('.', ',') : '');
  useEffect(() => {
    // Sync from the prop whenever it disagrees with what the current text means —
    // covers external resets/surface switches without clobbering in-progress typing
    // (partial input like «0,» still parses to the same mm value, so it is kept)
    const parsed = parseFloat(text.replace(',', '.'));
    const textMm = Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 1000) : 0;
    if (valueMm !== textMm) {
      setText(valueMm > 0 ? String(valueMm / 1000).replace('.', ',') : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueMm]);
  return (
    <input type="text" inputMode="decimal" placeholder={placeholder}
      value={text}
      onChange={(e) => {
        const t = e.target.value;
        setText(t);
        const v = parseFloat(t.replace(',', '.'));
        const mm = Number.isFinite(v) && v > 0 ? Math.round(v * 1000) : 0;
        onChangeMm(mm);
      }}
      className="w-full mt-0.5 px-2 py-1.5 text-[11px] font-bold border border-gray-200 rounded-lg focus:outline-none focus:border-[#7ec662]" />
  );
};

const CornerTypeCheckboxes = ({ nJunctions, cornerTypes, setCornerTypes, wrapJunctions, setWrapJunctions }: {
  nJunctions: number;
  cornerTypes: ('external' | 'internal')[];
  setCornerTypes: React.Dispatch<React.SetStateAction<('external' | 'internal')[]>>;
  wrapJunctions: boolean[];
  setWrapJunctions: React.Dispatch<React.SetStateAction<boolean[]>>;
}) => (
  <div className="space-y-2.5">
    {Array.from({ length: nJunctions }, (_, j) => (
      <div key={j}>
        <p className="text-[8px] text-gray-400 mb-1 font-bold">Угол между стенами {j + 1} и {j + 2}:</p>
        <div className="flex gap-3">
          {([['external', '↗ Наружный'], ['internal', '↙ Внутренний']] as const).map(([val, label]) => (
            <label key={val} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={cornerTypes[j] === val}
                onChange={() => setCornerTypes(prev => { const next = [...prev]; next[j] = val; return next; })}
                className="w-3.5 h-3.5 rounded border-gray-300 accent-black"
              />
              <span className={`text-[9px] font-bold ${cornerTypes[j] === val ? 'text-black' : 'text-gray-400'}`}>{label}</span>
            </label>
          ))}
        </div>
        {cornerTypes[j] === 'external' && (
          <label className="flex items-center gap-1.5 cursor-pointer select-none mt-1.5 pl-0.5">
            <input
              type="checkbox"
              checked={wrapJunctions[j] ?? false}
              onChange={() => setWrapJunctions(prev => { const next = [...prev]; next[j] = !next[j]; return next; })}
              className="w-3.5 h-3.5 rounded border-gray-300 accent-[#7ec662]"
            />
            <span className={`text-[9px] font-bold ${wrapJunctions[j] ? 'text-[#5a9c3e]' : 'text-gray-400'}`}>⤵ Загиб одной панели (без профиля)</span>
          </label>
        )}
      </div>
    ))}
  </div>
);

const BambooStudio = () => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [step, setStep] = useState<'zone' | 'upload' | 'mark' | 'edit'>('zone');
  const [wallZone, setWallZone] = useState<string | null>(null);
  const [windowType, setWindowType] = useState<'standard' | 'panoramic' | null>(null);
  // Standard window: dimensions (mm) + corner joining preference (профиль / загиб)
  const [winSlopeDepthMm, setWinSlopeDepthMm] = useState(0);
  const [winWidthMm, setWinWidthMm] = useState(0);
  const [winHeightMm, setWinHeightMm] = useState(0);
  const [winJoint, setWinJoint] = useState<'profile' | 'bend'>('profile');
  // TV zone: cutout for the TV panel
  const [tvType, setTvType] = useState<'builtin' | 'surface' | null>(null);
  const [tvCutoutWidthMm, setTvCutoutWidthMm] = useState(0);
  const [tvCutoutHeightMm, setTvCutoutHeightMm] = useState(0);
  const [tvCutoutDepthMm, setTvCutoutDepthMm] = useState(0);
  const [tvCutoutJoint, setTvCutoutJoint] = useState<'bend' | 'profile'>('profile');
  const [tvCutoutInputMode, setTvCutoutInputMode] = useState<'size' | 'inches'>('size');
  const [tvCutoutPresetInches, setTvCutoutPresetInches] = useState<50 | 55 | 65 | null>(null);

  const TV_INCH_PRESETS: Record<50 | 55 | 65, { wMm: number; hMm: number }> = {
    50: { wMm: 1130, hMm: 660 },
    55: { wMm: 1250, hMm: 730 },
    65: { wMm: 1470, hMm: 850 },
  };
  // TV zone: surface type — strips around the main face
  const [tvSurfaceSideDepthMm, setTvSurfaceSideDepthMm] = useState(0);
  const [tvSurfaceTopDepthMm, setTvSurfaceTopDepthMm] = useState(0);
  const [tvSurfaceBottomDepthMm, setTvSurfaceBottomDepthMm] = useState(0);
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
  // Cylinder highlight position for round columns: 0 = left edge, 0.5 = center, 1 = right edge
  const [cylHighlightPos, setCylHighlightPos] = useState(0.5);
  const cylHighlightPosRef = useRef(0.5);
  // Corner type per junction (junction 0 = walls 1–2, junction 1 = walls 2–3)
  const [cornerTypes, setCornerTypes] = useState<('external' | 'internal')[]>(['external', 'external']);
  const cornerTypesRef = useRef<('external' | 'internal')[]>(['external', 'external']);
  // Wrap (загиб): on an external corner one panel bends around the corner — no profile joint
  const [wrapJunctions, setWrapJunctions] = useState<boolean[]>([false, false]);
  const wrapJunctionsRef = useRef<boolean[]>([false, false]);
  // Real wall dimensions (mm) of the ACTIVE surface; 0 = not specified
  const [wallWidthMm, setWallWidthMm] = useState(0);
  const [wallHeightMm, setWallHeightMm] = useState(0);
  const wallWidthMmRef = useRef(0);
  const wallHeightMmRef = useRef(0);
  const wallZoneRef = useRef<string | null>(null);
  const columnShapeRef = useRef<ColumnShape>('rect');
  // Column (колонна) parameters
  const [columnShape, setColumnShape] = useState<ColumnShape>('rect');
  const [columnSides, setColumnSides] = useState<number[]>([0, 0, 0, 0]); // mm
  const [columnHeightMm, setColumnHeightMm] = useState(0);
  // Panels chosen for the column's INVISIBLE faces (ids; offered from panels already used on the visualization)
  const [hiddenFaceMats, setHiddenFaceMats] = useState<string[]>([]);
  const [savedPng, setSavedPng] = useState<string | null>(null);
  const [activeSurface, setActiveSurface] = useState(0);
  const activeSurfaceRef = useRef(0);
  const surfacesRef = useRef<SurfaceConfig[]>([defaultSurfaceConfig()]);

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
  const stepRef = useRef<'zone' | 'upload' | 'mark' | 'edit'>('zone');
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
    surfaceIndex: number;
    sectorMaterials: Record<number, Panel>;
    dividerPositions: number[];
    panelCount: number;
    cornerTypes: ('external' | 'internal')[];
    wrapJunctions: boolean[];
    wallWidthMm: number;
    wallHeightMm: number;
    moldingStyle: 'none' | 'gold' | 'black' | 'metallic' | 'brass';
    moldingWidth: number;
    hMoldingStyle: 'none' | 'gold' | 'black' | 'metallic' | 'brass';
    hMoldingCount: number;
    hMoldingWidth: number;
    hMoldingPositions: number[];
  };
  const historyRef = useRef<HistorySnapshot[]>([]);
  // Mirrors historyRef.current.length so the «Отменить» button can show enabled/disabled state
  const [historyLen, setHistoryLen] = useState(0);

  const pushHistory = useCallback(() => {
    historyRef.current.push({
      surfaceIndex: activeSurfaceRef.current,
      sectorMaterials: { ...sectorMaterialsRef.current },
      dividerPositions: [...dividerPositionsRef.current],
      panelCount: panelCountRef.current,
      cornerTypes: [...cornerTypesRef.current],
      wrapJunctions: [...wrapJunctionsRef.current],
      wallWidthMm: wallWidthMmRef.current,
      wallHeightMm: wallHeightMmRef.current,
      moldingStyle: moldingStyleRef.current,
      moldingWidth: moldingWidthRef.current,
      hMoldingStyle: hMoldingStyleRef.current,
      hMoldingCount: hMoldingCountRef.current,
      hMoldingWidth: hMoldingWidthRef.current,
      hMoldingPositions: [...hMoldingPositionsRef.current],
    });
    if (historyRef.current.length > 50) historyRef.current.shift();
    setHistoryLen(historyRef.current.length);
  }, []);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current.pop()!;
    setHistoryLen(historyRef.current.length);
    // Corner/wrap settings are global — always restore
    setCornerTypes(prev.cornerTypes);
    setWrapJunctions(prev.wrapJunctions);
    if (prev.surfaceIndex === activeSurfaceRef.current) {
      // Snapshot belongs to the active surface — restore via live state
      setSectorMaterials(prev.sectorMaterials);
      setDividerPositions(prev.dividerPositions);
      setPanelCount(prev.panelCount);
      setWallWidthMm(prev.wallWidthMm);
      setWallHeightMm(prev.wallHeightMm);
      setMoldingStyle(prev.moldingStyle);
      setMoldingWidth(prev.moldingWidth);
      setHMoldingStyle(prev.hMoldingStyle);
      setHMoldingCount(prev.hMoldingCount);
      setHMoldingWidth(prev.hMoldingWidth);
      setHMoldingPositions(prev.hMoldingPositions);
    } else {
      // Snapshot belongs to another surface — restore its stored config directly
      const cfg = surfacesRef.current[prev.surfaceIndex] ?? defaultSurfaceConfig();
      surfacesRef.current[prev.surfaceIndex] = {
        ...cfg,
        sectorMaterials: prev.sectorMaterials,
        dividerPositions: prev.dividerPositions,
        panelCount: prev.panelCount,
        wallWidthMm: prev.wallWidthMm,
        wallHeightMm: prev.wallHeightMm,
        moldingStyle: prev.moldingStyle,
        moldingWidth: prev.moldingWidth,
        hMoldingStyle: prev.hMoldingStyle,
        hMoldingCount: prev.hMoldingCount,
        hMoldingWidth: prev.hMoldingWidth,
        hMoldingPositions: prev.hMoldingPositions,
      };
      // Force redraw (stored configs are read from refs during draw)
      setPoints(pv => [...pv]);
    }
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
  useEffect(() => { cylHighlightPosRef.current = cylHighlightPos; }, [cylHighlightPos]);
  // Auto-shift cylinder highlight when the light mode changes:
  // morning light comes from the right (bright at right edge), evening — from the left
  useEffect(() => {
    setCylHighlightPos(lightMode === 'morning' ? 0.68 : lightMode === 'evening' ? 0.32 : 0.5);
  }, [lightMode]);
  useEffect(() => { cornerTypesRef.current = cornerTypes; }, [cornerTypes]);
  useEffect(() => { wrapJunctionsRef.current = wrapJunctions; }, [wrapJunctions]);
  useEffect(() => { wallWidthMmRef.current = wallWidthMm; }, [wallWidthMm]);
  useEffect(() => { wallHeightMmRef.current = wallHeightMm; }, [wallHeightMm]);
  useEffect(() => { activeSurfaceRef.current = activeSurface; }, [activeSurface]);
  useEffect(() => { wallZoneRef.current = wallZone; }, [wallZone]);
  useEffect(() => { columnShapeRef.current = columnShape; }, [columnShape]);
  // Persist current edits into the active surface's config
  useEffect(() => {
    surfacesRef.current[activeSurface] = {
      panelCount, dividerPositions, sectorMaterials,
      moldingStyle, moldingWidth,
      hMoldingStyle, hMoldingCount, hMoldingWidth, hMoldingPositions,
      wallWidthMm, wallHeightMm,
    };
  }, [activeSurface, panelCount, dividerPositions, sectorMaterials, moldingStyle, moldingWidth, hMoldingStyle, hMoldingCount, hMoldingWidth, hMoldingPositions, wallWidthMm, wallHeightMm]);

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

  // Switch active editing surface: snapshot current edits, load target config
  const switchSurface = useCallback((idx: number) => {
    if (idx === activeSurfaceRef.current) return;
    surfacesRef.current[activeSurfaceRef.current] = {
      panelCount: panelCountRef.current,
      dividerPositions: [...dividerPositionsRef.current],
      sectorMaterials: { ...sectorMaterialsRef.current },
      moldingStyle: moldingStyleRef.current,
      moldingWidth: moldingWidthRef.current,
      hMoldingStyle: hMoldingStyleRef.current,
      hMoldingCount: hMoldingCountRef.current,
      hMoldingWidth: hMoldingWidthRef.current,
      hMoldingPositions: [...hMoldingPositionsRef.current],
      wallWidthMm: wallWidthMmRef.current,
      wallHeightMm: wallHeightMmRef.current,
    };
    const cfg = surfacesRef.current[idx] ?? defaultSurfaceConfig();
    surfacesRef.current[idx] = cfg;
    activeSurfaceRef.current = idx;
    setActiveSurface(idx);
    setPanelCount(cfg.panelCount);
    setDividerPositions(cfg.dividerPositions);
    setSectorMaterials(cfg.sectorMaterials);
    setMoldingStyle(cfg.moldingStyle);
    setMoldingWidth(cfg.moldingWidth);
    setHMoldingStyle(cfg.hMoldingStyle);
    setHMoldingCount(cfg.hMoldingCount);
    setHMoldingWidth(cfg.hMoldingWidth);
    setHMoldingPositions(cfg.hMoldingPositions);
    setWallWidthMm(cfg.wallWidthMm);
    setWallHeightMm(cfg.wallHeightMm);
    setActiveSector(null);
  }, []);

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
      // Each wall (group of 4 points) is drawn as its OWN independent contour —
      // points of different walls are never connected to each other
      const QUAD_COLORS = ['#007aff', '#7ec662', '#ff9500'];
      const nGroups = Math.ceil(pts.length / 4);
      for (let g = 0; g < nGroups; g++) {
        const gp = pts.slice(g * 4, g * 4 + 4);
        const color = QUAD_COLORS[g] ?? '#007aff';
        const complete = gp.length === 4;

        // Contour of this wall only
        if (gp.length >= 2) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.setLineDash(complete ? [] : [6, 4]);
          ctx.beginPath();
          ctx.moveTo(gp[0].x, gp[0].y);
          gp.forEach(p => ctx.lineTo(p.x, p.y));
          if (complete) ctx.closePath();
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Points of this wall
        ctx.fillStyle = color;
        gp.forEach((p, i) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
          ctx.fill();
          // Point number inside
          ctx.fillStyle = 'white';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(i + 1), p.x, p.y);
          ctx.fillStyle = color;
        });

        // Wall label near the first point of a completed wall
        if (complete) {
          const cxm = (gp[0].x + gp[1].x + gp[2].x + gp[3].x) / 4;
          const cym = (gp[0].y + gp[1].y + gp[2].y + gp[3].y) / 4;
          ctx.save();
          ctx.fillStyle = color;
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.globalAlpha = 0.85;
          ctx.fillText(`Стена ${g + 1}`, cxm, cym);
          ctx.restore();
        }
      }
      return;
    }

    if (curStep === 'edit' && pts.length >= 4) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tCtx = tempCanvas.getContext('2d');
      if (!tCtx) return;

      // Separate canvas for wood panels — composited at higher alpha for more opacity
      const woodCanvas = document.createElement('canvas');
      woodCanvas.width = width;
      woodCanvas.height = height;
      const wCtx = woodCanvas.getContext('2d')!;

      // Helper: render one 4-point quad with panels, dividers, and moldings
      const renderQuad = (qp: Point[], cfg: SurfaceConfig, isActive: boolean, overrideFirstMaterial?: Panel) => {
        const bounds = getSectorBounds(cfg.dividerPositions, cfg.panelCount);

      for (let i = 0; i < cfg.panelCount; i++) {
        const { start: rStart, end: rEnd } = bounds[i];

        const p1 = { x: qp[0].x + (qp[1].x - qp[0].x) * rStart, y: qp[0].y + (qp[1].y - qp[0].y) * rStart };
        const p2 = { x: qp[0].x + (qp[1].x - qp[0].x) * rEnd, y: qp[0].y + (qp[1].y - qp[0].y) * rEnd };
        const p3 = { x: qp[3].x + (qp[2].x - qp[3].x) * rEnd, y: qp[3].y + (qp[2].y - qp[3].y) * rEnd };
        const p4 = { x: qp[3].x + (qp[2].x - qp[3].x) * rStart, y: qp[3].y + (qp[2].y - qp[3].y) * rStart };

        const material = (i === 0 && overrideFirstMaterial) ? overrideFirstMaterial : (cfg.sectorMaterials[i] || BAMBOO_PANELS[0]);

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
            if (material.slatOverlay) {
              // Slat panels: stretch texture to fill the entire panel (no tiling)
              tCtx.drawImage(cachedTex, minX, minY, panelW, panelH);
              // Also draw to woodCanvas for extra opacity boost
              wCtx.save();
              wCtx.beginPath();
              wCtx.moveTo(p1.x, p1.y); wCtx.lineTo(p2.x, p2.y);
              wCtx.lineTo(p3.x, p3.y); wCtx.lineTo(p4.x, p4.y);
              wCtx.closePath(); wCtx.clip();
              wCtx.drawImage(cachedTex, minX, minY, panelW, panelH);
              wCtx.restore();
            } else {
              // Wood panels: tile at 80% panel size so grain appears 20% smaller
              const WOOD_SCALE = 0.8;
              const tileW = Math.max(1, Math.ceil(panelW * WOOD_SCALE));
              const tileH = Math.max(1, Math.ceil(panelH * WOOD_SCALE));
              const tileCanvas = document.createElement('canvas');
              tileCanvas.width = tileW; tileCanvas.height = tileH;
              const tileCtx = tileCanvas.getContext('2d')!;
              tileCtx.drawImage(cachedTex, 0, 0, tileW, tileH);
              const woodPattern = tCtx.createPattern(tileCanvas, 'repeat');
              if (woodPattern) {
                woodPattern.setTransform(new DOMMatrix().translate(minX, minY));
                tCtx.fillStyle = woodPattern;
                tCtx.fillRect(minX - 1, minY - 1, panelW + 2, panelH + 2);
              }
              // Also draw to woodCanvas for extra opacity boost
              wCtx.save();
              wCtx.beginPath();
              wCtx.moveTo(p1.x, p1.y); wCtx.lineTo(p2.x, p2.y);
              wCtx.lineTo(p3.x, p3.y); wCtx.lineTo(p4.x, p4.y);
              wCtx.closePath(); wCtx.clip();
              const woodPattern2 = wCtx.createPattern(tileCanvas, 'repeat');
              if (woodPattern2) {
                woodPattern2.setTransform(new DOMMatrix().translate(minX, minY));
                wCtx.fillStyle = woodPattern2;
                wCtx.fillRect(minX - 1, minY - 1, panelW + 2, panelH + 2);
              }
              wCtx.restore();
            }
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

        // Slat (рейки) gap overlay — fine vertical dark stripes simulating gaps between slats
        if (material.slatOverlay) {
          const SLAT_W = 4;
          const GAP_W = 1;
          const PERIOD = SLAT_W + GAP_W;
          const startX = Math.floor(minX / PERIOD) * PERIOD;
          for (let sx = startX; sx < maxX + PERIOD; sx += PERIOD) {
            const gx = sx + SLAT_W;
            const gapGrad = tCtx.createLinearGradient(gx - 0.5, 0, gx + GAP_W + 0.5, 0);
            gapGrad.addColorStop(0,   'rgba(0,0,0,0.00)');
            gapGrad.addColorStop(0.3, 'rgba(0,0,0,0.65)');
            gapGrad.addColorStop(0.5, 'rgba(0,0,0,0.85)');
            gapGrad.addColorStop(0.7, 'rgba(0,0,0,0.65)');
            gapGrad.addColorStop(1,   'rgba(0,0,0,0.00)');
            tCtx.fillStyle = gapGrad;
            tCtx.fillRect(gx - 0.5, minY - 1, GAP_W + 1, maxY - minY + 2);
          }
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

        if (isActive && curActiveSector === i && !curIsErasing) {
          tCtx.strokeStyle = 'white';
          tCtx.lineWidth = 3;
          tCtx.stroke();
        }

        tCtx.strokeStyle = 'rgba(0,0,0,0.12)';
        tCtx.lineWidth = 1;
        tCtx.stroke();
      }

      // Draw draggable dividers as visible handles (hidden during export)
      if (isActive && !curIsErasing && !forExportRef.current) {
        cfg.dividerPositions.forEach((ratio) => {
          // Point on top edge
          const topX = qp[0].x + (qp[1].x - qp[0].x) * ratio;
          const topY = qp[0].y + (qp[1].y - qp[0].y) * ratio;
          // Point on bottom edge
          const botX = qp[3].x + (qp[2].x - qp[3].x) * ratio;
          const botY = qp[3].y + (qp[2].y - qp[3].y) * ratio;

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
      const curMoldingStyle = cfg.moldingStyle;
      const curMoldingWidth = cfg.moldingWidth;
      if (curMoldingStyle !== 'none' && cfg.dividerPositions.length > 0) {
        cfg.dividerPositions.forEach((ratio) => {
          const topX = qp[0].x + (qp[1].x - qp[0].x) * ratio;
          const topY = qp[0].y + (qp[1].y - qp[0].y) * ratio;
          const botX = qp[3].x + (qp[2].x - qp[3].x) * ratio;
          const botY = qp[3].y + (qp[2].y - qp[3].y) * ratio;

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
      const curHMoldingStyle = cfg.hMoldingStyle;
      const curHMoldingWidth = cfg.hMoldingWidth;
      const curHPositions = cfg.hMoldingPositions;
      if (curHMoldingStyle !== 'none' && curHPositions.length > 0) {
        curHPositions.forEach((r) => {
          // Left edge: lerp between qp[0] (top-left) and qp[3] (bottom-left)
          const lx = qp[0].x + (qp[3].x - qp[0].x) * r;
          const ly = qp[0].y + (qp[3].y - qp[0].y) * r;
          // Right edge: lerp between qp[1] (top-right) and qp[2] (bottom-right)
          const rx = qp[1].x + (qp[2].x - qp[1].x) * r;
          const ry = qp[1].y + (qp[2].y - qp[1].y) * r;

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
          if (isActive && !curIsErasing && !forExportRef.current) {
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
      }; // end renderQuad

      // Render each marked quad with its own per-surface config
      const nQuads = Math.min(3, Math.floor(pts.length / 4));
      // Invariant: active surface index must point at an existing quad
      const curActiveSurf = Math.min(activeSurfaceRef.current, nQuads - 1);
      const liveCfg: SurfaceConfig = {
        panelCount: curPanelCount,
        dividerPositions: curDividers,
        sectorMaterials: curMaterials,
        moldingStyle: moldingStyleRef.current,
        moldingWidth: moldingWidthRef.current,
        hMoldingStyle: hMoldingStyleRef.current,
        hMoldingCount: hMoldingCountRef.current,
        hMoldingWidth: hMoldingWidthRef.current,
        hMoldingPositions: hMoldingPositionsRef.current,
        wallWidthMm: wallWidthMmRef.current,
        wallHeightMm: wallHeightMmRef.current,
      };
      const quadCfgs: SurfaceConfig[] = [];
      for (let q = 0; q < nQuads; q++) {
        quadCfgs.push(q === curActiveSurf ? liveCfg : (surfacesRef.current[q] ?? defaultSurfaceConfig()));
      }
      for (let q = 0; q < nQuads; q++) {
        // Wrap continuation: first sector of this wall reuses the LAST panel of the previous wall
        let overrideMat: Panel | undefined;
        if (q > 0 && (wrapJunctionsRef.current[q - 1] ?? false)
            && (cornerTypesRef.current[q - 1] ?? 'external') === 'external') {
          const prevCfg = quadCfgs[q - 1];
          overrideMat = prevCfg.sectorMaterials[prevCfg.panelCount - 1] || BAMBOO_PANELS[0];
        }
        renderQuad(pts.slice(q * 4, q * 4 + 4), quadCfgs[q], q === curActiveSurf, overrideMat);
      }

      // Simplified cylindrical shading for round/oval columns:
      // dark edges + light center overlay makes the flat marked plane read as a cylinder
      if (wallZoneRef.current === 'column' && columnShapeRef.current === 'round') {
        for (let q = 0; q < nQuads; q++) {
          const qp = pts.slice(q * 4, q * 4 + 4);
          if (qp.length < 4) continue;
          // Gradient runs from mid-left edge (p0–p3) to mid-right edge (p1–p2)
          const lx = (qp[0].x + qp[3].x) / 2, ly = (qp[0].y + qp[3].y) / 2;
          const rx = (qp[1].x + qp[2].x) / 2, ry = (qp[1].y + qp[2].y) / 2;
          const cylGrad = tCtx.createLinearGradient(lx, ly, rx, ry);
          // Highlight peak position (0 = left edge, 1 = right edge); remap the
          // symmetric stop pattern so its center lands at `hc`
          const hc = Math.min(0.9, Math.max(0.1, cylHighlightPosRef.current));
          const remap = (t: number) => t < 0.5 ? t * (hc / 0.5) : hc + (t - 0.5) * ((1 - hc) / 0.5);
          ([
            [0,    'rgba(0,0,0,0.50)'],
            [0.10, 'rgba(0,0,0,0.28)'],
            [0.26, 'rgba(0,0,0,0.06)'],
            [0.38, 'rgba(255,255,255,0.16)'],
            [0.50, 'rgba(255,255,255,0.24)'],
            [0.62, 'rgba(255,255,255,0.16)'],
            [0.74, 'rgba(0,0,0,0.06)'],
            [0.90, 'rgba(0,0,0,0.28)'],
            [1,    'rgba(0,0,0,0.50)'],
          ] as [number, string][]).forEach(([t, c]) => cylGrad.addColorStop(remap(t), c));
          tCtx.save();
          tCtx.beginPath();
          tCtx.moveTo(qp[0].x, qp[0].y);
          tCtx.lineTo(qp[1].x, qp[1].y);
          tCtx.lineTo(qp[2].x, qp[2].y);
          tCtx.lineTo(qp[3].x, qp[3].y);
          tCtx.closePath();
          tCtx.fillStyle = cylGrad;
          tCtx.fill();
          tCtx.restore();
        }
      }

      // Corner edge visual between adjacent quads (right edge of previous quad)
      for (let q = 1; q < nQuads; q++) {
        const e1 = pts[(q - 1) * 4 + 1], e2 = pts[(q - 1) * 4 + 2];
        const cTopX = e1.x, cTopY = e1.y;
        const cBotX = e2.x, cBotY = e2.y;
        const cDx = cBotX - cTopX, cDy = cBotY - cTopY;
        const cLen = Math.sqrt(cDx * cDx + cDy * cDy) || 1;
        const cpx = -cDy / cLen, cpy = cDx / cLen;
        const cMidX = (cTopX + cBotX) / 2, cMidY = (cTopY + cBotY) / 2;
        const cGrad = tCtx.createLinearGradient(
          cMidX + cpx * 6, cMidY + cpy * 6,
          cMidX - cpx * 6, cMidY - cpy * 6
        );
        const jExternal = (cornerTypesRef.current[q - 1] ?? 'external') === 'external';
        const jWrap = jExternal && (wrapJunctionsRef.current[q - 1] ?? false);
        // Wrap (загиб): texture simply continues around the corner — no seam/highlight drawn
        if (jWrap) continue;
        if (jExternal) {
          cGrad.addColorStop(0,   'rgba(0,0,0,0.50)');
          cGrad.addColorStop(0.3, 'rgba(255,255,255,0.65)');
          cGrad.addColorStop(0.5, 'rgba(255,255,255,0.90)');
          cGrad.addColorStop(0.7, 'rgba(255,255,255,0.65)');
          cGrad.addColorStop(1,   'rgba(0,0,0,0.50)');
        } else {
          cGrad.addColorStop(0,    'rgba(0,0,0,0.0)');
          cGrad.addColorStop(0.35, 'rgba(0,0,0,0.55)');
          cGrad.addColorStop(0.5,  'rgba(0,0,0,0.72)');
          cGrad.addColorStop(0.65, 'rgba(0,0,0,0.55)');
          cGrad.addColorStop(1,    'rgba(0,0,0,0.0)');
        }
        tCtx.save();
        tCtx.strokeStyle = cGrad;
        tCtx.lineWidth = 12;
        tCtx.lineCap = 'butt';
        tCtx.beginPath();
        tCtx.moveTo(cTopX, cTopY);
        tCtx.lineTo(cBotX, cBotY);
        tCtx.stroke();
        tCtx.restore();
      }

      // Active surface outline (only with multiple surfaces, hidden on export)
      if (nQuads > 1 && !forExportRef.current && !curIsErasing) {
        const aq = pts.slice(curActiveSurf * 4, curActiveSurf * 4 + 4);
        if (aq.length === 4) {
          tCtx.save();
          tCtx.strokeStyle = '#7ec662';
          tCtx.lineWidth = 3;
          tCtx.setLineDash([10, 6]);
          tCtx.beginPath();
          tCtx.moveTo(aq[0].x, aq[0].y);
          aq.forEach(pp => tCtx.lineTo(pp.x, pp.y));
          tCtx.closePath();
          tCtx.stroke();
          tCtx.restore();
        }
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
      ctx.globalAlpha = 0.95;
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.restore();

      // Extra opacity boost specifically for wood (textureStretch) panels
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.drawImage(woodCanvas, 0, 0);
      ctx.restore();

      // Overlay original photo with 'multiply' blend to preserve room shadows & lighting
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(img, 0, 0, width, height);
      ctx.restore();

      // Semi-transparent ALL WALL watermark — only on exported images (PNG / КП)
      if (forExportRef.current) {
        ctx.save();
        const fontSize = Math.max(24, Math.round(width / 18));
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Diagonal tiled watermark
        ctx.translate(width / 2, height / 2);
        ctx.rotate(-Math.PI / 7);
        const stepX = fontSize * 8;
        const stepY = fontSize * 4;
        const diag = Math.sqrt(width * width + height * height);
        for (let wy = -diag / 2; wy <= diag / 2; wy += stepY) {
          const rowOffset = (Math.round(wy / stepY) % 2) * (stepX / 2);
          for (let wx = -diag / 2; wx <= diag / 2; wx += stepX) {
            ctx.fillStyle = 'rgba(255,255,255,0.13)';
            ctx.fillText('ALL WALL', wx + rowOffset, wy + 1);
            ctx.fillStyle = 'rgba(0,0,0,0.07)';
            ctx.fillText('ALL WALL', wx + rowOffset, wy - 1);
          }
        }
        ctx.restore();
        // Brand mark in the bottom-right corner
        ctx.save();
        const cornerSize = Math.max(14, Math.round(width / 55));
        ctx.font = `bold ${cornerSize}px sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillText('ALL WALL · allwall.ru', width - 14, height - 11);
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillText('ALL WALL · allwall.ru', width - 15, height - 12);
        ctx.restore();
      }
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
      let midX: number, midY: number;

      // Only the active surface's quad has draggable dividers
      const asIdx = activeSurfaceRef.current;
      const aq = pts.slice(asIdx * 4, asIdx * 4 + 4);
      const quadPts = [aq.length === 4 ? aq : pts.slice(0, 4)];
      let minDistFound = Infinity;
      for (const qp of quadPts) {
        const topX = qp[0].x + (qp[1].x - qp[0].x) * ratio;
        const topY = qp[0].y + (qp[1].y - qp[0].y) * ratio;
        const botX = qp[3].x + (qp[2].x - qp[3].x) * ratio;
        const botY = qp[3].y + (qp[2].y - qp[3].y) * ratio;
        midX = (topX + botX) / 2;
        midY = (topY + botY) / 2;
        const dQ = Math.sqrt((cx - midX) ** 2 + (cy - midY) ** 2);
        if (dQ < minDistFound) minDistFound = dQ;
      }
      if (minDistFound <= DIVIDER_HIT_RADIUS * 2) return d;
    }
    return -1;
  }, []);

  // Convert a canvas X position to a wall ratio (0-1)
  const canvasXToWallRatio = useCallback((cx: number, cy: number): number => {
    const pts = pointsRef.current;
    if (pts.length < 4) return 0;

    const asIdx = activeSurfaceRef.current;
    const q = pts.length >= asIdx * 4 + 4 ? pts.slice(asIdx * 4, asIdx * 4 + 4) : pts.slice(0, 4);
    const dx = q[1].x - q[0].x;
    const dy = q[1].y - q[0].y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return 0;
    const t = ((cx - q[0].x) * dx + (cy - q[0].y) * dy) / lenSq;
    return Math.max(0, Math.min(1, t));
  }, []);

  // Convert canvas position to wall VERTICAL ratio (0=top, 1=bottom)
  const canvasYToWallRatio = useCallback((cx: number, cy: number): number => {
    const pts = pointsRef.current;
    if (pts.length < 4) return 0;
    // Project onto the center vertical axis of the ACTIVE surface quad
    const asIdx = activeSurfaceRef.current;
    const q = pts.length >= asIdx * 4 + 4 ? pts.slice(asIdx * 4, asIdx * 4 + 4) : pts.slice(0, 4);
    const topX = (q[0].x + q[1].x) / 2;
    const topY = (q[0].y + q[1].y) / 2;
    const botX = (q[2].x + q[3].x) / 2;
    const botY = (q[2].y + q[3].y) / 2;
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
    if (pts.length < 4) return -1;
    const asIdx = activeSurfaceRef.current;
    const q = pts.length >= asIdx * 4 + 4 ? pts.slice(asIdx * 4, asIdx * 4 + 4) : pts.slice(0, 4);
    const positions = hMoldingPositionsRef.current;
    for (let i = 0; i < positions.length; i++) {
      const r = positions[i];
      const lx = q[0].x + (q[3].x - q[0].x) * r;
      const ly = q[0].y + (q[3].y - q[0].y) * r;
      const rx = q[1].x + (q[2].x - q[1].x) * r;
      const ry = q[1].y + (q[2].y - q[1].y) * r;
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
  }, [points, step, sectorMaterials, panelCount, dividerPositions, activeSector, isErasing, moldingStyle, moldingWidth, hMoldingStyle, hMoldingCount, hMoldingWidth, hMoldingPositions, lightMode, cylHighlightPos, activeSurface, cornerTypes, wrapJunctions, wallZone, columnShape, drawFullScene, image]);

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
      pushHistory();
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
        const leftEdge = idx === 0 ? 0 : updated[idx - 1];
        const rightEdge = idx === updated.length - 1 ? 1 : updated[idx + 1];
        let minLeft = leftEdge + MIN_PANEL_RATIO;
        let maxRight = rightEdge - MIN_PANEL_RATIO;
        // If real wall width is set, a sector cannot be wider than one physical panel (1220 mm)
        const wallW = wallWidthMmRef.current;
        if (wallW > 0) {
          const maxSectorRatio = PANEL_W_MM / wallW;
          maxRight = Math.min(maxRight, leftEdge + maxSectorRatio);   // left sector limit
          minLeft = Math.max(minLeft, rightEdge - maxSectorRatio);    // right sector limit
        }
        if (minLeft <= maxRight) {
          updated[idx] = Math.max(minLeft, Math.min(maxRight, newRatio));
        }
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

    if (step === 'mark' && points.length < (wallZone === 'wall-niche' || (wallZone === 'tv' && tvType !== 'surface') ? 12 : wallZone === 'column' || wallZone === 'window' ? 8 : 4)) {
      setPoints([...points, { x, y }]);
    } else if (step === 'edit') {
      const pts = pointsRef.current;
      if (pts.length < 4) return;
      // Determine clicked surface (point-in-quad); switch active surface if needed
      const nQuads = Math.min(3, Math.floor(pts.length / 4));
      const inQuad = (q: Point[]) => {
        let inside = false;
        for (let i = 0, j = 3; i < 4; j = i++) {
          if ((q[i].y > y) !== (q[j].y > y) && x < ((q[j].x - q[i].x) * (y - q[i].y)) / (q[j].y - q[i].y) + q[i].x) inside = !inside;
        }
        return inside;
      };
      let clickedQuad = -1;
      for (let qi = 0; qi < nQuads; qi++) {
        if (inQuad(pts.slice(qi * 4, qi * 4 + 4))) { clickedQuad = qi; break; }
      }
      if (clickedQuad !== -1 && clickedQuad !== activeSurfaceRef.current) {
        switchSurface(clickedQuad);
        return;
      }
      // Determine which sector was clicked using divider positions
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
    setSavedPng(dataUrl);
  };

  // ── Commercial proposal (КП) PDF generation ──────────────────────────
  const handleGenerateKP = async () => {
    const nQuads = Math.min(3, Math.floor(pointsRef.current.length / 4));
    if (nQuads === 0) return;

    // Always render a FRESH export image so the proposal visual matches current settings
    let kpImage: string | null = null;
    if (mainCanvasRef.current) {
      forExportRef.current = true;
      drawFullScene();
      kpImage = mainCanvasRef.current.toDataURL('image/png');
      forExportRef.current = false;
      drawFullScene();
    }

    type KPItem = { article: string; name: string; qty: number; price: number };
    const items: KPItem[] = [];
    const addItem = (article: string, name: string, qty: number, price: number) => {
      const ex = items.find(it => it.article === article && it.name === name);
      if (ex) ex.qty += qty; else items.push({ article, name, qty, price });
    };

    const kpCfgs: SurfaceConfig[] = [];
    for (let q = 0; q < nQuads; q++) {
      kpCfgs.push(q === activeSurfaceRef.current
        ? {
            panelCount: panelCountRef.current,
            dividerPositions: dividerPositionsRef.current,
            sectorMaterials: sectorMaterialsRef.current,
            moldingStyle: moldingStyleRef.current,
            moldingWidth: moldingWidthRef.current,
            hMoldingStyle: hMoldingStyleRef.current,
            hMoldingCount: hMoldingCountRef.current,
            hMoldingWidth: hMoldingWidthRef.current,
            hMoldingPositions: hMoldingPositionsRef.current,
            wallWidthMm: wallWidthMmRef.current,
            wallHeightMm: wallHeightMmRef.current,
          }
        : (surfacesRef.current[q] ?? defaultSurfaceConfig()));
    }
    let projectPanelCount = 0;
    const panelArticles = new Set<string>();
    for (let q = 0; q < nQuads; q++) {
      const cfg = kpCfgs[q];
      const wrapLeft = q > 0 && (wrapJunctionsRef.current[q - 1] ?? false)
        && (cornerTypesRef.current[q - 1] ?? 'external') === 'external';
      const wrapRight = q < nQuads - 1 && (wrapJunctionsRef.current[q] ?? false)
        && (cornerTypesRef.current[q] ?? 'external') === 'external';
      for (let i = 0; i < cfg.panelCount; i++) {
        // First sector after a wrap junction = continuation of the previous wall's bent panel
        if (i === 0 && wrapLeft) continue;
        const mat = cfg.sectorMaterials[i] || BAMBOO_PANELS[0];
        const isBent = i === cfg.panelCount - 1 && wrapRight;
        addItem(mat.article, `Панель «${mat.name}»${isBent ? ' (с загибом на угол)' : ''}`, 1, getPanelPrice(mat.id));
        panelArticles.add(mat.article);
        projectPanelCount++;
      }
    }
    // ── Profiles counted in 3 m pieces, like panels: collect required RUN LENGTHS
    // per style, then pack them into 3 m pieces with offcut reuse (packProfileRuns).
    const profileRuns: Partial<Record<Exclude<MoldingStyle, 'none'>, number[]>> = {};
    const addRuns = (style: Exclude<MoldingStyle, 'none'>, lengthMm: number, count: number) => {
      if (count <= 0 || lengthMm <= 0) return;
      (profileRuns[style] ??= []).push(...Array(count).fill(lengthMm));
    };
    // Column zone: needed early so profile joints can cover the FULL perimeter
    const isColumn = wallZone === 'column';
    // Standard window: panels come from the piece-cutting calc, profiles from the joint preference
    const isWindowStd = wallZone === 'window' && windowType === 'standard';
    const isWindowPan = wallZone === 'window' && windowType === 'panoramic';
    const isWindowAny = isWindowStd || isWindowPan;
    const windowCut = isWindowAny
      ? (() => {
          const pieces = windowStdPieces(
            winSlopeDepthMm, winWidthMm, winHeightMm,
            0,
            0,
          );
          return pieces.length > 0 ? packWindowPieces(pieces) : null;
        })()
      : null;
    const isTvSurface = wallZone === 'tv' && tvType === 'surface';
    const tvSurfaceCut = isTvSurface
      ? (() => {
          const faceW = kpCfgs[0]?.wallWidthMm ?? 0;
          const faceH = kpCfgs[0]?.wallHeightMm ?? 0;
          if (faceW <= 0 || faceH <= 0) return null;
          const pieces: import('./lib/panelCalc').WindowPiece[] = [];
          pieces.push({ wMm: faceW, lMm: faceH });
          if (tvSurfaceSideDepthMm > 0) {
            pieces.push({ wMm: tvSurfaceSideDepthMm, lMm: faceH });
            pieces.push({ wMm: tvSurfaceSideDepthMm, lMm: faceH });
          }
          if (tvSurfaceTopDepthMm > 0) pieces.push({ wMm: faceW, lMm: tvSurfaceTopDepthMm });
          if (tvSurfaceBottomDepthMm > 0) pieces.push({ wMm: faceW, lMm: tvSurfaceBottomDepthMm });
          return pieces.length > 0 ? packWindowPieces(pieces) : null;
        })()
      : null;
    // Built-in TV: загибы inside the cutout — 2 sides + top + bottom
    const isTvBuiltin = wallZone === 'tv' && tvType === 'builtin';
    const tvBuiltinCut = isTvBuiltin && tvCutoutDepthMm > 0 && tvCutoutWidthMm > 0 && tvCutoutHeightMm > 0
      ? (() => {
          const pieces: import('./lib/panelCalc').WindowPiece[] = [];
          // 2 боковых загиба: глубина × высота выреза
          pieces.push({ wMm: tvCutoutDepthMm, lMm: tvCutoutHeightMm });
          pieces.push({ wMm: tvCutoutDepthMm, lMm: tvCutoutHeightMm });
          // верхний загиб: глубина × ширина выреза
          pieces.push({ wMm: tvCutoutDepthMm, lMm: tvCutoutWidthMm });
          // нижний загиб: глубина × ширина выреза
          pieces.push({ wMm: tvCutoutDepthMm, lMm: tvCutoutWidthMm });
          return packWindowPieces(pieces);
        })()
      : null;
    const colPerMm = isColumn ? columnPerimeterMm(columnShape, columnSides) : 0;
    // Vertical joints already counted on the VISIBLE column faces (incl. corner profiles)
    let columnVisibleJoints = 0;
    for (let q = 0; q < nQuads; q++) {
      const cfg = kpCfgs[q];
      const wrapLeft = q > 0 && (wrapJunctionsRef.current[q - 1] ?? false)
        && (cornerTypesRef.current[q - 1] ?? 'external') === 'external';
      const wrapRight = q < nQuads - 1 && (wrapJunctionsRef.current[q] ?? false)
        && (cornerTypesRef.current[q] ?? 'external') === 'external';
      const hMm = cfg.wallHeightMm > 0 ? cfg.wallHeightMm : PANEL_H_MM;
      const wMm = cfg.wallWidthMm > 0 ? cfg.wallWidthMm : cfg.panelCount * PANEL_W_MM;
      // Standard window: profiles are driven by the corner-joint preference below,
      // not by per-surface molding/joint rules
      if (isWindowAny) continue;
      if (cfg.moldingStyle !== 'none') {
        // A wrapped (загиб) junction has NO profile at the shared edge — deduct it
        const vQty = Math.max(0, cfg.panelCount + 1 - (wrapLeft ? 1 : 0) - (wrapRight ? 1 : 0));
        addRuns(cfg.moldingStyle, hMm, vQty);
        if (isColumn) {
          // UNIQUE contour joints covered by this face's molding: internal seams
          // + the OUTER edges bordering the hidden part (only first/last face).
          // Junctions between adjacent visible faces are counted once, below.
          columnVisibleJoints += Math.max(0, cfg.panelCount - 1);
          if (q === 0 && !wrapLeft) columnVisibleJoints++;
          if (q === nQuads - 1 && !wrapRight) columnVisibleJoints++;
        }
      } else {
        // MANDATORY joints: wall wider than one panel ⇒ panels in a row MUST be
        // joined with vertical profiles between them, even with no molding chosen
        const perRow = Math.ceil(wMm / PANEL_W_MM);
        const joints = Math.max(0, perRow - 1);
        addRuns('metallic', hMm, joints);
        if (isColumn) columnVisibleJoints += joints;
      }
      if (cfg.hMoldingStyle !== 'none') addRuns(cfg.hMoldingStyle, wMm, cfg.hMoldingCount);
    }
    // Mandatory corner profiles: an external corner WITHOUT загиб always needs a
    // vertical profile at the shared edge — even if the walls have no molding style.
    // Exception: round/oval column (panel bends smoothly, no corner edges).
    const isRoundColumn = wallZone === 'column' && columnShape === 'round';
    if (!isRoundColumn && !isWindowAny) {
      for (let j = 0; j < nQuads - 1; j++) {
        const external = (cornerTypesRef.current[j] ?? 'external') === 'external';
        const wrapped = external && (wrapJunctionsRef.current[j] ?? false);
        if (!external || wrapped) continue;
        // If either adjacent wall has vertical molding, its runs already cover this edge
        if (kpCfgs[j]?.moldingStyle !== 'none' || kpCfgs[j + 1]?.moldingStyle !== 'none') continue;
        const hMm = Math.max(
          kpCfgs[j]?.wallHeightMm > 0 ? kpCfgs[j].wallHeightMm : PANEL_H_MM,
          kpCfgs[j + 1]?.wallHeightMm > 0 ? kpCfgs[j + 1].wallHeightMm : PANEL_H_MM);
        addRuns('metallic', hMm, 1);
        if (isColumn) columnVisibleJoints++;
      }
    }
    // Junctions between adjacent visible column faces covered by a MOLDING edge
    // run (counted once, not per face — molding on either side covers the joint)
    if (isColumn) {
      for (let j = 0; j < nQuads - 1; j++) {
        const external = (cornerTypesRef.current[j] ?? 'external') === 'external';
        const wrapped = external && (wrapJunctionsRef.current[j] ?? false);
        if (wrapped) continue;
        if (kpCfgs[j]?.moldingStyle !== 'none' || kpCfgs[j + 1]?.moldingStyle !== 'none') columnVisibleJoints++;
      }
    }
    // Hidden part of the column perimeter: panels there also join every 1.22 m.
    // A closed contour of N panels has N vertical joints (загиб removes one);
    // add the joints NOT yet counted on the visible faces — same style as the
    // visible molding, otherwise metallic by default.
    if (isColumn && colPerMm > 0) {
      const perRowCol = Math.ceil(colPerMm / PANEL_W_MM);
      const visibleWraps = wrapJunctionsRef.current
        .slice(0, Math.max(0, nQuads - 1))
        .filter((w, j) => w && (cornerTypesRef.current[j] ?? 'external') === 'external').length;
      const hiddenJoints = columnHiddenJoints(perRowCol, columnVisibleJoints, visibleWraps);
      if (hiddenJoints > 0) {
        const visStyle = kpCfgs.find(cfg => cfg.moldingStyle !== 'none')?.moldingStyle;
        addRuns(visStyle && visStyle !== 'none' ? visStyle : 'metallic',
          columnHeightMm > 0 ? columnHeightMm : PANEL_H_MM, hiddenJoints);
      }
    }
    // Standard window with «через профиль»: outer slope corners get profiles —
    // 2 vertical (window height) + 1 horizontal (window width). «Загиб» ⇒ none.
    if (isWindowAny && winJoint === 'profile') {
      const winStyle = kpCfgs.find(cfg => cfg.moldingStyle !== 'none')?.moldingStyle;
      const style = winStyle && winStyle !== 'none' ? winStyle : 'metallic';
      if (winHeightMm > 0) addRuns(style, winHeightMm, 2);
      if (winWidthMm > 0) addRuns(style, winWidthMm, 1);
    }
    // Built-in TV: profiles at the cutout perimeter joints (along width×2 + height×2)
    if (isTvBuiltin && tvCutoutJoint === 'profile' && tvCutoutWidthMm > 0 && tvCutoutHeightMm > 0) {
      const visStyle = kpCfgs.find(cfg => cfg.moldingStyle !== 'none')?.moldingStyle;
      const style = visStyle && visStyle !== 'none' ? visStyle : 'metallic';
      addRuns(style, tvCutoutHeightMm, 2); // left + right vertical joints
      addRuns(style, tvCutoutWidthMm, 2);  // top + bottom horizontal joints
    }
    // Pack each style's runs into 3 m pieces (offcuts reused project-wide)
    let profilePiecesTotal = 0;
    for (const style of Object.keys(profileRuns) as Array<Exclude<MoldingStyle, 'none'>>) {
      const pieces = packProfileRuns(profileRuns[style]!);
      profilePiecesTotal += pieces;
      if (pieces > 0) {
        const info = MOLDING_INFO[style];
        addItem(info.article + '-3M', `${info.name} (3 м, раскрой оптимизирован)`, pieces, info.price);
      }
    }

    const total = items.reduce((sum, it) => sum + it.qty * it.price, 0);
    const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽';

    // ── Column (колонна) calculation: panels by full perimeter ──
    const columnCalc = (isColumn && colPerMm > 0) ? (() => {
      const perRow = Math.ceil(colPerMm / PANEL_W_MM);
      const opt = optimizedPanelCalc(perRow, columnHeightMm);
      // Width-offcut reuse across rows: full panels per row + remainder strips
      // of all rows packed into shared panels
      const fullPerRow = Math.floor(colPerMm / PANEL_W_MM);
      const remW = colPerMm - fullPerRow * PANEL_W_MM;
      const sharedW = packWidthRemainders(Array(opt.fullRows).fill(remW));
      const needed = Math.min(opt.needed, fullPerRow * opt.fullRows + opt.donorPanels + sharedW);
      const areaM2 = columnHeightMm > 0 ? (colPerMm / 1000) * (columnHeightMm / 1000) : 0;
      // Average price of panels used in the project (visible faces) → price for full perimeter
      let projCost = 0, projCount = 0;
      for (let q = 0; q < nQuads; q++) {
        const cfg = kpCfgs[q];
        const wrapL = q > 0 && (wrapJunctionsRef.current[q - 1] ?? false)
          && (cornerTypesRef.current[q - 1] ?? 'external') === 'external';
        for (let sIdx = 0; sIdx < cfg.panelCount; sIdx++) {
          if (sIdx === 0 && wrapL) continue;
          projCost += getPanelPrice((cfg.sectorMaterials[sIdx] ?? BAMBOO_PANELS[0]).id);
          projCount++;
        }
      }
      const avgPrice = projCount > 0 ? projCost / projCount : getPanelPrice(BAMBOO_PANELS[0].id);
      // Invisible faces: if the client picked panels for them (checkboxes),
      // price the hidden portion by those panels; otherwise by the visible average
      // Only panels ACTUALLY used on the visualization count — a stale checkbox
      // selection (panel later removed from visible faces) must not affect pricing
      const usedNowIds = new Set<string>();
      for (let q = 0; q < nQuads; q++) {
        Object.values(kpCfgs[q].sectorMaterials).forEach(m => { if (m) usedNowIds.add(m.id); });
      }
      const hiddenSel = BAMBOO_PANELS.filter(p => hiddenFaceMats.includes(p.id) && usedNowIds.has(p.id));
      const hiddenAvg = hiddenSel.length > 0
        ? hiddenSel.reduce((s, p) => s + getPanelPrice(p.id), 0) / hiddenSel.length
        : avgPrice;
      // Hidden faces are counted by PERIMETER FACES, not by optimized purchases:
      // a 4-panel perimeter with 2 panels visible on the visualization ⇒ 2 hidden panels
      const hiddenCount = Math.max(0, perRow - projCount);
      const neededTotal = Math.max(needed, projCount + hiddenCount);
      const calcCost = Math.round(projCost + hiddenCount * hiddenAvg);
      // Corners wrapped by bent panels — profiles are NOT tied to the number of faces
      const wrappedCorners = wrapJunctionsRef.current
        .slice(0, Math.max(0, nQuads - 1))
        .filter((w, j) => w && (cornerTypesRef.current[j] ?? 'external') === 'external').length;
      return { perRow, opt, needed: neededTotal, areaM2, projCost, projCount, calcCost, wrappedCorners, hiddenCount, hiddenSel, hiddenNames: hiddenSel.map(p => p.name) };
    })() : null;

    // Wall dimension calculations: if dimensions are set, the calculated
    // (расчётная) panel cost takes priority over the project panel cost in Итого
    const wallCalcs = (isColumn || isWindowAny || isTvSurface) ? [] : kpCfgs
      .map((cfg, q) => ({ cfg, q }))
      .filter(w => w.cfg.wallWidthMm > 0 && w.cfg.wallHeightMm > 0)
      .map(({ cfg, q }) => {
        const cols = Math.ceil(cfg.wallWidthMm / PANEL_W_MM);
        const opt = optimizedPanelCalc(cols, cfg.wallHeightMm);
        // Width-offcut reuse: this wall's own full panels; the narrow remainder
        // strip of each row goes into the shared cross-wall packing below
        const fullPerRow = Math.floor(cfg.wallWidthMm / PANEL_W_MM);
        const remW = cfg.wallWidthMm - fullPerRow * PANEL_W_MM;
        const ownPanels = fullPerRow * opt.fullRows + opt.donorPanels;
        // Match the items aggregation: sector 0 after a wrapped junction is
        // a continuation of the previous wall's panel, not billed separately
        const wrapL = q > 0 && (wrapJunctionsRef.current[q - 1] ?? false)
          && (cornerTypesRef.current[q - 1] ?? 'external') === 'external';
        let projCost = 0;
        for (let sIdx = 0; sIdx < cfg.panelCount; sIdx++) {
          if (sIdx === 0 && wrapL) continue;
          const mat = cfg.sectorMaterials[sIdx] ?? BAMBOO_PANELS[0];
          projCost += getPanelPrice(mat.id);
        }
        const billedCount = cfg.panelCount - (wrapL ? 1 : 0);
        const avgPrice = billedCount > 0 ? projCost / billedCount : getPanelPrice(BAMBOO_PANELS[0].id);
        return { cfg, q, cols, opt, fullPerRow, remW, ownPanels, projCost, avgPrice, billedCount };
      })
      .map((w, _i, all) => {
        // Cross-wall width packing: all walls' remainder strips share donor panels
        const allPieces = all.flatMap(x => Array(x.opt.fullRows).fill(x.remW) as number[]);
        const sharedPanels = packWidthRemainders(allPieces);
        const naive = all.reduce((s, x) => s + x.opt.needed, 0);
        const optimizedTotal = all.reduce((s, x) => s + x.ownPanels, 0) + sharedPanels;
        // Attribute shared panels to walls proportionally to their strip demand
        const totalRem = all.reduce((s, x) => s + x.remW * x.opt.fullRows, 0);
        const share = totalRem > 0 ? (w.remW * w.opt.fullRows) / totalRem : 0;
        const needed = w.ownPanels + share * sharedPanels;
        const calcCost = Math.round(needed * w.avgPrice);
        return { ...w, needed, calcCost, sharedPanels, savedPanels: Math.max(0, naive - optimizedTotal) };
      });
    const sharedPanelsTotal = wallCalcs.length > 0 ? wallCalcs[0].sharedPanels : 0;
    const savedPanelsTotal = wallCalcs.length > 0 ? wallCalcs[0].savedPanels : 0;
    const totalCalcCost = wallCalcs.reduce((sum, w) => sum + w.calcCost, 0);
    const totalProjCostDimWalls = wallCalcs.reduce((sum, w) => sum + w.projCost, 0);
    // ── Table rows show CALCULATED quantities: rewrite panel item qtys ──
    // (profiles are already calculated — 3 m pieces packed above)
    // Largest-remainder scaling keeps the article mix proportional to the project
    const scaleQtys = (its: KPItem[], target: number) => {
      const cur = its.reduce((s, it) => s + it.qty, 0);
      if (cur <= 0 || target === cur) return;
      const scaled = its.map(it => (it.qty * target) / cur);
      const floors = scaled.map(Math.floor);
      let rem = target - floors.reduce((s, f) => s + f, 0);
      scaled
        .map((v, i) => ({ i, frac: v - Math.floor(v) }))
        .sort((a, b) => b.frac - a.frac)
        .forEach(({ i }) => { if (rem > 0) { floors[i]++; rem--; } });
      its.forEach((it, i) => { it.qty = Math.max(0, floors[i]); });
    };
    let panelsTableTotal = projectPanelCount;
    if (columnCalc) {
      // Hidden column faces: separate lines for client-selected panels,
      // otherwise spread over the visible panel mix
      if (columnCalc.hiddenCount > 0 && columnCalc.hiddenSel.length > 0) {
        const per = Math.floor(columnCalc.hiddenCount / columnCalc.hiddenSel.length);
        let extra = columnCalc.hiddenCount - per * columnCalc.hiddenSel.length;
        columnCalc.hiddenSel.forEach(p => {
          const qty = per + (extra > 0 ? 1 : 0);
          if (extra > 0) extra--;
          if (qty > 0) {
            addItem(p.article, `Панель «${p.name}» (невидимая сторона)`, qty, getPanelPrice(p.id));
            panelArticles.add(p.article);
          }
        });
      }
      // The table must land on the FULL calculated need (faces + height donor panels):
      // scale all panel lines (visible + hidden) up to columnCalc.needed
      panelsTableTotal = columnCalc.needed;
      scaleQtys(items.filter(it => panelArticles.has(it.article)), panelsTableTotal);
    } else if (windowCut) {
      // Standard window: the table lands on the cutting calc (offcuts reused);
      // qty spread over the panels marked on откос/подоконник
      panelsTableTotal = windowCut.panels;
      const panelRows = items.filter(it => panelArticles.has(it.article));
      if (panelRows.reduce((s, it) => s + it.qty, 0) <= 0 && panelsTableTotal > 0) {
        // No panel rows on the visualization (edge case) — bill by the default panel
        const mat = BAMBOO_PANELS[0];
        addItem(mat.article, `Панель «${mat.name}»`, panelsTableTotal, getPanelPrice(mat.id));
        panelArticles.add(mat.article);
      } else {
        scaleQtys(panelRows, panelsTableTotal);
      }
    } else if (tvSurfaceCut) {
      // Surface-mounted TV: cut-based panel count (like window)
      panelsTableTotal = tvSurfaceCut.panels;
      const panelRows = items.filter(it => panelArticles.has(it.article));
      if (panelRows.reduce((s, it) => s + it.qty, 0) <= 0 && panelsTableTotal > 0) {
        const mat = BAMBOO_PANELS[0];
        addItem(mat.article, `Панель «${mat.name}»`, panelsTableTotal, getPanelPrice(mat.id));
        panelArticles.add(mat.article);
      } else {
        scaleQtys(panelRows, panelsTableTotal);
      }
    } else if (wallCalcs.length > 0) {
      // Walls with dimensions: their project panels are replaced by the calculated
      // count (own full panels + shared width-offcut panels); other walls keep project counts.
      // ДОКРОЙ ТЕМ ЖЕ ВИДОМ: each wall's extra panels (height donors + width strips)
      // are billed as the SAME article mix used on THAT wall — never as another wall's panel type.
      const dimProj = wallCalcs.reduce((s, w) => s + w.billedCount, 0);
      const calcDim = wallCalcs.reduce((s, w) => s + w.ownPanels, 0) + sharedPanelsTotal;
      panelsTableTotal = Math.max(0, projectPanelCount - dimProj) + calcDim;
      // Integer per-wall targets (largest remainder, sum = calcDim)
      const wallFloat = wallCalcs.map(w => w.needed);
      const wallQty = wallFloat.map(Math.floor);
      let remW2 = calcDim - wallQty.reduce((s, f) => s + f, 0);
      wallFloat.map((v, i) => ({ i, frac: v - Math.floor(v) }))
        .sort((a, b) => b.frac - a.frac)
        .forEach(({ i }) => { if (remW2 > 0) { wallQty[i]++; remW2--; } });
      // Per-article targets: walls WITHOUT dimensions keep their project counts;
      // each dimensioned wall distributes its target over its OWN sector articles
      const articleTarget = new Map<string, number>();
      const bump = (a: string, n: number) => articleTarget.set(a, (articleTarget.get(a) ?? 0) + n);
      const dimQs = new Set(wallCalcs.map(w => w.q));
      for (let q = 0; q < nQuads; q++) {
        if (dimQs.has(q)) continue;
        const cfg = kpCfgs[q];
        const wrapL = q > 0 && (wrapJunctionsRef.current[q - 1] ?? false)
          && (cornerTypesRef.current[q - 1] ?? 'external') === 'external';
        for (let sIdx = 0; sIdx < cfg.panelCount; sIdx++) {
          if (sIdx === 0 && wrapL) continue;
          bump((cfg.sectorMaterials[sIdx] ?? BAMBOO_PANELS[0]).article, 1);
        }
      }
      wallCalcs.forEach((w, wi) => {
        const target = wallQty[wi];
        if (target <= 0) return;
        const wrapL = w.q > 0 && (wrapJunctionsRef.current[w.q - 1] ?? false)
          && (cornerTypesRef.current[w.q - 1] ?? 'external') === 'external';
        const cnt = new Map<string, number>();
        for (let sIdx = 0; sIdx < w.cfg.panelCount; sIdx++) {
          if (sIdx === 0 && wrapL) continue;
          const mat = w.cfg.sectorMaterials[sIdx] ?? BAMBOO_PANELS[0];
          cnt.set(mat.article, (cnt.get(mat.article) ?? 0) + 1);
        }
        if (cnt.size === 0) {
          // Wall whose only sector was consumed by a wrap — bill by its sector-0 material
          const mat = w.cfg.sectorMaterials[0] ?? BAMBOO_PANELS[0];
          cnt.set(mat.article, 1);
          addItem(mat.article, `Панель «${mat.name}»`, 0, getPanelPrice(mat.id));
          panelArticles.add(mat.article);
        }
        // Largest-remainder split of the wall target across ITS articles
        const entries = [...cnt.entries()];
        const cntSum = entries.reduce((s, [, n]) => s + n, 0);
        const sc = entries.map(([, n]) => (n * target) / cntSum);
        const fl = sc.map(Math.floor);
        let r = target - fl.reduce((s, f) => s + f, 0);
        sc.map((v, i) => ({ i, frac: v - Math.floor(v) }))
          .sort((a, b) => b.frac - a.frac)
          .forEach(({ i }) => { if (r > 0) { fl[i]++; r--; } });
        entries.forEach(([a], i) => bump(a, fl[i]));
      });
      // One article can span several rows (e.g. regular + «с загибом на угол»):
      // split the article target across its rows proportionally to project qtys
      const byArticle = new Map<string, KPItem[]>();
      items.forEach(it => {
        if (!panelArticles.has(it.article)) return;
        (byArticle.get(it.article) ?? byArticle.set(it.article, []).get(it.article)!).push(it);
      });
      byArticle.forEach((rows, article) => {
        const target = articleTarget.get(article) ?? 0;
        if (rows.length === 1) { rows[0].qty = target; return; }
        scaleQtys(rows, target);
      });
    }
    // Built-in TV загибы: add on top of wallCalcs total as a separate labeled line
    if (tvBuiltinCut) {
      panelsTableTotal += tvBuiltinCut.panels;
      const mat = kpCfgs[0]?.sectorMaterials[0] ?? BAMBOO_PANELS[0];
      addItem(mat.article, `Панель «${mat.name}» (загибы внутри выреза ТВ)`, tvBuiltinCut.panels, getPanelPrice(mat.id));
      panelArticles.add(mat.article);
    }
    const panelsTableCost = items.filter(it => panelArticles.has(it.article))
      .reduce((s, it) => s + it.qty * it.price, 0);
    // Final total = the table itself (calculated panel quantities + 3 m profile pieces)
    const finalTotal = items.reduce((sum, it) => sum + it.qty * it.price, 0);
    void totalCalcCost; void totalProjCostDimWalls;

    // Render КП onto an A4 canvas (Cyrillic-safe), then embed into PDF
    const W = 1240, H = 1754; // A4 @ 150dpi
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d')!;
    c.fillStyle = 'white'; c.fillRect(0, 0, W, H);

    // Header
    c.fillStyle = '#111111'; c.fillRect(0, 0, W, 130);
    c.fillStyle = 'white'; c.font = 'bold 44px sans-serif'; c.textBaseline = 'middle';
    c.fillText('ALL WALL', 60, 65);
    c.fillStyle = '#7ec662'; c.font = 'bold 22px sans-serif';
    c.fillText('Коммерческое предложение', 300, 68);
    c.fillStyle = '#bbbbbb'; c.font = '18px sans-serif'; c.textAlign = 'right';
    c.fillText(new Date().toLocaleDateString('ru-RU'), W - 60, 50);
    c.fillText('+7 495 151-09-46 · allwall.ru', W - 60, 82);
    c.textAlign = 'left';

    let y = 170;
    // Visualization preview
    if (kpImage) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const maxW = W - 120, maxH = 560;
          const k = Math.min(maxW / img.width, maxH / img.height);
          const iw = img.width * k, ih = img.height * k;
          c.drawImage(img, (W - iw) / 2, y, iw, ih);
          c.strokeStyle = '#e5e5e5'; c.lineWidth = 1;
          c.strokeRect((W - iw) / 2, y, iw, ih);
          y += ih + 50;
          resolve();
        };
        img.onerror = () => resolve();
        img.src = kpImage;
      });
    }

    // Table header
    const colX = [60, 260, 760, 880, 1010]; // article | name | qty | price | sum
    c.fillStyle = '#111111'; c.fillRect(60, y, W - 120, 44);
    c.fillStyle = 'white'; c.font = 'bold 17px sans-serif'; c.textBaseline = 'middle';
    c.fillText('Артикул', colX[0] + 14, y + 22);
    c.fillText('Наименование', colX[1], y + 22);
    c.fillText('Кол-во', colX[2], y + 22);
    c.fillText('Цена', colX[3], y + 22);
    c.fillText('Сумма', colX[4], y + 22);
    y += 44;

    c.font = '17px sans-serif';
    items.forEach((it, idx) => {
      if (idx % 2 === 1) { c.fillStyle = '#f7f7f7'; c.fillRect(60, y, W - 120, 40); }
      c.fillStyle = '#333333';
      c.fillText(it.article, colX[0] + 14, y + 20);
      c.fillText(it.name, colX[1], y + 20);
      c.fillText(`${it.qty} шт`, colX[2], y + 20);
      c.fillText(fmt(it.price), colX[3], y + 20);
      c.fillText(fmt(it.qty * it.price), colX[4], y + 20);
      y += 40;
    });

    // Wall dimensions & area check
    if (wallCalcs.length > 0) {
      y += 18;
      c.fillStyle = '#111111'; c.font = 'bold 18px sans-serif';
      c.fillText(wallZone === 'tv' ? 'Размеры ТВ-зоны и расход материала' : 'Размеры стен и расход материала', 60, y + 10);
      y += 34;
      c.font = '16px sans-serif';
      let totalWallArea = 0;
      wallCalcs.forEach(({ cfg, q, opt, fullPerRow, remW, ownPanels, calcCost }) => {
        const wM = cfg.wallWidthMm / 1000, hM = cfg.wallHeightMm / 1000;
        const area = wM * hM;
        totalWallArea += area;
        const heightNote = opt.donorPanels > 0
          ? ` · докрой по высоте: ${opt.donorPanels} ${panelsWord(opt.donorPanels)} режется на полосы ${(opt.remMm / 10).toFixed(0)} см (${opt.stripsPerPanel} шт. из панели)`
          : opt.fullRows > 1 ? ` · ${opt.fullRows} ${rowsWord(opt.fullRows)} по высоте` : '';
        const widthNote = remW > 0
          ? ` · целых панелей: ${ownPanels} + полоса ${(remW / 10).toFixed(0)} см на ряд из общего докроя`
          : ` · целых панелей: ${ownPanels}`;
        c.fillStyle = '#333333';
        c.fillText(
          `Стена ${q + 1}: ${wM.toLocaleString('ru-RU')} × ${hM.toLocaleString('ru-RU')} м · ${area.toFixed(2).replace('.', ',')} м² · панелей в проекте: ${cfg.panelCount}${widthNote}${heightNote} · расчётная стоимость: ${fmt(calcCost)}`,
          60, y + 8);
        y += 28;
      });
      if (sharedPanelsTotal > 0) {
        c.fillStyle = '#5a9c3e'; c.font = 'bold 16px sans-serif';
        c.fillText(
          `Докрой по ширине: узкие полосы всех стен кроятся из общих панелей — ${sharedPanelsTotal} ${panelsWord(sharedPanelsTotal)}${savedPanelsTotal > 0 ? ` (экономия ${savedPanelsTotal} ${panelsWord(savedPanelsTotal)} — остатки идут в работу)` : ''}`,
          60, y + 8);
        y += 26;
        c.font = '16px sans-serif';
      }
      c.fillStyle = '#555555'; c.font = 'bold 16px sans-serif';
      c.fillText(
        `Панель 2,8 × 1,22 м (${PANEL_AREA_M2.toFixed(2).replace('.', ',')} м²) · общая площадь стен: ${totalWallArea.toFixed(2).replace('.', ',')} м²`,
        60, y + 8);
      y += 26;
      c.fillStyle = '#111111';
      c.fillText(
        `Расчётная стоимость панелей по размерам стен: ${fmt(Math.round(panelsTableCost))}`,
        60, y + 8);
      y += 30;
    }

    // Column block: shape, sizes, perimeter, area, panels, cost
    if (columnCalc) {
      y += 18;
      c.fillStyle = '#111111'; c.font = 'bold 18px sans-serif';
      c.fillText('Колонна — расчёт по периметру', 60, y + 10);
      y += 34;
      c.font = '16px sans-serif'; c.fillStyle = '#333333';
      c.fillText(
        `Форма: ${COLUMN_SHAPE_LABELS[columnShape]} · ${columnSizesText(columnShape, columnSides)}${columnHeightMm > 0 ? ` · высота ${(columnHeightMm / 1000).toLocaleString('ru-RU')} м` : ''}`,
        60, y + 8);
      y += 28;
      c.fillText(
        `Периметр: ${(colPerMm / 1000).toFixed(2).replace('.', ',')} м${columnCalc.areaM2 > 0 ? ` · площадь: ${columnCalc.areaM2.toFixed(2).replace('.', ',')} м²` : ''} · панелей: ${columnCalc.needed} (по периметру ${columnCalc.perRow}, вкл. заднюю грань)`,
        60, y + 8);
      y += 28;
      if (columnCalc.opt.donorPanels > 0) {
        c.fillText(
          `Докрой по высоте: ${columnCalc.opt.donorPanels} ${panelsWord(columnCalc.opt.donorPanels)} режется на полосы ${(columnCalc.opt.remMm / 10).toFixed(0)} см (${columnCalc.opt.stripsPerPanel} шт. из одной панели)`,
          60, y + 8);
        y += 28;
      }
      if (columnCalc.wrappedCorners > 0) {
        c.fillText(
          `Загибы панелей на углах: ${columnCalc.wrappedCorners} — угловые профили в местах загиба не требуются`,
          60, y + 8);
        y += 28;
      }
      if (columnCalc.hiddenCount > 0) {
        c.fillStyle = '#333333'; c.font = '16px sans-serif';
        c.fillText(
          columnCalc.hiddenNames.length > 0
            ? `Невидимые стороны: ${columnCalc.hiddenCount} ${panelsWord(columnCalc.hiddenCount)} — «${columnCalc.hiddenNames.join('», «')}» (выбрано клиентом)`
            : `Невидимые стороны: ${columnCalc.hiddenCount} ${panelsWord(columnCalc.hiddenCount)} — по средней цене видимых панелей`,
          60, y + 8);
        y += 28;
      }
      c.fillStyle = '#111111'; c.font = 'bold 16px sans-serif';
      c.fillText(`Расчётная стоимость панелей колонны: ${fmt(Math.round(panelsTableCost))}`, 60, y + 8);
      y += 30;
    }

    // Standard window block: slopes + sill, cutting, joint preference
    if (windowCut) {
      y += 18;
      c.fillStyle = '#111111'; c.font = 'bold 18px sans-serif';
      c.fillText('Оконный проём — откосы и подоконник', 60, y + 10);
      y += 34;
      c.font = '16px sans-serif'; c.fillStyle = '#333333';
      c.fillText(
        `${isWindowPan ? 'Панорамное окно' : 'Окно'}: ${(winWidthMm / 1000).toLocaleString('ru-RU')} × ${(winHeightMm / 1000).toLocaleString('ru-RU')} м · откос ${(winSlopeDepthMm / 1000).toLocaleString('ru-RU')} м${isWindowPan ? ' (подоконник отсутствует)' : ''}`,
        60, y + 8);
      y += 28;
      c.fillText(
        `Деталей: ${windowCut.pieces.length}${winSlopeDepthMm > 0 ? ' — откосы: 2 вертикальных + 1 верхний' : ''} · панелей: ${windowCut.panels} (обрезки полос используются повторно)`,
        60, y + 8);
      y += 28;
      c.fillText(
        winJoint === 'profile'
          ? `Соединение на углах: через профиль — 2 вертикальных (${(winHeightMm / 1000).toLocaleString('ru-RU')} м) + 1 горизонтальный (${(winWidthMm / 1000).toLocaleString('ru-RU')} м), хлысты 3 м`
          : 'Соединение на углах: загиб панели — профили не требуются',
        60, y + 8);
      y += 28;
      c.fillStyle = '#111111'; c.font = 'bold 16px sans-serif';
      c.fillText(`Расчётная стоимость панелей окна: ${fmt(Math.round(panelsTableCost))}`, 60, y + 8);
      y += 30;
    }

    // Built-in TV: загибы inside the cutout
    if (tvBuiltinCut) {
      y += 18;
      c.fillStyle = '#111111'; c.font = 'bold 18px sans-serif';
      c.fillText('Встроенный ТВ — загибы внутри выреза', 60, y + 10);
      y += 34;
      c.font = '16px sans-serif'; c.fillStyle = '#333333';
      const cW = tvCutoutWidthMm / 1000, cH = tvCutoutHeightMm / 1000, cD = tvCutoutDepthMm / 1000;
      c.fillText(
        `Вырез: ${cW.toLocaleString('ru-RU')} × ${cH.toLocaleString('ru-RU')} м · глубина ${cD.toLocaleString('ru-RU')} м`,
        60, y + 8);
      y += 28;
      c.fillText(
        `Боковые загибы (×2): ${cD.toLocaleString('ru-RU')} × ${cH.toLocaleString('ru-RU')} м · площадь: ${(2 * cD * cH).toFixed(2).replace('.', ',')} м²`,
        60, y + 8);
      y += 28;
      c.fillText(
        `Верхний загиб: ${cD.toLocaleString('ru-RU')} × ${cW.toLocaleString('ru-RU')} м · площадь: ${(cD * cW).toFixed(2).replace('.', ',')} м²`,
        60, y + 8);
      y += 28;
      c.fillText(
        `Нижний загиб: ${cD.toLocaleString('ru-RU')} × ${cW.toLocaleString('ru-RU')} м · площадь: ${(cD * cW).toFixed(2).replace('.', ',')} м²`,
        60, y + 8);
      y += 28;
      c.fillText(
        `Деталей: ${tvBuiltinCut.pieces.length} · дополнительно панелей: ${tvBuiltinCut.panels} (обрезки полос используются повторно)`,
        60, y + 8);
      y += 28;
      if (tvCutoutJoint === 'profile') {
        const cutPieces = packProfileRuns([tvCutoutHeightMm, tvCutoutHeightMm, tvCutoutWidthMm, tvCutoutWidthMm]);
        const cWp = tvCutoutWidthMm / 1000, cHp = tvCutoutHeightMm / 1000;
        c.fillText(
          `Профили по периметру стыков: бок. 2×${cHp.toLocaleString('ru-RU')} м + гориз. 2×${cWp.toLocaleString('ru-RU')} м · хлыстов 3 м: ${cutPieces} (остатки используются повторно, если хватает на целый прогон)`,
          60, y + 8);
      } else {
        c.fillText('Стыки: загиб панели — профили не требуются', 60, y + 8);
      }
      y += 30;
    }

    // Surface-mounted TV block: face + sides + top + bottom, no cutout
    if (tvSurfaceCut) {
      const faceW = kpCfgs[0]?.wallWidthMm ?? 0;
      const faceH = kpCfgs[0]?.wallHeightMm ?? 0;
      y += 18;
      c.fillStyle = '#111111'; c.font = 'bold 18px sans-serif';
      c.fillText('ТВ-зона накладная — расчёт материала', 60, y + 10);
      y += 34;
      c.font = '16px sans-serif'; c.fillStyle = '#333333';
      c.fillText(
        `Лицевая плоскость: ${(faceW / 1000).toLocaleString('ru-RU')} × ${(faceH / 1000).toLocaleString('ru-RU')} м · площадь: ${((faceW / 1000) * (faceH / 1000)).toFixed(2).replace('.', ',')} м²`,
        60, y + 8);
      y += 28;
      if (tvSurfaceSideDepthMm > 0)  {
        c.fillText(`Боковые (×2): ${(tvSurfaceSideDepthMm / 1000).toLocaleString('ru-RU')} × ${(faceH / 1000).toLocaleString('ru-RU')} м · площадь: ${(2 * (tvSurfaceSideDepthMm / 1000) * (faceH / 1000)).toFixed(2).replace('.', ',')} м²`, 60, y + 8);
        y += 28;
      }
      if (tvSurfaceTopDepthMm > 0) {
        c.fillText(`Верхняя: ${(faceW / 1000).toLocaleString('ru-RU')} × ${(tvSurfaceTopDepthMm / 1000).toLocaleString('ru-RU')} м · площадь: ${((faceW / 1000) * (tvSurfaceTopDepthMm / 1000)).toFixed(2).replace('.', ',')} м²`, 60, y + 8);
        y += 28;
      }
      if (tvSurfaceBottomDepthMm > 0) {
        c.fillText(`Нижняя: ${(faceW / 1000).toLocaleString('ru-RU')} × ${(tvSurfaceBottomDepthMm / 1000).toLocaleString('ru-RU')} м · площадь: ${((faceW / 1000) * (tvSurfaceBottomDepthMm / 1000)).toFixed(2).replace('.', ',')} м²`, 60, y + 8);
        y += 28;
      }
      c.fillText(`Деталей: ${tvSurfaceCut.pieces.length} · панелей: ${tvSurfaceCut.panels} (обрезки полос используются повторно)`, 60, y + 8);
      y += 28;
      c.fillStyle = '#111111'; c.font = 'bold 16px sans-serif';
      c.fillText(`Расчётная стоимость панелей ТВ-зоны: ${fmt(Math.round(panelsTableCost))}`, 60, y + 8);
      y += 30;
    }

    // Calculated material quantities: panels (calc if dimensions given, else project) + 3 m profile pieces
    {
      c.fillStyle = '#111111'; c.font = 'bold 16px sans-serif';
      c.fillText(
        `Расчётное количество материалов: панели — ${panelsTableTotal} ${panelsWord(panelsTableTotal)} · профили — ${profilePiecesTotal} шт. (хлысты по 3 м)`,
        60, y + 8);
      y += 32;
    }

    // Total
    c.strokeStyle = '#111111'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(60, y + 4); c.lineTo(W - 60, y + 4); c.stroke();
    y += 30;
    c.fillStyle = '#111111'; c.font = 'bold 24px sans-serif'; c.textAlign = 'right';
    c.fillText(`Итого${columnCalc ? ' (по периметру колонны)' : windowCut ? ' (по расчёту оконного проёма)' : tvSurfaceCut ? ' (по расчётным размерам ТВ-зоны накладной)' : wallCalcs.length > 0 ? (wallZone === 'tv' ? ' (по расчётным размерам ТВ-зоны)' : ' (по расчётным размерам стен)') : ''}: ${fmt(finalTotal)}`, W - 60, y + 12);
    c.textAlign = 'left';
    if ((wallCalcs.length > 0 || columnCalc || windowCut || tvSurfaceCut) && finalTotal !== total) {
      y += 26;
      c.fillStyle = '#888888'; c.font = '15px sans-serif'; c.textAlign = 'right';
      c.fillText(`Стоимость по визуализации проекта: ${fmt(total)}`, W - 60, y + 12);
      c.textAlign = 'left';
    }
    y += 60;
    c.fillStyle = '#888888'; c.font = '14px sans-serif';
    c.fillText('Предложение носит информационный характер и не является публичной офертой.', 60, y);
    c.fillText('Точный расчёт с учётом размеров помещения уточняйте у менеджера: +7 495 151-09-46.', 60, y + 24);

    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    pdf.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297);
    pdf.save('allwall-kp.pdf');
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

  // Start fitting (примерка): place panels VERTICALLY — panel count per surface is
  // derived from the marked quad's proportions so each sector matches a real
  // upright 1,22 × 2,8 м panel (width : height = 1220 : 2800)
  const handleStartFitting = () => {
    const nQuads = Math.floor(points.length / 4);
    const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
    for (let q = 0; q < nQuads; q++) {
      const qp = points.slice(q * 4, q * 4 + 4);
      const avgW = (dist(qp[0], qp[1]) + dist(qp[3], qp[2])) / 2;
      const avgH = (dist(qp[0], qp[3]) + dist(qp[1], qp[2])) / 2;
      const count = avgH > 0
        ? Math.min(15, Math.max(1, Math.round(avgW / (avgH * PANEL_W_MM / PANEL_H_MM))))
        : 5;
      const cfg = surfacesRef.current[q] ?? defaultSurfaceConfig();
      surfacesRef.current[q] = { ...cfg, panelCount: count, dividerPositions: makeEqualDividers(count) };
      if (q === activeSurfaceRef.current) {
        setPanelCount(count);
        setDividerPositions(makeEqualDividers(count));
      }
    }
    setStep('edit');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (f) => {
        const img = new Image();
        img.onload = () => {
          maskStrokesRef.current = [];
          historyRef.current = [];
          setHistoryLen(0);
          surfacesRef.current = [defaultSurfaceConfig()];
          activeSurfaceRef.current = 0;
          setActiveSurface(0);
          setCornerTypes(['external', 'external']);
          setWrapJunctions([false, false]);
          setWallWidthMm(0);
          setWallHeightMm(0);
          setSavedPng(null);
          setImage(img);
          setStep('mark');
          setPoints([]);
          setSectorMaterials({});
          setActiveSector(null);
          setIsErasing(false);
          setPanelCount(5);
          setDividerPositions(makeEqualDividers(5));
          setMoldingStyle('none');
          setHMoldingStyle('none');
          setHMoldingCount(1);
          setHMoldingPositions([0.5]);
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
              <button onClick={undo} disabled={historyLen === 0}
                className={`text-xs font-medium flex items-center gap-1.5 transition-colors ${historyLen === 0 ? 'text-gray-300 cursor-default' : 'text-gray-600 hover:text-black'}`}
                title={historyLen === 0 ? 'Нет действий для отмены' : 'Ctrl+Z'}>
                <Undo2 size={13} /> Отменить
              </button>
            )}
            {step !== 'zone' && (
              <button
                onClick={() => { maskStrokesRef.current = []; historyRef.current = []; setHistoryLen(0); surfacesRef.current = [defaultSurfaceConfig()]; activeSurfaceRef.current = 0; setActiveSurface(0); setCornerTypes(['external', 'external']); setWrapJunctions([false, false]); setWallWidthMm(0); setWallHeightMm(0); setColumnShape('rect'); setColumnSides([0, 0, 0, 0]); setColumnHeightMm(0); setSavedPng(null); setWinSlopeDepthMm(0); setWinWidthMm(0); setWinHeightMm(0); setWinJoint('profile'); setTvCutoutWidthMm(0); setTvCutoutHeightMm(0); setTvCutoutDepthMm(0); setTvCutoutJoint('profile'); setTvCutoutInputMode('size'); setTvCutoutPresetInches(null); setTvType(null); setTvSurfaceSideDepthMm(0); setTvSurfaceTopDepthMm(0); setTvSurfaceBottomDepthMm(0); setStep('zone'); setWallZone(null); setWindowType(null); setImage(null); setPoints([]); setSectorMaterials({}); setActiveSector(null); setIsErasing(false); }}
                className="text-xs font-medium text-gray-400 hover:text-black flex items-center gap-1.5 transition-colors"
              >
                ← Назад
              </button>
            )}
          </div>
        </nav>

        {/* ── Main: canvas + right tool panel ── */}
        <div className="flex-1 flex flex-col md:flex-row gap-3 p-3 overflow-y-auto md:overflow-hidden md:min-h-0">

        {/* ── Canvas area ── */}
        <div className="flex-1 relative min-w-0 min-h-[55vw] md:min-h-0">
          {step === 'zone' && wallZone === 'tv' ? (
            <div className="flex flex-col items-center justify-center w-full h-full rounded-3xl bg-white border-2 border-dashed border-gray-200 p-5">
              <div className="text-center mb-5">
                <h3 className="text-base font-black text-gray-900 mb-1">Выберите тип ТВ-зоны</h3>
                <p className="text-xs text-gray-400">Как будет установлен телевизор?</p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                {([
                  { id: 'builtin',  label: 'Встроенный ТВ',  img: `${BASE}zones/tv-builtin.webp` },
                  { id: 'surface',  label: 'Накладной ТВ',   img: `${BASE}zones/tv-surface.jpg` },
                ] as const).map(tt => (
                  <button
                    key={tt.id}
                    onClick={() => { setTvType(tt.id); setStep('upload'); }}
                    className="flex flex-col overflow-hidden rounded-2xl border-2 border-gray-100 bg-gray-50 hover:border-black hover:shadow-lg transition-all active:scale-95 group text-left"
                  >
                    <div className="w-full h-40 bg-gray-200 overflow-hidden relative">
                      <img
                        src={tt.img}
                        alt={tt.label}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                    <div className="px-3 py-2.5">
                      <span className="text-[11px] font-black uppercase tracking-wide text-gray-800 group-hover:text-black">{tt.label}</span>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setWallZone(null); setTvType(null); }}
                className="mt-5 text-[11px] font-bold text-gray-400 hover:text-black transition-colors underline underline-offset-2"
              >
                ← Назад к выбору зоны
              </button>
            </div>
          ) : step === 'zone' && wallZone === 'window' ? (
            <div className="flex flex-col items-center justify-center w-full h-full rounded-3xl bg-white border-2 border-dashed border-gray-200 p-5">
              <div className="text-center mb-5">
                <h3 className="text-base font-black text-gray-900 mb-1">Выберите тип оконного проёма</h3>
                <p className="text-xs text-gray-400">Какое окно на вашем фото?</p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                {([
                  { id: 'standard',  label: 'Стандартное окно',  img: `${BASE}zones/window-standard.jpg` },
                  { id: 'panoramic', label: 'Панорамное окно',   img: `${BASE}zones/window-panoramic.jpg` },
                ] as const).map(wt => (
                  <button
                    key={wt.id}
                    onClick={() => { setWindowType(wt.id); setStep('upload'); }}
                    className="flex flex-col overflow-hidden rounded-2xl border-2 border-gray-100 bg-gray-50 hover:border-black hover:shadow-lg transition-all active:scale-95 group text-left"
                  >
                    <div className="w-full h-40 bg-gray-200 overflow-hidden relative">
                      <img
                        src={wt.img}
                        alt={wt.label}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                    <div className="px-3 py-2.5">
                      <span className="text-[11px] font-black uppercase tracking-wide text-gray-800 group-hover:text-black">{wt.label}</span>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setWallZone(null); setWindowType(null); }}
                className="mt-5 text-[11px] font-bold text-gray-400 hover:text-black transition-colors underline underline-offset-2"
              >
                ← Назад к выбору зоны
              </button>
            </div>
          ) : step === 'zone' ? (
            <div className="flex flex-col items-center justify-center w-full h-full rounded-3xl bg-white border-2 border-dashed border-gray-200 p-5">
              <div className="text-center mb-5">
                <h3 className="text-base font-black text-gray-900 mb-1">Выберите тип зоны</h3>
                <p className="text-xs text-gray-400">Какой участок стены вы хотите оформить?</p>
              </div>
              <div className="grid grid-cols-3 gap-3 w-full max-w-2xl">
                {([
                  { id: 'wall',       label: 'Стена',            img: `${BASE}zones/wall.jpg` },
                  { id: 'wall-niche', label: 'Стена с выступом', img: `${BASE}zones/wall-niche.jpg` },
                  { id: 'window',     label: 'Оконный проём',    img: `${BASE}zones/window.jpg` },
                  { id: 'door',       label: 'Дверной проём',    img: `${BASE}zones/door.jpg` },
                  { id: 'tv',         label: 'ТВ-зона',          img: `${BASE}zones/tv.jpg` },
                  { id: 'column',     label: 'Колонна',           img: `${BASE}zones/column.jpg` },
                ] as const).map(zone => (
                  <button
                    key={zone.id}
                    onClick={() => {
                      setWallZone(zone.id);
                      if (zone.id === 'column') setCornerTypes(['external', 'external']);
                      // Window / TV: an extra screen to pick the type first
                      if (zone.id !== 'window' && zone.id !== 'tv') setStep('upload');
                    }}
                    className="flex flex-col overflow-hidden rounded-2xl border-2 border-gray-100 bg-gray-50 hover:border-black hover:shadow-lg transition-all active:scale-95 group text-left"
                  >
                    <div className="w-full h-36 bg-gray-200 overflow-hidden relative">
                      <img
                        src={zone.img}
                        alt={zone.label}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                    <div className="px-3 py-2.5">
                      <span className="text-[11px] font-black uppercase tracking-wide text-gray-800 group-hover:text-black">{zone.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : step === 'upload' ? (
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
                <div className="hidden md:flex absolute top-5 left-1/2 -translate-x-1/2 bg-white/90 text-black px-5 py-1.5 rounded-full text-[10px] font-bold shadow-lg backdrop-blur-md border border-gray-100 uppercase tracking-widest pointer-events-none">
                  {wallZone === 'wall-niche'
                    ? (points.length < 4 ? `Стена 1: точка ${points.length + 1}/4` : points.length < 8 ? `Стена 2 (опц.): точка ${points.length - 3}/4 или «Начать»` : points.length < 12 ? `Стена 3 (опц.): точка ${points.length - 7}/4 или «Начать»` : 'Нажмите «Начать примерку»')
                    : wallZone === 'tv' && tvType !== 'surface'
                    ? (points.length < 4 ? `Передняя: точка ${points.length + 1}/4` : points.length < 8 ? `Верхняя (опц.): точка ${points.length - 3}/4 или «Начать»` : points.length < 12 ? `Боковая (опц.): точка ${points.length - 7}/4 или «Начать»` : 'Нажмите «Начать примерку»')
                    : wallZone === 'tv' && tvType === 'surface'
                    ? (points.length < 4 ? `Основная плоскость: точка ${points.length + 1}/4` : 'Нажмите «Начать примерку»')
                    : wallZone === 'column'
                    ? (points.length < 4 ? `Грань 1: точка ${points.length + 1}/4` : points.length < 8 ? `Грань 2 (опц.): точка ${points.length - 3}/4 или «Начать»` : 'Нажмите «Начать примерку»')
                    : wallZone === 'window' && windowType === 'standard'
                    ? (points.length < 4 ? `Откос: точка ${points.length + 1}/4` : points.length < 8 ? `Подоконник: точка ${points.length - 3}/4 или «Начать»` : 'Нажмите «Начать примерку»')
                    : wallZone === 'window' && windowType === 'panoramic'
                    ? (points.length < 4 ? `Откос: точка ${points.length + 1}/4` : points.length < 8 ? `Гориз. плоскость: точка ${points.length - 3}/4 или «Начать»` : 'Нажмите «Начать примерку»')
                    : (points.length < 4 ? `Кликните на угол стены (${points.length}/4)` : 'Нажмите «Начать примерку»')}
                </div>
              )}
              {step === 'edit' && !isErasing && (
                <div className="hidden md:flex absolute top-5 left-1/2 -translate-x-1/2 bg-white/90 text-black px-5 py-1.5 rounded-full text-[10px] font-bold shadow-lg backdrop-blur-md border border-gray-100 uppercase tracking-widest pointer-events-none">
                  {isDraggingDivider ? 'Перемещайте разделитель' : 'Выберите панель или перетащите разделитель'}
                </div>
              )}
              {step === 'edit' && isErasing && (
                <div className="hidden md:flex absolute top-5 left-1/2 -translate-x-1/2 bg-red-500 text-white px-5 py-1.5 rounded-full text-[10px] font-bold shadow-lg uppercase tracking-widest pointer-events-none">
                  Режим ластика — рисуйте для удаления
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Mobile hint strip (below canvas, above tool panel) ── */}
        {image && (
          <div className="flex md:hidden justify-center">
            {step === 'mark' && (
              <div className="bg-white/90 text-black px-5 py-1.5 rounded-full text-[10px] font-bold shadow-lg backdrop-blur-md border border-gray-100 uppercase tracking-widest">
                {wallZone === 'wall-niche'
                  ? (points.length < 4 ? `Стена 1: точка ${points.length + 1}/4` : points.length < 8 ? `Стена 2 (опц.): точка ${points.length - 3}/4 или «Начать»` : points.length < 12 ? `Стена 3 (опц.): точка ${points.length - 7}/4 или «Начать»` : 'Нажмите «Начать примерку»')
                  : wallZone === 'tv' && tvType !== 'surface'
                  ? (points.length < 4 ? `Передняя: точка ${points.length + 1}/4` : points.length < 8 ? `Верхняя (опц.): точка ${points.length - 3}/4 или «Начать»` : points.length < 12 ? `Боковая (опц.): точка ${points.length - 7}/4 или «Начать»` : 'Нажмите «Начать примерку»')
                  : wallZone === 'tv' && tvType === 'surface'
                  ? (points.length < 4 ? `Основная плоскость: точка ${points.length + 1}/4` : 'Нажмите «Начать примерку»')
                  : wallZone === 'column'
                  ? (points.length < 4 ? `Грань 1: точка ${points.length + 1}/4` : points.length < 8 ? `Грань 2 (опц.): точка ${points.length - 3}/4 или «Начать»` : 'Нажмите «Начать примерку»')
                  : wallZone === 'window' && windowType === 'standard'
                  ? (points.length < 4 ? `Откос: точка ${points.length + 1}/4` : points.length < 8 ? `Подоконник: точка ${points.length - 3}/4 или «Начать»` : 'Нажмите «Начать примерку»')
                  : wallZone === 'window' && windowType === 'panoramic'
                  ? (points.length < 4 ? `Откос: точка ${points.length + 1}/4` : points.length < 8 ? `Гориз. плоскость: точка ${points.length - 3}/4 или «Начать»` : 'Нажмите «Начать примерку»')
                  : (points.length < 4 ? `Кликните на угол стены (${points.length}/4)` : 'Нажмите «Начать примерку»')}
              </div>
            )}
            {step === 'edit' && !isErasing && (
              <div className="bg-white/90 text-black px-5 py-1.5 rounded-full text-[10px] font-bold shadow-lg backdrop-blur-md border border-gray-100 uppercase tracking-widest">
                {isDraggingDivider ? 'Перемещайте разделитель' : 'Выберите панель или перетащите разделитель'}
              </div>
            )}
            {step === 'edit' && isErasing && (
              <div className="bg-red-500 text-white px-5 py-1.5 rounded-full text-[10px] font-bold shadow-lg uppercase tracking-widest">
                Режим ластика — рисуйте для удаления
              </div>
            )}
          </div>
        )}

        {/* ── Right tool panel ── */}
        <div className="w-full md:w-[232px] shrink-0 flex flex-col gap-2 overflow-y-auto pb-4 md:pb-1" style={{ scrollbarWidth: 'none' }}>

          {/* MARK step */}
          {step === 'mark' && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-1.5 mb-3">
                <Check size={12} className="text-gray-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Разметка стены</span>
              </div>
              {wallZone === 'wall-niche' ? (<>
                <p className="text-[9px] text-gray-400 mb-2 leading-relaxed">
                  Каждая стена отмечается <span className="font-bold text-gray-600">отдельно</span> — 4 угла по часовой стрелке. Контуры стен не связаны между собой.<br/>
                  <span className="font-bold text-[#007aff]">Стена 1</span> — основная (обязательно).<br/>
                  <span className="font-bold text-[#7ec662]">Стена 2</span> и <span className="font-bold text-[#ff9500]">Стена 3</span> — по желанию.
                </p>
                {points.length >= 8 && (
                  <div className="mb-3">
                    <p className="text-[9px] text-gray-400 mb-1.5 font-bold uppercase tracking-wide">Тип углов:</p>
                    <CornerTypeCheckboxes nJunctions={Math.min(2, Math.floor(points.length / 4) - 1)} cornerTypes={cornerTypes} setCornerTypes={(v) => { pushHistory(); setCornerTypes(v); }} wrapJunctions={wrapJunctions} setWrapJunctions={(v) => { pushHistory(); setWrapJunctions(v); }} />
                  </div>
                )}
              </>) : wallZone === 'tv' && tvType !== 'surface' ? (<>
                <p className="text-[9px] text-gray-400 mb-2 leading-relaxed">
                  Каждая плоскость короба отмечается <span className="font-bold text-gray-600">отдельно</span> — 4 угла по часовой стрелке.<br/>
                  <span className="font-bold text-[#007aff]">Передняя</span> — основная плоскость (обязательно).<br/>
                  <span className="font-bold text-[#7ec662]">Верхняя</span> и <span className="font-bold text-[#ff9500]">Боковая</span> — по желанию.<br/>
                  Углы короба — <span className="font-bold text-gray-600">внешние</span>, стыкуются через профиль или загиб панели.
                </p>
                {points.length >= 8 && (
                  <div className="mb-3">
                    <p className="text-[9px] text-gray-400 mb-1.5 font-bold uppercase tracking-wide">Тип углов:</p>
                    <CornerTypeCheckboxes nJunctions={Math.min(2, Math.floor(points.length / 4) - 1)} cornerTypes={cornerTypes} setCornerTypes={(v) => { pushHistory(); setCornerTypes(v); }} wrapJunctions={wrapJunctions} setWrapJunctions={(v) => { pushHistory(); setWrapJunctions(v); }} />
                  </div>
                )}
              </>) : wallZone === 'tv' && tvType === 'surface' ? (<>
                <p className="text-[9px] text-gray-400 mb-2 leading-relaxed">
                  Отметьте <span className="font-bold text-gray-600">основную плоскость</span> — 4 угла по часовой стрелке.<br/>
                  Боковые, верхняя и нижняя полосы задаются размерами в настройках — они учтутся в расчёте автоматически.
                </p>
              </>) : wallZone === 'column' ? (
                <p className="text-[9px] text-gray-400 mb-2 leading-relaxed">
                  Отметьте <span className="font-bold text-gray-600">видимые грани</span> колонны — каждая грань отдельно, 4 угла по часовой стрелке.<br/>
                  <span className="font-bold text-[#007aff]">Грань 1</span> — обязательно, <span className="font-bold text-[#7ec662]">Грань 2</span> — по желанию.<br/>
                  На углах панель <span className="font-bold text-[#5a9c3e]">загибается</span> — профиль не требуется. Для круглой колонны отметьте видимую часть одной плоскостью.
                </p>
              ) : wallZone === 'window' && windowType === 'standard' ? (
                <p className="text-[9px] text-gray-400 mb-2 leading-relaxed">
                  Отметьте <span className="font-bold text-gray-600">2 видимые плоскости</span> окна — каждая отдельно, 4 угла по часовой стрелке.<br/>
                  <span className="font-bold text-[#007aff]">Откос</span> — видимая боковая/верхняя плоскость (обязательно).<br/>
                  <span className="font-bold text-[#7ec662]">Подоконник</span> — по желанию.<br/>
                  В расчёте: <span className="font-bold text-gray-600">3 откоса</span> (2 вертикальных + верхний) и <span className="font-bold text-gray-600">1 подоконник</span>.
                </p>
              ) : wallZone === 'window' && windowType === 'panoramic' ? (
                <p className="text-[9px] text-gray-400 mb-2 leading-relaxed">
                  Отметьте <span className="font-bold text-gray-600">до 2 плоскостей</span> панорамного окна — каждая отдельно, 4 угла по часовой стрелке.<br/>
                  <span className="font-bold text-[#007aff]">Откос</span> — боковая/верхняя плоскость (обязательно).<br/>
                  <span className="font-bold text-[#7ec662]">Горизонтальная плоскость</span> — верхняя горизонтальная поверхность (по желанию).
                </p>
              ) : (
                <p className="text-[9px] text-gray-400 mb-4 leading-relaxed">Кликайте по 4 углам стены по часовой стрелке.</p>
              )}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {Array.from({ length: wallZone === 'wall-niche' || (wallZone === 'tv' && tvType !== 'surface') ? 12 : wallZone === 'column' || wallZone === 'window' ? 8 : 4 }, (_, i) => i + 1).map(i => (
                  <div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                    points.length >= i
                      ? (i <= 4 ? 'bg-[#007aff] text-white border-[#007aff]' : i <= 8 ? 'bg-[#7ec662] text-white border-[#7ec662]' : 'bg-[#ff9500] text-white border-[#ff9500]')
                      : i <= 4 ? 'text-gray-300 border-gray-200' : 'text-gray-200 border-dashed border-gray-200'
                  }`}>
                    {points.length >= i ? <Check size={11}/> : i}
                  </div>
                ))}
              </div>
              {points.length > 0 && (
                <button onClick={() => setPoints(points.slice(0,-1))}
                  className="w-full mb-2 py-1.5 text-[9px] font-bold text-gray-400 hover:text-red-500 flex items-center justify-center gap-1 transition-colors">
                  <Undo2 size={11}/> Отменить точку
                </button>
              )}
              <button disabled={points.length < 4} onClick={handleStartFitting}
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
                <MoldingStyleRow value={moldingStyle} onChange={(v) => { pushHistory(); setMoldingStyle(v); if (v !== 'none') setMoldingWidth(1); }} vertical={true}/>
                {moldingStyle !== 'none' && (
                  <div className="mt-2.5">
                    <div className="flex justify-between mb-1">
                      <span className="text-[9px] text-gray-400 font-bold uppercase">Толщина</span>
                      <span className="text-[9px] font-bold">{moldingWidth}px</span>
                    </div>
                    <input type="range" min="1" max="4" value={moldingWidth}
                      onPointerDown={pushHistory}
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
              <MoldingStyleRow value={hMoldingStyle} onChange={(v) => { pushHistory(); setHMoldingStyle(v); if (v !== 'none') setHMoldingWidth(1); }} vertical={false}/>
              {hMoldingStyle !== 'none' && (
                <div className="mt-2.5 space-y-2.5">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[9px] text-gray-400 font-bold uppercase">Количество</span>
                      <span className="text-[9px] font-bold">{hMoldingPositions.length}</span>
                    </div>
                    <input type="range" min="1" max="5" value={hMoldingCount}
                      onPointerDown={pushHistory}
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

            {/* Surface selector — per-surface editing */}
            {points.length >= 8 && (
              <div className="bg-white rounded-2xl p-3.5 shadow-sm">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Поверхность</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {Array.from({ length: Math.min(3, Math.floor(points.length / 4)) }, (_, i) => i).map(i => (
                    <button key={i} onClick={() => switchSurface(i)}
                      className={`w-full py-2 px-3 text-left text-[10px] font-bold rounded-xl border transition-all active:scale-95 ${activeSurface === i ? 'bg-[#7ec662] text-white border-[#7ec662]' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400'}`}>
                      {(wallZone === 'column' ? COLUMN_SURFACE_LABELS : wallZone === 'window' ? (windowType === 'panoramic' ? WINDOW_PAN_LABELS : WINDOW_STD_LABELS) : wallZone === 'tv' ? TV_ZONE_LABELS : SURFACE_LABELS)[i]}
                    </button>
                  ))}
                </div>
                <p className="text-[8px] text-gray-400 mt-2 leading-relaxed">Кликните по плоскости на фото или выберите здесь. Панели, количество и профили настраиваются для каждой поверхности отдельно.</p>
              </div>
            )}

            {/* Corner types — shown for wall-niche, tv-zone (builtin), column with 8+ points */}
            {(wallZone === 'wall-niche' || (wallZone === 'tv' && tvType !== 'surface') || wallZone === 'column') && points.length >= 8 && (
              <div className="bg-white rounded-2xl p-3.5 shadow-sm">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Тип углов</span>
                </div>
                <CornerTypeCheckboxes nJunctions={Math.min(2, Math.floor(points.length / 4) - 1)} cornerTypes={cornerTypes} setCornerTypes={(v) => { pushHistory(); setCornerTypes(v); }} wrapJunctions={wrapJunctions} setWrapJunctions={(v) => { pushHistory(); setWrapJunctions(v); }} />
              </div>
            )}

            {/* TV zone: surface type — side/top/bottom depths */}
            {wallZone === 'tv' && tvType === 'surface' && (
              <div className="bg-white rounded-2xl p-3.5 shadow-sm">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Columns size={12} className="text-gray-400"/>
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Глубина полос вокруг ТВ</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <label className="block">
                    <span className="text-[8px] font-bold text-gray-400 uppercase">Боковая, м</span>
                    <MeterInput placeholder="напр. 0,2" valueMm={tvSurfaceSideDepthMm} onChangeMm={(v) => { pushHistory(); setTvSurfaceSideDepthMm(v); }} />
                  </label>
                  <label className="block">
                    <span className="text-[8px] font-bold text-gray-400 uppercase">Верхняя, м</span>
                    <MeterInput placeholder="напр. 0,15" valueMm={tvSurfaceTopDepthMm} onChangeMm={(v) => { pushHistory(); setTvSurfaceTopDepthMm(v); }} />
                  </label>
                  <label className="block col-span-2">
                    <span className="text-[8px] font-bold text-gray-400 uppercase">Нижняя, м</span>
                    <MeterInput placeholder="напр. 0,1" valueMm={tvSurfaceBottomDepthMm} onChangeMm={(v) => { pushHistory(); setTvSurfaceBottomDepthMm(v); }} />
                  </label>
                </div>
                {wallWidthMm > 0 && wallHeightMm > 0 && (() => {
                  const totalArea =
                    (wallWidthMm / 1000) * (wallHeightMm / 1000) +
                    2 * (tvSurfaceSideDepthMm / 1000) * (wallHeightMm / 1000) +
                    (wallWidthMm / 1000) * (tvSurfaceTopDepthMm / 1000) +
                    (wallWidthMm / 1000) * (tvSurfaceBottomDepthMm / 1000);
                  return (
                    <p className="text-[9px] text-gray-500 leading-relaxed">
                      Общая площадь: <span className="font-bold text-gray-700">{totalArea.toFixed(2).replace('.', ',')} м²</span>
                      {' '}— лицевая + боковые + верхняя + нижняя.
                    </p>
                  );
                })()}
              </div>
            )}

            {/* Column shape & dimensions */}
            {wallZone === 'column' && (
              <div className="bg-white rounded-2xl p-3.5 shadow-sm">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Columns size={12} className="text-gray-400"/>
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Колонна · форма и размеры</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                  {(['rect', 'round', 'triangle'] as ColumnShape[]).map(sh => (
                    <button key={sh}
                      onClick={() => { pushHistory(); setColumnShape(sh); setColumnSides([0, 0, 0, 0]); }}
                      className={`py-2 rounded-xl text-[8px] font-bold uppercase tracking-wide transition-all active:scale-95 ${columnShape === sh ? 'bg-black text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                      {sh === 'rect' ? 'Прямоуг.' : sh === 'round' ? 'Круг/овал' : 'Треуг.'}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {(columnShape === 'rect'
                    ? ['Сторона A, м', 'Сторона B, м', 'Сторона C, м', 'Сторона D, м']
                    : columnShape === 'round'
                    ? ['Диаметр 1, м', 'Диаметр 2, м (овал)']
                    : ['Сторона A, м', 'Сторона B, м', 'Сторона C, м']
                  ).map((label, idx) => (
                    <label key={label} className="block">
                      <span className="text-[8px] font-bold text-gray-400 uppercase">{label}</span>
                      <MeterInput placeholder="0,40"
                        valueMm={columnSides[idx]}
                        onChangeMm={(v) => setColumnSides(prev => { const next = [...prev]; next[idx] = v; return next; })} />
                    </label>
                  ))}
                  <label className="block">
                    <span className="text-[8px] font-bold text-gray-400 uppercase">Высота, м</span>
                    <MeterInput placeholder="напр. 2,7" valueMm={columnHeightMm} onChangeMm={setColumnHeightMm} />
                  </label>
                </div>
                <p className="text-[8px] text-gray-400 mb-1.5">Панель загибается вокруг колонны — расчёт по полному периметру (включая заднюю грань). Панель: 2,80 × 1,22 м.</p>
                {(() => {
                  const perMm = columnPerimeterMm(columnShape, columnSides);
                  if (perMm <= 0) return null;
                  const perRow = Math.ceil(perMm / PANEL_W_MM);
                  const opt = optimizedPanelCalc(perRow, columnHeightMm);
                  const areaM2 = columnHeightMm > 0 ? (perMm / 1000) * (columnHeightMm / 1000) : 0;
                  return (
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-gray-600">Периметр: {(perMm / 1000).toFixed(2).replace('.', ',')} м{areaM2 > 0 ? ` · площадь: ${areaM2.toFixed(2).replace('.', ',')} м²` : ''}</p>
                      <p className="text-[9px] font-bold text-[#5a9c3e]">Панелей всего: {opt.needed} (по периметру {perRow}, периметр ÷ 1,22 м, округление вверх)</p>
                      {opt.donorPanels > 0 && columnHeightMm > PANEL_H_MM && (
                        <p className="text-[9px] font-bold text-amber-600">⚠ Высота больше 2,8 м — недостающие {(opt.remMm / 10).toFixed(0)} см докраиваются: {opt.donorPanels} {panelsWord(opt.donorPanels)} режется на полосы ({opt.stripsPerPanel} шт. из одной панели)</p>
                      )}
                    </div>
                  );
                })()}
                {(() => {
                  // Panels on INVISIBLE faces — offer the panels the client already picked on the visualization
                  const usedIds = new Set<string>();
                  Object.values(sectorMaterials).forEach(m => m && usedIds.add(m.id));
                  surfacesRef.current.forEach((s, q) => { if (q !== activeSurface) Object.values(s.sectorMaterials).forEach(m => m && usedIds.add(m.id)); });
                  const used = BAMBOO_PANELS.filter(p => usedIds.has(p.id));
                  if (used.length === 0) return null;
                  return (
                    <div className="mt-2.5 pt-2.5 border-t border-gray-100">
                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Панели на невидимых сторонах</p>
                      <p className="text-[8px] text-gray-400 mb-1.5">Отметьте, какие панели идут на стороны, не видимые на фото (из уже выбранных). Если ничего не отмечено — считаем по средней цене видимых.</p>
                      {used.map(p => (
                        <label key={p.id} className="flex items-center gap-2 py-1 cursor-pointer">
                          <input type="checkbox" className="accent-[#7ec662]"
                            checked={hiddenFaceMats.includes(p.id)}
                            onChange={(e) => setHiddenFaceMats(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))} />
                          <span className="w-4 h-4 rounded border border-gray-200 shrink-0" style={{ backgroundColor: p.color }} />
                          <span className="text-[9px] font-bold text-gray-600">{p.name} <span className="text-gray-300 font-mono">{p.article}</span></span>
                        </label>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Standard window: dimensions + joint preference */}
            {wallZone === 'window' && (windowType === 'standard' || windowType === 'panoramic') && (
              <div className="bg-white rounded-2xl p-3.5 shadow-sm">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Columns size={12} className="text-gray-400"/>
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Окно · размеры и стыковка</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <label className="block">
                    <span className="text-[8px] font-bold text-gray-400 uppercase">Ширина окна, м</span>
                    <MeterInput placeholder="напр. 1,4" valueMm={winWidthMm} onChangeMm={(v) => { pushHistory(); setWinWidthMm(v); }} />
                  </label>
                  <label className="block">
                    <span className="text-[8px] font-bold text-gray-400 uppercase">Высота окна, м</span>
                    <MeterInput placeholder="напр. 1,5" valueMm={winHeightMm} onChangeMm={(v) => { pushHistory(); setWinHeightMm(v); }} />
                  </label>
                  <label className="block">
                    <span className="text-[8px] font-bold text-gray-400 uppercase">Глубина откоса, м</span>
                    <MeterInput placeholder="напр. 0,25" valueMm={winSlopeDepthMm} onChangeMm={(v) => { pushHistory(); setWinSlopeDepthMm(v); }} />
                  </label>
                  
                </div>
                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Соединение на углах откосов</p>
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  {([['profile', 'Через профиль'], ['bend', 'Загиб панели']] as const).map(([id, label]) => (
                    <button key={id}
                      onClick={() => { pushHistory(); setWinJoint(id); }}
                      className={`py-2 rounded-xl text-[8px] font-bold uppercase tracking-wide transition-all active:scale-95 ${winJoint === id ? 'bg-black text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-[8px] text-gray-400 mb-1.5">{winJoint === 'profile'
                  ? 'На наружных углах откосов ставится профиль: 2 вертикальных (высота окна) + 1 горизонтальный (ширина окна). Хлысты 3 м, раскрой оптимизирован.'
                  : 'Панель загибается на углах — профили не требуются.'}</p>
                {(() => {
                  const pieces = windowStdPieces(winSlopeDepthMm, winWidthMm, winHeightMm, 0, 0);
                  if (pieces.length === 0) return (
                    <p className="text-[8px] text-gray-400">В расчёте: 3 откоса (2 вертикальных по высоте окна + верхний по ширине) и 1 подоконник. Обрезки панелей используются повторно.</p>
                  );
                  const cut = packWindowPieces(pieces);
                  return (
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-gray-600">Деталей: {cut.pieces.length} ({winSlopeDepthMm > 0 ? '3 откоса' : 'откосы не заданы'})</p>
                      <p className="text-[9px] font-bold text-[#5a9c3e]">Панелей: {cut.panels} — обрезки полос используются повторно</p>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Wall dimensions & area check */}
            {wallZone !== 'column' && wallZone !== 'window' && (
            <div className="bg-white rounded-2xl p-3.5 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Columns size={12} className="text-gray-400"/>
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{wallZone === 'tv' ? (tvType === 'surface' ? 'ТВ-зона накладная — Основная плоскость' : `ТВ-зона — ${TV_ZONE_LABELS[activeSurface]}`) : `Размеры стены ${activeSurface + 1}`}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <label className="block">
                  <span className="text-[8px] font-bold text-gray-400 uppercase">Ширина, м</span>
                  <MeterInput placeholder="напр. 3,6" valueMm={wallWidthMm} onChangeMm={(v) => { pushHistory(); setWallWidthMm(v); }} />
                </label>
                <label className="block">
                  <span className="text-[8px] font-bold text-gray-400 uppercase">Высота, м</span>
                  <MeterInput placeholder="напр. 2,7" valueMm={wallHeightMm} onChangeMm={(v) => { pushHistory(); setWallHeightMm(v); }} />
                </label>
              </div>
              <p className="text-[8px] text-gray-400 mb-1.5">Панель: 2,80 × 1,22 м ({PANEL_AREA_M2.toFixed(2).replace('.', ',')} м²)</p>
              {wallWidthMm > 0 && wallHeightMm > 0 && (() => {
                const areaM2 = (wallWidthMm / 1000) * (wallHeightMm / 1000);
                const cols = Math.ceil(wallWidthMm / PANEL_W_MM);
                const opt = optimizedPanelCalc(cols, wallHeightMm);
                const enough = panelCount >= cols;
                const tooTall = wallHeightMm > PANEL_H_MM;
                return (
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-gray-600">Площадь стены: {areaM2.toFixed(2).replace('.', ',')} м²</p>
                    <p className={`text-[9px] font-bold ${enough ? 'text-[#5a9c3e]' : 'text-amber-600'}`}>
                      {enough
                        ? `✓ Панелей в ряду достаточно: ${panelCount} (по ширине ${cols})`
                        : `⚠ По ширине нужно ${cols} ${panelsWord(cols)} в ряду — в проекте ${panelCount}`}
                    </p>
                    {!enough && (
                      <button onClick={() => handleChangePanelCount(cols)}
                        className="w-full py-1.5 text-[9px] font-bold rounded-lg bg-[#7ec662] text-white hover:bg-[#6db453] transition-all active:scale-95">
                        Установить {cols} {panelsWord(cols)} в ряд
                      </button>
                    )}
                    {tooTall && (
                      <p className="text-[9px] font-bold text-amber-600">
                        {opt.donorPanels > 0
                          ? `⚠ Высота стены больше 2,8 м — недостающие ${(opt.remMm / 10).toFixed(0)} см докраиваются: ${opt.donorPanels} ${panelsWord(opt.donorPanels)} режется на полосы (${opt.stripsPerPanel} шт. из одной), всего ${opt.needed} ${panelsWord(opt.needed)} (в расчёте КП учтено)`
                          : `⚠ Высота стены больше 2,8 м — ${opt.fullRows} ${rowsWord(opt.fullRows)} по высоте, всего ${opt.needed} ${panelsWord(opt.needed)} (в расчёте КП учтено)`}
                      </p>
                    )}
                    <p className="text-[8px] text-gray-400">Ширина панели в проекте: {(wallWidthMm / panelCount / 1000).toFixed(2).replace('.', ',')} м (макс. 1,22 м)</p>
                  </div>
                );
              })()}
            </div>
            )}

            {/* TV zone: cutout for TV — only for built-in */}
            {wallZone === 'tv' && tvType === 'builtin' && (
              <div className="bg-white rounded-2xl p-3.5 shadow-sm">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Columns size={12} className="text-gray-400"/>
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Вырез под телевизор</span>
                </div>
                {/* Mode toggle */}
                <div className="flex gap-1.5 mb-3">
                  {([['size', 'По размерам'], ['inches', 'По дюймам ТВ']] as const).map(([mode, label]) => (
                    <button key={mode} onClick={() => { pushHistory(); setTvCutoutInputMode(mode); if (mode === 'size') setTvCutoutPresetInches(null); }}
                      className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all active:scale-95 ${tvCutoutInputMode === mode ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400'}`}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Inches presets */}
                {tvCutoutInputMode === 'inches' && (
                  <div className="flex gap-1.5 mb-3">
                    {([50, 55, 65] as const).map(inch => (
                      <button key={inch} onClick={() => {
                        pushHistory();
                        setTvCutoutPresetInches(inch);
                        setTvCutoutWidthMm(TV_INCH_PRESETS[inch].wMm);
                        setTvCutoutHeightMm(TV_INCH_PRESETS[inch].hMm);
                      }}
                        className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${tvCutoutPresetInches === inch ? 'bg-black text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                        {inch}"
                      </button>
                    ))}
                  </div>
                )}

                {/* Manual size inputs */}
                {tvCutoutInputMode === 'size' && (
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <label className="block">
                      <span className="text-[8px] font-bold text-gray-400 uppercase">Ширина выреза, м</span>
                      <MeterInput placeholder="напр. 1,2" valueMm={tvCutoutWidthMm} onChangeMm={(v) => { pushHistory(); setTvCutoutWidthMm(v); }} />
                    </label>
                    <label className="block">
                      <span className="text-[8px] font-bold text-gray-400 uppercase">Высота выреза, м</span>
                      <MeterInput placeholder="напр. 0,7" valueMm={tvCutoutHeightMm} onChangeMm={(v) => { pushHistory(); setTvCutoutHeightMm(v); }} />
                    </label>
                  </div>
                )}

                {/* Depth — always */}
                <div className="mb-2">
                  <label className="block">
                    <span className="text-[8px] font-bold text-gray-400 uppercase">Глубина выреза, м</span>
                    <MeterInput placeholder="напр. 0,15" valueMm={tvCutoutDepthMm} onChangeMm={(v) => { pushHistory(); setTvCutoutDepthMm(v); }} />
                  </label>
                </div>

                {tvCutoutDepthMm > 0 && (
                  <div className="mb-2">
                    <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">Тип соединения на углах</p>
                    <div className="flex gap-1.5">
                      {(['profile', 'bend'] as const).map(jt => (
                        <button key={jt} onClick={() => { pushHistory(); setTvCutoutJoint(jt); }}
                          className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all active:scale-95 ${tvCutoutJoint === jt ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400'}`}>
                          {jt === 'profile' ? 'Профиль' : 'Загиб панели'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {tvCutoutWidthMm > 0 && tvCutoutHeightMm > 0 && (() => {
                  const cW = tvCutoutWidthMm / 1000, cH = tvCutoutHeightMm / 1000, cD = tvCutoutDepthMm / 1000;
                  const sidesArea = tvCutoutDepthMm > 0 ? 2 * cD * cH : 0;
                  const topArea = tvCutoutDepthMm > 0 ? cD * cW : 0;
                  const bottomArea = tvCutoutDepthMm > 0 ? cD * cW : 0;
                  const totalZagiby = sidesArea + topArea + bottomArea;
                  const profilePieces = tvCutoutJoint === 'profile' && tvCutoutWidthMm > 0 && tvCutoutHeightMm > 0
                    ? packProfileRuns([tvCutoutHeightMm, tvCutoutHeightMm, tvCutoutWidthMm, tvCutoutWidthMm])
                    : 0;
                  return (
                    <div className="space-y-1">
                      <p className="text-[9px] text-gray-500 leading-relaxed">
                        Площадь выреза: <span className="font-bold text-gray-700">{(cW * cH).toFixed(2).replace('.', ',')} м²</span>
                        {tvCutoutDepthMm > 0 && <span> · глубина <span className="font-bold text-gray-700">{cD.toLocaleString('ru-RU')} м</span></span>}
                      </p>
                      {tvCutoutDepthMm > 0 && (
                        <p className="text-[9px] text-[#5a9c3e] font-bold leading-relaxed">
                          Грани внутри: боковые ×2 ({sidesArea.toFixed(2).replace('.', ',')} м²) + верхний ({topArea.toFixed(2).replace('.', ',')} м²) + нижний ({bottomArea.toFixed(2).replace('.', ',')} м²) = {totalZagiby.toFixed(2).replace('.', ',')} м²
                        </p>
                      )}
                      {tvCutoutJoint === 'profile' && tvCutoutWidthMm > 0 && tvCutoutHeightMm > 0 && (
                        <p className="text-[9px] text-gray-500 leading-relaxed">
                          Профили по периметру стыков: бок. 2×{cH.toLocaleString('ru-RU')} + гориз. 2×{cW.toLocaleString('ru-RU')} м → <span className="font-bold text-gray-700">{profilePieces} хл. 3 м</span> (остатки используются, если хватает на целый прогон).
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

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
              {wallZone === 'column' && columnShape === 'round' && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Положение блика</span>
                    <span className="text-[8px] text-gray-400 font-mono">{cylHighlightPos < 0.45 ? '◀ слева' : cylHighlightPos > 0.55 ? 'справа ▶' : 'центр'}</span>
                  </div>
                  <input
                    type="range" min={0.1} max={0.9} step={0.01}
                    value={cylHighlightPos}
                    onChange={e => setCylHighlightPos(parseFloat(e.target.value))}
                    className="w-full accent-black"
                  />
                  <p className="text-[7px] text-gray-300 mt-0.5">Сместите блик цилиндра к источнику света на фото. Режимы «Утро/Вечер» смещают его автоматически.</p>
                </div>
              )}
            </div>

            {/* Save + КП — side by side, compact so both fit on screen without scrolling */}
            <div className="flex gap-1.5 mt-1">
              <button onClick={handleSave}
                className="flex-1 min-w-0 flex items-center justify-center gap-1 bg-black text-white text-[10px] font-bold py-2 px-1.5 rounded-xl hover:bg-gray-800 transition-all active:scale-95 shadow-sm">
                <Download size={11} className="shrink-0" /> Сохранить PNG
              </button>
              <button onClick={handleGenerateKP}
                className="flex-1 min-w-0 flex items-center justify-center gap-1 bg-[#7ec662] text-white text-[10px] font-bold py-2 px-1.5 rounded-xl hover:bg-[#6db453] transition-all active:scale-95 shadow-sm">
                <FileText size={11} className="shrink-0" /> Рассчитать КП
              </button>
            </div>

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
