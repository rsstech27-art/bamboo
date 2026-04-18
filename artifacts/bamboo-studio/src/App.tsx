import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Layout, Eraser, RotateCcw, Download, Check, Columns, Undo2 } from 'lucide-react';

const BAMBOO_PANELS = [
  { id: 'natural', name: 'Натуральный', color: '#e3c18d', texture: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?auto=format&fit=crop&q=80&w=400' },
  { id: 'carbonized', name: 'Карбон', color: '#8b5a2b', texture: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=400' },
  { id: 'black', name: 'Черный', color: '#2c2c2c', texture: 'https://images.unsplash.com/photo-1505330622279-bf7d7fc918f4?auto=format&fit=crop&q=80&w=400' },
  { id: 'white', name: 'Беленый', color: '#f5f5f0', texture: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&q=80&w=400' },
];

type Panel = typeof BAMBOO_PANELS[number];
type Point = { x: number; y: number };

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
  const [moldingStyle, setMoldingStyle] = useState<'none' | 'gold' | 'black' | 'metallic'>('none');
  const [moldingWidth, setMoldingWidth] = useState(6);
  const [hMoldingStyle, setHMoldingStyle] = useState<'none' | 'gold' | 'black' | 'metallic'>('none');
  const [hMoldingCount, setHMoldingCount] = useState(1);
  const [hMoldingWidth, setHMoldingWidth] = useState(6);
  const [hMoldingPositions, setHMoldingPositions] = useState<number[]>([0.5]);

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
  const moldingStyleRef = useRef<'none' | 'gold' | 'black' | 'metallic'>('none');
  const moldingWidthRef = useRef(6);
  const hMoldingStyleRef = useRef<'none' | 'gold' | 'black' | 'metallic'>('none');
  const hMoldingCountRef = useRef(1);
  const hMoldingWidthRef = useRef(6);
  const hMoldingPositionsRef = useRef<number[]>([0.5]);
  const draggingHMoldingIndexRef = useRef<number | null>(null);
  // Mask stored as strokes — never gets reset by canvas operations
  const maskStrokesRef = useRef<Array<{ x: number; y: number; r: number }>>([]);

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

        tCtx.fillStyle = material.color;
        tCtx.beginPath();
        tCtx.moveTo(p1.x, p1.y);
        tCtx.lineTo(p2.x, p2.y);
        tCtx.lineTo(p3.x, p3.y);
        tCtx.lineTo(p4.x, p4.y);
        tCtx.closePath();
        tCtx.fill();

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
    const { width, height } = containerRef.current.getBoundingClientRect();
    mainCanvasRef.current.width = width;
    mainCanvasRef.current.height = height;
    maskCanvasRef.current.width = width;
    maskCanvasRef.current.height = height;
    drawFullScene();
  }, [image, drawFullScene]);

  // Redraw on state changes without touching canvas dimensions
  useEffect(() => {
    if (!image) return;
    drawFullScene();
  }, [points, step, sectorMaterials, panelCount, dividerPositions, activeSector, isErasing, moldingStyle, moldingWidth, hMoldingStyle, hMoldingCount, hMoldingWidth, hMoldingPositions, drawFullScene, image]);

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
    const canvas = mainCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    if (isErasing || step !== 'edit') return;
    const { x, y } = getCanvasCoords(e);
    const hIdx = findNearHMolding(x, y);
    if (hIdx !== -1) {
      draggingHMoldingIndexRef.current = hIdx;
      return;
    }
    const divIdx = findNearDivider(x, y);
    if (divIdx !== -1) {
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
    {
      maskStrokesRef.current = [];
      drawFullScene();
    }
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
  }: { value: string; onChange: (v: 'none'|'gold'|'black'|'metallic') => void; vertical: boolean }) => {
    const opts = [
      { id: 'none',     label: 'Нет',  preview: 'bg-gray-100' },
      { id: 'gold',     label: 'Злт',  preview: vertical ? 'bg-gradient-to-r from-yellow-900 via-yellow-300 to-yellow-900' : 'bg-gradient-to-b from-yellow-900 via-yellow-300 to-yellow-900' },
      { id: 'black',    label: 'Чрн',  preview: vertical ? 'bg-gradient-to-r from-black via-gray-600 to-black'            : 'bg-gradient-to-b from-black via-gray-600 to-black' },
      { id: 'metallic', label: 'Мтл',  preview: vertical ? 'bg-gradient-to-r from-gray-500 via-white to-gray-500'         : 'bg-gradient-to-b from-gray-500 via-white to-gray-500' },
    ] as const;
    return (
      <div className="grid grid-cols-4 gap-1">
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

  return (
    <div className="h-screen overflow-hidden bg-[#ebebed] text-[#1d1d1f] font-sans antialiased flex flex-col">
      {/* ── Nav ── */}
      <nav className="h-12 shrink-0 border-b border-gray-200 bg-white/90 backdrop-blur-xl flex justify-between items-center px-5 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
            <Layout className="text-white w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-tight italic">BambooStudio Pro</span>
        </div>
        <div className="flex items-center gap-3">
          {step === 'edit' && (
            <button onClick={handleSave}
              className="flex items-center gap-1.5 bg-black text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-gray-800 transition-all active:scale-95">
              <Download size={13} /> Сохранить PNG
            </button>
          )}
          <button
            onClick={() => { maskStrokesRef.current = []; setStep('upload'); setImage(null); setPoints([]); setSectorMaterials({}); setActiveSector(null); setIsErasing(false); }}
            className="text-xs font-medium text-gray-400 hover:text-black flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw size={13} /> Сброс
          </button>
        </div>
      </nav>

      {/* ── Main: canvas + right tool panel ── */}
      <div className="flex-1 flex gap-3 p-3 overflow-hidden min-h-0">

        {/* ── Canvas area ── */}
        <div className="flex-1 relative min-w-0">
          {step === 'upload' ? (
            <label className="flex flex-col items-center justify-center w-full h-full bg-white rounded-3xl border-2 border-dashed border-gray-200 cursor-pointer hover:bg-gray-50 transition-all shadow-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <Upload className="text-gray-400 w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-gray-400">Загрузите фото интерьера</p>
              <p className="text-xs text-gray-300 mt-1">JPG, PNG, WEBP</p>
              <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
            </label>
          ) : (
            <div ref={containerRef} className="relative w-full h-full bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-200">
              <canvas
                ref={mainCanvasRef}
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="absolute inset-0 w-full h-full touch-none"
                style={{ cursor: isErasing ? 'none' : step === 'mark' ? 'crosshair' : 'pointer' }}
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
        <div className="w-[232px] shrink-0 flex flex-col gap-2 overflow-y-auto pb-1" style={{ scrollbarWidth: 'none' }}>

          {/* UPLOAD step */}
          {step === 'upload' && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-1.5 mb-3">
                <Upload size={12} className="text-gray-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Загрузка</span>
              </div>
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-all">
                <Upload className="text-gray-300 mb-2 w-5 h-5" />
                <span className="text-[9px] font-bold text-gray-400 uppercase">Выбрать файл</span>
                <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
              </label>
              <p className="text-[9px] text-gray-400 mt-3 leading-relaxed">
                Загрузите фото интерьера — затем отметьте 4 угла стены и подберите панели.
              </p>
            </div>
          )}

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
            <div className="bg-white rounded-2xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Eraser size={12} className="text-gray-400"/>
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Ластик</span>
                </div>
                <button onClick={() => { setIsErasing(!isErasing); setActiveSector(null); }}
                  className={`px-3 py-1 rounded-lg text-[9px] font-bold transition-all ${isErasing ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                  {isErasing ? 'Вкл' : 'Выкл'}
                </button>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-[9px] text-gray-400 font-bold uppercase">Размер</span>
                <span className="text-[9px] font-bold">{brushSize}px</span>
              </div>
              <input type="range" min="10" max="150" value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-full h-0.5 bg-gray-100 rounded-full appearance-none accent-black"/>
              <button onClick={clearMask}
                className="w-full mt-2 py-1 text-[8px] font-bold text-gray-300 hover:text-red-500 flex items-center justify-center gap-1 transition-colors">
                <Undo2 size={9}/> Очистить маску
              </button>
            </div>

            {/* Material */}
            <div className="bg-white rounded-2xl p-3.5 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2.5">
                <span className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-700 to-yellow-400 shrink-0"/>
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Материал</span>
              </div>
              <p className="text-[8px] text-gray-400 font-bold italic mb-2.5">
                {activeSector !== null ? `Панель №${activeSector + 1}` : 'Кликните по панели на фото'}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {BAMBOO_PANELS.map(panel => (
                  <button key={panel.id}
                    onClick={() => {
                      if (activeSector !== null) {
                        setSectorMaterials({ ...sectorMaterials, [activeSector]: panel });
                      } else {
                        const all: Record<number, Panel> = {};
                        for (let i = 0; i < panelCount; i++) all[i] = panel;
                        setSectorMaterials(all);
                      }
                    }}
                    className={`rounded-xl overflow-hidden border-2 transition-all ${activeSector !== null && sectorMaterials[activeSector]?.id === panel.id ? 'border-black scale-105 shadow-md' : 'border-transparent'}`}>
                    <img src={panel.texture} className="w-full h-10 object-cover" alt={panel.name}/>
                    <div className="py-1 text-[8px] font-bold text-center bg-white uppercase">{panel.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Vertical molding */}
            {panelCount > 1 && (
              <div className="bg-white rounded-2xl p-3.5 shadow-sm">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <div className="w-0.5 h-3.5 bg-yellow-500 rounded-full"/>
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Молдинг верт.</span>
                </div>
                <MoldingStyleRow value={moldingStyle} onChange={setMoldingStyle} vertical={true}/>
                {moldingStyle !== 'none' && (
                  <div className="mt-2.5">
                    <div className="flex justify-between mb-1">
                      <span className="text-[9px] text-gray-400 font-bold uppercase">Толщина</span>
                      <span className="text-[9px] font-bold">{moldingWidth}px</span>
                    </div>
                    <input type="range" min="2" max="20" value={moldingWidth}
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
              <MoldingStyleRow value={hMoldingStyle} onChange={setHMoldingStyle} vertical={false}/>
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
                    <input type="range" min="2" max="20" value={hMoldingWidth}
                      onChange={(e) => setHMoldingWidth(parseInt(e.target.value))}
                      className="w-full h-0.5 bg-gray-100 rounded-full appearance-none accent-black"/>
                  </div>
                </div>
              )}
            </div>

          </>)}
        </div>
      </div>
    </div>
  );
};

export default BambooStudio;
