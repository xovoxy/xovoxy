
import React, { useState } from 'react';
import { Trash2, Loader2, Zap, Code2, Sparkles, ArrowDownNarrowWide } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { SIZE_CLASSES, MSpan, AllocatorState, MAX_SMALL_OBJECT, PAGE_SIZE, AllocEvent } from './types';
import AllocatorView from './components/AllocatorView';
import LogPanel from './components/LogPanel';
import Header from './components/Header';
import ExplanationModal from './components/ExplanationModal';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const DEFAULT_CODE = `package main

func main() {
    // 触发逃逸到堆
    a := make([]int, 5) 
    
    // 再次触发，演示 MCentral 的批发与分配
    b := make([]int, 5)
    
    _ = a; _ = b
}`;

const createSpan = (sizeClass: number): MSpan => {
  const objSize = SIZE_CLASSES[sizeClass];
  const totalObjects = Math.max(1, Math.floor(PAGE_SIZE / objSize));
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
  mCache: { spans: SIZE_CLASSES.map(() => null), tinyOffset: 0 },
  mCentrals: SIZE_CLASSES.map((size, idx) => ({
    sizeClass: idx,
    objectSize: size,
    nonEmptySpans: [], // 初始设为空，强制从 MHeap 批发
    emptySpans: []
  })),
  mHeap: {
    freeSpans: [],
    totalMemory: 1024 * 1024 * 1024,
    usedMemory: 0,
    activeObjectMemory: 0
  },
  logs: ['[System] Go Runtime Initialized.', '[Memory] MHeap Arena ready.'],
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
    let { size, hasPointer, name, reason, type, escapes, location } = event;
    setIsAllocating(true);
    
    if (location === 'data') {
      addLog(`[DATA] "${name}" -> 分配至静态数据区。`);
      setActiveStep('data');
      setState(prev => ({ ...prev, staticObjects: [...prev.staticObjects, { id: Math.random().toString(36).substr(2,4), name, size }] }));
      await sleep(500);
    } else if (location === 'stack' && !escapes) {
      addLog(`[STACK] "${name}" -> 压入栈帧。`);
      setActiveStep('stack');
      setState(prev => ({ ...prev, stackObjects: [...prev.stackObjects, { id: Math.random().toString(36).substr(2,4), name, size }] }));
      await sleep(500);
    } else {
      addLog(`[COMPILER] "${name}" (${size}B) 触发堆逃逸。`);
      addLog(`  原因: ${reason}`);
      setActiveStep('escape-animation');
      await sleep(500);

      if (size > MAX_SMALL_OBJECT) {
        const pagesNeeded = Math.ceil(size / PAGE_SIZE);
        const actualAlloc = pagesNeeded * PAGE_SIZE;
        addLog(`[MHEAP] 大对象分配: 直接从 Arena 申请 ${pagesNeeded} 个 Page。`);
        setActiveStep('mheap');
        setState(prev => ({
          ...prev,
          mHeap: { 
            ...prev.mHeap, 
            usedMemory: prev.mHeap.usedMemory + actualAlloc,
            activeObjectMemory: prev.mHeap.activeObjectMemory + size
          }
        }));
        await sleep(800);
      } else {
        let scIndex = SIZE_CLASSES.findIndex(s => s >= size);
        let classSize = SIZE_CLASSES[scIndex];
        
        const isTiny = size < 16 && !hasPointer;
        if (isTiny) { scIndex = 1; classSize = 16; }

        const waste = classSize - size;
        setCurrentEvent({ ...event, classSize, waste });
        setActiveSizeClass(scIndex);
        
        // 1. 检查 MCache
        setActiveStep('mcache');
        addLog(`[MCACHE] 检查本地规格槽位 C${scIndex}...`);
        await sleep(500);

        if (!state.mCache.spans[scIndex] || state.mCache.spans[scIndex]!.freeObjects === 0) {
          addLog(`[MCACHE] 本地无可用 Span。请求 MCentral 补充。`);
          setActiveStep('mcentral');
          await sleep(600);

          // 2. 检查 MCentral
          if (state.mCentrals[scIndex].nonEmptySpans.length === 0) {
            addLog(`[MCENTRAL] 中央池已空！启动【批发逻辑】。`);
            addLog(`[SYSCALL] MCentral 向 MHeap 申请 8KB 物理页并切割为 MSpan。`);
            
            // 触发 MHeap -> MCentral 动画
            setActiveStep('mheap-to-mcentral');
            await sleep(1500); // 延长动画时间
            
            setState(prev => {
              const newCentrals = [...prev.mCentrals];
              // 模拟批发到一个新的 Span
              newCentrals[scIndex] = { ...newCentrals[scIndex], nonEmptySpans: [createSpan(scIndex)] };
              return { 
                ...prev, 
                mCentrals: newCentrals,
                mHeap: { ...prev.mHeap, usedMemory: prev.mHeap.usedMemory + PAGE_SIZE }
              };
            });
            addLog(`[MHEAP] 已划拨 1 个页面。MCentral 规格 ${scIndex} 链表已更新。`);
            await sleep(600);
            setActiveStep('mcentral');
            await sleep(400);
          }

          // 3. 从 MCentral 移动到 MCache
          addLog(`[REFILL] 从 MCentral 迁出一个 MSpan 给本地 MCache。`);
          setActiveStep('refill-mcache');
          await sleep(800);
          setState(prev => {
            const newCentrals = [...prev.mCentrals];
            const spanToMove = newCentrals[scIndex].nonEmptySpans.shift()!;
            const newCacheSpans = [...prev.mCache.spans];
            newCacheSpans[scIndex] = spanToMove;
            return { ...prev, mCentrals: newCentrals, mCache: { ...prev.mCache, spans: newCacheSpans } };
          });
          await sleep(400);
          setActiveStep('mcache');
        }

        // 4. 执行分配
        addLog(`[SUCCESS] 变量 "${name}" 已在规格槽位中就绪。`);
        setActiveStep('allocating-slot');
        setState(prev => {
          const newCacheSpans = [...prev.mCache.spans];
          const span = newCacheSpans[scIndex]!;
          const freeIdx = span.objects.indexOf(false);
          if (freeIdx !== -1) {
            span.objects[freeIdx] = true;
            span.freeObjects--;
          }
          return {
            ...prev,
            mCache: { ...prev.mCache, spans: newCacheSpans },
            mHeap: { ...prev.mHeap, activeObjectMemory: prev.mHeap.activeObjectMemory + size }
          };
        });
        await sleep(600);
      }
    }

    setActiveStep(null);
    setActiveSizeClass(null);
    setIsAllocating(false);
    setCurrentEvent(null);
  };

  const analyzeAndRun = async () => {
    if (isAnalyzing || isAllocating) return;
    setIsAnalyzing(true);
    setState(INITIAL_STATE);
    addLog(`[AI] 启动编译器逃逸分析...`);
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `分析代码，识别变量分配逻辑。输出 JSON 数组：name, size, hasPointer, location, escapes, reason, type。代码:\n${code}`,
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
        await sleep(300);
      }
      addLog(`[DONE] 模拟流程全部完成。`);
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
                <Code2 size={14} className="text-blue-400" /> Compiler Stage
              </h2>
            </div>
            <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} className="flex-1 bg-slate-950 text-blue-100 font-mono text-[13px] p-4 rounded-lg border border-slate-800 resize-none leading-relaxed" />
            <button onClick={analyzeAndRun} disabled={isAnalyzing || isAllocating} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg font-bold flex items-center justify-center gap-2 shadow-xl transition-all">
              {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} 运行模拟
            </button>
            {currentEvent && (
              <div className="absolute bottom-20 left-4 right-4 bg-slate-800 text-white p-4 rounded-xl shadow-2xl z-20 border border-blue-500/50">
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div>变量: <span className="text-blue-300">{currentEvent.name}</span></div>
                  <div>规格: <span className="text-emerald-400">{currentEvent.classSize}B</span></div>
                </div>
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
