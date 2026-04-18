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

const BambooStudio = () => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [step, setStep] = useState<'upload' | 'mark' | 'edit'>('upload');
  const [points, setPoints] = useState<Point[]>([]);
  const [panelCount, setPanelCount] = useState(5);
  const [sectorMaterials, setSectorMaterials] = useState<Record<number, Panel>>({});
  const [activeSector, setActiveSector] = useState<number | null>(null);
  const [brushSize, setBrushSize] = useState(40);
  const [isErasing, setIsErasing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Refs to always have the latest state inside drawFullScene without stale closures
  const imageRef = useRef<HTMLImageElement | null>(null);
  const stepRef = useRef<'upload' | 'mark' | 'edit'>('upload');
  const pointsRef = useRef<Point[]>([]);
  const panelCountRef = useRef(5);
  const sectorMaterialsRef = useRef<Record<number, Panel>>({});
  const activeSectorRef = useRef<number | null>(null);
  const isErasingRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { imageRef.current = image; }, [image]);
  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { pointsRef.current = points; }, [points]);
  useEffect(() => { panelCountRef.current = panelCount; }, [panelCount]);
  useEffect(() => { sectorMaterialsRef.current = sectorMaterials; }, [sectorMaterials]);
  useEffect(() => { activeSectorRef.current = activeSector; }, [activeSector]);
  useEffect(() => { isErasingRef.current = isErasing; }, [isErasing]);

  // Stable drawFullScene that always reads fresh data from refs
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

      for (let i = 0; i < curPanelCount; i++) {
        const rStart = i / curPanelCount;
        const rEnd = (i + 1) / curPanelCount;

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

        tCtx.strokeStyle = 'rgba(0,0,0,0.1)';
        tCtx.lineWidth = 1;
        tCtx.stroke();
      }

      // Apply eraser mask WITHOUT clearing it
      if (maskCanvas && maskCanvas.width > 0 && maskCanvas.height > 0) {
        tCtx.globalCompositeOperation = 'destination-out';
        tCtx.drawImage(maskCanvas, 0, 0);
        tCtx.globalCompositeOperation = 'source-over';
      }

      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.restore();
    }
  }, []); // No deps — always reads from refs

  // Initialize canvas dimensions only when image changes (not on every state update)
  useEffect(() => {
    if (!image || !containerRef.current || !mainCanvasRef.current || !maskCanvasRef.current) return;

    const container = containerRef.current;
    const { width, height } = container.getBoundingClientRect();

    // Set main canvas size
    mainCanvasRef.current.width = width;
    mainCanvasRef.current.height = height;

    // Reset mask canvas only when a new image is loaded (clears old erasing)
    maskCanvasRef.current.width = width;
    maskCanvasRef.current.height = height;

    drawFullScene();
  }, [image, drawFullScene]);

  // Redraw whenever visible state changes — but WITHOUT touching canvas dimensions
  useEffect(() => {
    if (!image) return;
    drawFullScene();
  }, [points, step, sectorMaterials, panelCount, activeSector, isErasing, drawFullScene, image]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (f) => {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          setStep('mark');
          setPoints([]);
          setSectorMaterials({});
          setActiveSector(null);
          setIsErasing(false);
        };
        img.src = f.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isErasing) return;
    if (!mainCanvasRef.current) return;

    const rect = mainCanvasRef.current.getBoundingClientRect();
    // Scale mouse coords to actual canvas pixel coords
    const scaleX = mainCanvasRef.current.width / rect.width;
    const scaleY = mainCanvasRef.current.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (step === 'mark' && points.length < 4) {
      setPoints([...points, { x, y }]);
    } else if (step === 'edit') {
      checkSectorClick(x, y);
    }
  };

  const checkSectorClick = (x: number, y: number) => {
    if (points.length < 4) return;
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));

    if (x >= minX && x <= maxX) {
      const relativeX = (x - minX) / (maxX - minX);
      const sectorIndex = Math.floor(relativeX * panelCount);
      setActiveSector(sectorIndex === activeSector ? null : sectorIndex);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!mainCanvasRef.current) return;
    const rect = mainCanvasRef.current.getBoundingClientRect();
    const scaleX = mainCanvasRef.current.width / rect.width;
    const scaleY = mainCanvasRef.current.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Update cursor position (in screen coords for the cursor overlay)
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    if (isErasing && isDrawing && maskCanvasRef.current) {
      const mCtx = maskCanvasRef.current.getContext('2d');
      if (!mCtx) return;
      mCtx.fillStyle = 'black';
      mCtx.beginPath();
      mCtx.arc(x, y, (brushSize / 2) * scaleX, 0, Math.PI * 2);
      mCtx.fill();
      drawFullScene(); // Calls stable ref-based version
    }
  };

  const clearMask = () => {
    if (maskCanvasRef.current) {
      const mCtx = maskCanvasRef.current.getContext('2d');
      if (!mCtx) return;
      mCtx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
      drawFullScene();
    }
  };

  const handleSave = () => {
    if (!mainCanvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'bamboo-studio-project.png';
    link.href = mainCanvasRef.current.toDataURL();
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans antialiased">
      <nav className="h-16 border-b border-gray-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50 flex justify-between items-center px-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center">
            <Layout className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight italic">BambooStudio Pro</span>
        </div>
        <button
          onClick={() => { setStep('upload'); setImage(null); setPoints([]); setSectorMaterials({}); setActiveSector(null); setIsErasing(false); }}
          className="text-sm font-medium text-gray-400 hover:text-black flex items-center gap-2 transition-colors"
        >
          <RotateCcw size={16} /> Сбросить проект
        </button>
      </nav>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 space-y-6">
          {step === 'upload' && (
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-4 tracking-tight">1. Загрузка фото</h2>
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 transition-all">
                <Upload className="text-gray-400 mb-2" />
                <span className="text-[10px] uppercase font-bold text-gray-400">Выберите файл интерьера</span>
                <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
              </label>
              <div className="mt-6 p-4 bg-gray-50 rounded-2xl">
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  Загрузите фото вашего интерьера. После загрузки вы сможете отметить стену и подобрать бамбуковые панели.
                </p>
              </div>
            </div>
          )}

          {step === 'mark' && (
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-2">2. Точки стены</h2>
              <p className="text-xs text-gray-400 mb-6 font-medium">Кликните на 4 угла стены по часовой стрелке.</p>
              <div className="flex justify-between mb-8">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${points.length >= i ? 'bg-black text-white border-black shadow-md shadow-black/20' : 'text-gray-200 border-gray-100'}`}>
                    {points.length >= i ? <Check size={16} /> : i}
                  </div>
                ))}
              </div>
              {points.length > 0 && (
                <button
                  onClick={() => setPoints(points.slice(0, -1))}
                  className="w-full mb-3 py-2 text-[10px] font-bold text-gray-400 hover:text-red-500 flex items-center justify-center gap-1 transition-colors"
                >
                  <Undo2 size={12} /> Отменить последнюю точку
                </button>
              )}
              <button
                disabled={points.length < 4}
                onClick={() => setStep('edit')}
                className="w-full py-4 bg-black text-white rounded-2xl font-bold shadow-lg disabled:opacity-20 transition-all active:scale-95"
              >
                Начать примерку
              </button>
            </div>
          )}

          {step === 'edit' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Columns size={18} />
                  <h2 className="text-lg font-bold">Размер панелей</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                    <span>Кол-во секторов</span>
                    <span>{panelCount}</span>
                  </div>
                  <input
                    type="range" min="1" max="15" value={panelCount}
                    onChange={(e) => { setPanelCount(parseInt(e.target.value)); setActiveSector(null); }}
                    className="w-full h-1 bg-gray-100 rounded-lg appearance-none accent-black"
                  />
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold mb-2">Материал</h2>
                <p className="text-[10px] text-gray-400 mb-4 font-bold italic">
                  {activeSector !== null ? `Красим сектор №${activeSector + 1}` : 'Кликните по панели на фото'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {BAMBOO_PANELS.map(panel => (
                    <button
                      key={panel.id}
                      onClick={() => {
                        if (activeSector !== null) {
                          setSectorMaterials({ ...sectorMaterials, [activeSector]: panel });
                        } else {
                          const all: Record<number, Panel> = {};
                          for (let i = 0; i < panelCount; i++) all[i] = panel;
                          setSectorMaterials(all);
                        }
                      }}
                      className={`rounded-xl overflow-hidden border-2 transition-all ${activeSector !== null && sectorMaterials[activeSector]?.id === panel.id ? 'border-black scale-105 shadow-md' : 'border-transparent'}`}
                    >
                      <img src={panel.texture} className="w-full h-14 object-cover" alt={panel.name} />
                      <div className="p-2 text-[9px] font-bold text-center bg-white uppercase">{panel.name}</div>
                    </button>
                  ))}
                </div>
                {activeSector === null && (
                  <p className="text-[9px] text-gray-300 mt-3 text-center">Выбор без сектора применяет материал ко всей стене</p>
                )}
              </div>

              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold">Ластик</h2>
                  <button
                    onClick={() => { setIsErasing(!isErasing); setActiveSector(null); }}
                    className={`p-3 rounded-xl transition-all ${isErasing ? 'bg-red-500 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}
                  >
                    <Eraser size={18} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                    <span>Размер кисти</span>
                    <span>{brushSize}px</span>
                  </div>
                  <input
                    type="range" min="10" max="150" value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-full h-1 bg-gray-100 rounded-lg appearance-none accent-black"
                  />
                  <button
                    onClick={clearMask}
                    className="w-full py-2 text-[10px] font-bold text-gray-400 hover:text-red-500 flex items-center justify-center gap-1 transition-colors"
                  >
                    <Undo2 size={12} /> Очистить маску мебели
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-9 relative">
          {step === 'upload' ? (
            <div className="relative w-full aspect-[16/10] bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-200 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Layout className="text-gray-300 w-8 h-8" />
                </div>
                <p className="text-gray-300 font-bold text-sm">Загрузите фото интерьера слева</p>
              </div>
            </div>
          ) : (
            <div ref={containerRef} className="relative w-full aspect-[16/10] bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-200">
              <canvas
                ref={mainCanvasRef}
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
                onMouseDown={() => setIsDrawing(true)}
                onMouseUp={() => setIsDrawing(false)}
                onMouseLeave={() => setIsDrawing(false)}
                className="absolute inset-0 w-full h-full touch-none"
                style={{ cursor: isErasing ? 'none' : step === 'mark' ? 'crosshair' : 'pointer' }}
              />

              <canvas ref={maskCanvasRef} className="hidden" />

              {isErasing && (
                <div
                  className="absolute pointer-events-none border-2 border-white rounded-full mix-blend-difference bg-white/10"
                  style={{
                    left: mousePos.x,
                    top: mousePos.y,
                    width: brushSize,
                    height: brushSize,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 100
                  }}
                />
              )}

              {step === 'mark' && !isErasing && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white/90 text-black px-6 py-2 rounded-full text-[10px] font-bold shadow-xl backdrop-blur-md border border-gray-100 uppercase tracking-widest pointer-events-none">
                  {points.length < 4 ? `Кликните на угол стены (${points.length}/4)` : 'Нажмите "Начать примерку"'}
                </div>
              )}

              {step === 'edit' && !isErasing && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white/90 text-black px-6 py-2 rounded-full text-[10px] font-bold shadow-xl backdrop-blur-md border border-gray-100 uppercase tracking-widest pointer-events-none">
                  Выберите панель на стене, чтобы изменить её цвет
                </div>
              )}

              {step === 'edit' && isErasing && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-2 rounded-full text-[10px] font-bold shadow-xl uppercase tracking-widest pointer-events-none">
                  Режим ластика — рисуйте для удаления панелей
                </div>
              )}
            </div>
          )}

          {step === 'edit' && (
            <div className="mt-8 flex justify-between items-center bg-[#1d1d1f] text-white p-8 rounded-[2.5rem] shadow-2xl">
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Режим редактирования</span>
                <span className="text-xl font-bold tracking-tight">Настройте ваш уникальный дизайн</span>
              </div>
              <button
                onClick={handleSave}
                className="bg-white text-black px-10 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-gray-100 transition-all active:scale-95"
              >
                <Download size={20} /> Сохранить проект
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default BambooStudio;
