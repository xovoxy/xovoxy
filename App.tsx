
import React, { useState } from 'react';
import { Trash2, Loader2, Zap, Code2, Sparkles, ArrowDownNarrowWide } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { SIZE_CLASSES, MSpan, AllocatorState, AllocStrategy, MAX_SMALL_OBJECT, AllocEvent } from './types';
import AllocatorView from './components/AllocatorView';
import LogPanel from './components/LogPanel';
import Header from './components/Header';
import ExplanationModal from './components/ExplanationModal';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const DEFAULT_CODE = `package main

var globalVar int = 100 // 全局变量，在静态数据段

func main() {
    localX := 10 // 局部变量，在栈
    
    p := escape() // p 逃逸到堆
    
    _ = localX
    _ = p
}

func escape() *int {
    y := 42
    return &y
}`;

const createSpan = (sizeClass: number): MSpan => {
  const objSize = SIZE_CLASSES[sizeClass];
  const totalObjects = Math.max(1, Math.floor(8192 / objSize));
  return {
    id: Math.random().toString(36).substr(2, 5).toUpperCase(),
    sizeClass,
    objectSize: objSize,
    totalObjects,
    freeObjects: totalObjects,
    objects: new Array(totalObjects).fill(false)
  };
};

const INITIAL_STATE: AllocatorState = {
  mCache: { spans: SIZE_CLASSES.map(() => null) },
  mCentrals: SIZE_CLASSES.map((size, idx) => ({
    sizeClass: idx,
    objectSize: size,
    nonEmptySpans: idx < 8 ? [createSpan(idx), createSpan(idx)] : [],
    emptySpans: []
  })),
  mHeap: {
    freeSpans: [],
    totalMemory: 1024 * 1024 * 1024,
    usedMemory: 1024 * 1024 * 8 
  },
  logs: ['系统准备就绪。', '[Runtime] 初始栈空间 2KB 已就绪。'],
  stackObjects: [],
  staticObjects: []
};

const App: React.FC = () => {
  const [state, setState] = useState<AllocatorState>(INITIAL_STATE);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [activeSizeClass, setActiveSizeClass] = useState<number | null>(null);
  const [isAllocating, setIsAllocating] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<AllocEvent | null>(null);

  const addLog = (msg: string) => {
    setState(prev => ({ ...prev, logs: [...prev.logs, msg].slice(-100) }));
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const runAllocationAction = async (event: AllocEvent) => {
    const { size, hasPointer, name, reason, type, escapes, location } = event;
    setIsAllocating(true);
    setCurrentEvent(event);
    
    addLog(`[COMPILER] 扫描变量 "${name}" -> 类型: ${type}`);

    if (location === 'data') {
      addLog(`[ALLOCATOR: DATA SEGMENT] 变量 "${name}" 是全局变量。原因: ${reason}`);
      addLog(`[ALLOCATOR: DATA SEGMENT] 静态分配至可执行文件的 .data/.bss 段，程序生命周期内常驻。`);
      setActiveStep('data');
      setState(prev => ({
        ...prev,
        staticObjects: [...prev.staticObjects, { id: Math.random().toString(36).substr(2,4), name: name, size }]
      }));
      await sleep(600);
      setActiveStep(null);
    } else if (!escapes) {
      addLog(`[ALLOCATOR: STACK] 变量 "${name}" 属于局部非逃逸变量。原因: ${reason}`);
      addLog(`[ALLOCATOR: STACK] 在 Goroutine 栈帧中按序压入，无需 GC 处理。`);
      setActiveStep('stack');
      setState(prev => ({
        ...prev,
        stackObjects: [...prev.stackObjects, { id: Math.random().toString(36).substr(2,4), name: name, size }]
      }));
      await sleep(600);
      setActiveStep(null);
    } else {
      addLog(`[COMPILER] 变量 "${name}" 触发逃逸: ${reason}`);
      addLog(`[TRANSITION] 申请堆空间分流...`);
      
      setActiveStep('stack');
      await sleep(200);
      setActiveStep('escape-animation');
      await sleep(300);

      if (size > MAX_SMALL_OBJECT) {
        addLog(`[ALLOCATOR: MHEAP] 变量 "${name}" (${size}B) 为大对象，直通 MHeap Arena。`);
        setActiveStep('mheap');
        await sleep(500);
        setState(prev => ({ ...prev, mHeap: { ...prev.mHeap, usedMemory: prev.mHeap.usedMemory + size } }));
      } else {
        const scIndex = SIZE_CLASSES.findIndex(s => s >= size);
        const targetSize = SIZE_CLASSES[scIndex];
        setActiveSizeClass(scIndex);
        
        addLog(`[ALLOCATOR: MCACHE] 尝试在 P 的本地 MCache 分配 (SizeClass ${scIndex})。`);
        setActiveStep('mcache');
        await sleep(300);
        
        if (!state.mCache.spans[scIndex] || state.mCache.spans[scIndex]!.freeObjects === 0) {
          addLog(`[ALLOCATOR: MCACHE] 本地缓存不足，请求 MCentral 批量补充。`);
          setActiveStep('mcentral');
          await sleep(400);
          
          setState(prev => {
            if (prev.mCentrals[scIndex].nonEmptySpans.length === 0) {
               addLog(`[ALLOCATOR: MCENTRAL] 中央池已干涸，向 MHeap 批发内存页并切割。`);
               const newCentrals = [...prev.mCentrals];
               newCentrals[scIndex] = { ...newCentrals[scIndex], nonEmptySpans: [createSpan(scIndex)] };
               return { ...prev, mCentrals: newCentrals };
            }
            return prev;
          });

          addLog(`[ALLOCATOR: MCENTRAL] 成功将一个 MSpan 划拨给 MCache。`);
          setActiveStep('refill-mcache');
          await sleep(300);
          
          setState(prev => {
            const newCentrals = [...prev.mCentrals];
            const spans = [...newCentrals[scIndex].nonEmptySpans];
            if (spans.length === 0) return prev;
            const spanToMove = spans.shift()!;
            newCentrals[scIndex] = { ...newCentrals[scIndex], nonEmptySpans: spans };
            const newMCacheSpans = [...prev.mCache.spans];
            newMCacheSpans[scIndex] = spanToMove;
            return { ...prev, mCentrals: newCentrals, mCache: { spans: newMCacheSpans } };
          });
        }

        addLog(`[ALLOCATOR: MCACHE] 成功获取空闲 Slot，完成分配。`);
        setActiveStep('allocating-slot');
        setState(prev => {
          const newMCacheSpans = [...prev.mCache.spans];
          const span = newMCacheSpans[scIndex];
          if (!span) return prev;
          const freeIdx = span.objects.indexOf(false);
          if (freeIdx !== -1) {
            const newObjs = [...span.objects];
            newObjs[freeIdx] = true;
            newMCacheSpans[scIndex] = { ...span, objects: newObjs, freeObjects: span.freeObjects - 1 };
          }
          return { ...prev, mCache: { spans: newMCacheSpans }, mHeap: { ...prev.mHeap, usedMemory: prev.mHeap.usedMemory + targetSize } };
        });
      }
    }

    await sleep(400);
    setActiveStep(null);
    setActiveSizeClass(null);
    setCurrentEvent(null);
    setIsAllocating(false);
  };

  const analyzeAndRun = async () => {
    if (isAnalyzing || isAllocating) return;
    setIsAnalyzing(true);
    setState(INITIAL_STATE);
    addLog(`[AI] 启动编译器语义分析...`);
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `你是一个 Go 语言专家。分析代码，识别变量分配。
        
        输出要求：
        1. name: 变量名。
        2. reason: 详细分配逻辑解释。
        3. location: 'data' (包级全局), 'stack' (局部非逃逸), 'heap' (逃逸/过大)。
        4. escapes: 只有 location 为 'heap' 时为 true。
        5. size: 估计大小。
        6. type: 类型。

        代码:
        ${code}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                size: { type: Type.INTEGER },
                hasPointer: { type: Type.BOOLEAN },
                escapes: { type: Type.BOOLEAN },
                location: { type: Type.STRING, enum: ['stack', 'heap', 'data'] },
                name: { type: Type.STRING },
                reason: { type: Type.STRING },
                type: { type: Type.STRING }
              },
              required: ["size", "hasPointer", "escapes", "location", "name", "reason", "type"]
            }
          }
        }
      });

      const events: AllocEvent[] = JSON.parse(response.text);
      for (const event of events) {
        await runAllocationAction(event);
        await sleep(500);
      }
      addLog(`[SUCCESS] 分析与模拟流执行完毕。`);
    } catch (error) {
      addLog(`[ERROR] ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      <Header onInfoClick={() => setIsModalOpen(true)} />
      <main className="flex-1 grid grid-cols-12 gap-4 p-4 min-h-0 overflow-hidden">
        <div className="col-span-4 flex flex-col gap-4 min-h-0">
          <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 p-4 flex flex-col min-h-[50%] relative">
             <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Code2 size={14} className="text-blue-400" /> Compiler Analysis
              </h2>
              <button onClick={() => setState(INITIAL_STATE)} className="text-slate-500 hover:text-white transition-colors"><Trash2 size={14} /></button>
            </div>
            <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} className="flex-1 bg-slate-950 text-blue-100 font-mono text-[13px] p-4 rounded-lg border border-slate-800 resize-none leading-relaxed" />
            <button onClick={analyzeAndRun} disabled={isAnalyzing || isAllocating} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg font-bold flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95">
              {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} 内存模拟
            </button>
            {currentEvent && (
              <div className="absolute bottom-20 left-4 right-4 bg-blue-600 text-white p-3 rounded-lg shadow-2xl z-20 border border-blue-400 animate-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase opacity-70 tracking-tighter">
                    {currentEvent.location === 'data' ? 'Global Variable' : currentEvent.escapes ? 'Heap Escape' : 'Stack Local'}
                  </span>
                  <Zap size={14} className={currentEvent.location === 'data' ? "text-amber-300 fill-amber-300" : currentEvent.escapes ? "text-orange-300 fill-orange-300" : "text-emerald-300 fill-emerald-300"} />
                </div>
                <p className="text-sm font-bold truncate">{currentEvent.name}</p>
                <p className="text-[9px] mt-1 opacity-80 leading-tight">{currentEvent.reason}</p>
              </div>
            )}
          </div>
          <div className="flex-1 min-h-0"><LogPanel logs={state.logs} /></div>
        </div>
        <div className="col-span-8 flex flex-col min-h-0 overflow-hidden">
           <AllocatorView state={state} activeStep={activeStep} activeSizeClass={activeSizeClass} />
        </div>
      </main>
      <ExplanationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default App;
