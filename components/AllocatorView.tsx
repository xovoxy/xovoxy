
import React from 'react';
import { Layers, Server, Globe, Zap, ArrowDownFromLine, ArrowDownNarrowWide, Package, Box, ChevronUp, Cpu, ArrowUp } from 'lucide-react';
import { AllocatorState, SIZE_CLASSES } from '../types';

interface AllocatorViewProps {
  state: AllocatorState;
  activeStep: string | null;
  activeSizeClass: number | null;
}

const AllocatorView: React.FC<AllocatorViewProps> = ({ state, activeStep, activeSizeClass }) => {
  const reservedPercent = Math.min(100, (state.mHeap.usedMemory / state.mHeap.totalMemory) * 100);
  const activePercent = state.mHeap.usedMemory > 0 ? (state.mHeap.activeObjectMemory / state.mHeap.usedMemory) * 100 : 0;
  
  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden relative">
      
      {/* 0. Data Segment Section */}
      <section className={`flex-none transition-all duration-300 rounded-2xl p-4 border-2 ${activeStep === 'data' ? 'bg-amber-50 border-amber-500 shadow-lg' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Box size={16} className="text-amber-600" />
            <h3 className="font-black text-slate-700 uppercase text-[10px]">Static Data</h3>
          </div>
        </div>
        <div className="flex gap-2 min-h-[40px] items-center overflow-x-auto no-scrollbar">
          {state.staticObjects.map((obj, i) => (
            <div key={i} className="flex-none bg-white border border-amber-500 px-2 py-1 rounded-lg shadow-sm flex flex-col items-center">
               <span className="text-[10px] font-black text-amber-800">{obj.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 1. Stack Section */}
      <section className={`flex-none transition-all duration-300 rounded-2xl p-4 border-2 ${activeStep === 'stack' ? 'bg-emerald-50 border-emerald-500 shadow-lg' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ArrowDownFromLine size={16} className="text-emerald-600" />
            <h3 className="font-black text-slate-700 uppercase text-[10px]">Goroutine Stack</h3>
          </div>
        </div>
        <div className="flex gap-2 min-h-[40px] items-center overflow-x-auto no-scrollbar">
          {state.stackObjects.map((obj, i) => (
            <div key={i} className="flex-none bg-white border border-emerald-500 px-2 py-1 rounded-lg shadow-sm flex flex-col items-center">
               <span className="text-[10px] font-black text-emerald-800">{obj.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 2. MCache Section */}
      <section className={`flex-none transition-all duration-300 rounded-2xl bg-slate-50/50 p-4 border-2 border-transparent ${activeStep?.includes('mcache') ? 'border-blue-500 bg-white shadow-xl scale-[1.01]' : 'border-slate-100'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-blue-500" />
            <h3 className="font-black text-slate-700 uppercase text-xs">MCache (Thread Local)</h3>
          </div>
          {activeStep === 'refill-mcache' && <span className="text-[9px] font-black text-blue-600 animate-pulse">REFILLING...</span>}
        </div>
        <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
          {SIZE_CLASSES.slice(0, 27).map((size, idx) => {
            const span = state.mCache.spans[idx];
            const isActive = activeSizeClass === idx && activeStep?.includes('mcache');
            return (
              <div key={idx} className={`p-1.5 rounded-lg border-2 transition-all duration-300 ${isActive ? 'border-blue-500 bg-blue-50 scale-110 z-10' : span ? 'bg-white border-blue-50' : 'bg-slate-100/40 border-slate-200 opacity-60'}`}>
                <div className="text-[8px] font-bold text-slate-400">C{idx}</div>
                {span && (
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {span.objects.slice(0, 4).map((occ, i) => (
                      <div key={i} className={`w-1 h-1 rounded-full ${occ ? 'bg-blue-500' : 'bg-slate-200'}`} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. MCentral Section (批发中心) */}
      <section className={`flex-none transition-all duration-300 rounded-2xl bg-slate-50/50 p-4 border-2 border-transparent ${activeStep?.includes('mcentral') || activeStep === 'mheap-to-mcentral' ? 'border-orange-500 bg-white shadow-xl scale-[1.01]' : 'border-slate-100'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Server size={18} className="text-orange-500" />
            <h3 className="font-black text-slate-700 uppercase text-xs">MCentral (Global Shared Pool)</h3>
          </div>
          {activeStep === 'mheap-to-mcentral' && (
            <div className="flex items-center gap-1 text-orange-600 text-[9px] font-black animate-bounce bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
               <ArrowUp size={10} /> SYS ALLOC
            </div>
          )}
        </div>
        <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
          {state.mCentrals.slice(0, 27).map((central, idx) => {
            const isActive = activeSizeClass === idx && (activeStep?.includes('mcentral') || activeStep === 'mheap-to-mcentral');
            const hasSpans = central.nonEmptySpans.length > 0;
            return (
              <div key={idx} className={`p-1.5 rounded-lg border-2 transition-all duration-300 relative ${isActive ? 'border-orange-500 bg-orange-50 scale-110 z-10' : hasSpans ? 'bg-white border-orange-50 shadow-sm' : 'bg-slate-100/40 border-slate-200 opacity-60'}`}>
                <div className="text-[8px] font-black text-center text-slate-400">S{idx}</div>
                <div className={`text-[10px] font-black text-center ${hasSpans ? 'text-orange-600' : 'text-slate-300'}`}>{central.nonEmptySpans.length}</div>
                {isActive && activeStep === 'mheap-to-mcentral' && (
                   <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-orange-600 font-black text-[10px] animate-pulse">+Span</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* MHeap to MCentral Dynamic Flow Bridge */}
      {activeStep === 'mheap-to-mcentral' && (
        <div className="absolute left-1/2 bottom-20 -translate-x-1/2 w-full max-w-lg h-40 pointer-events-none z-0">
           <div className="w-1 bg-gradient-to-t from-blue-400 via-orange-400 to-orange-600 mx-auto h-full animate-pulse blur-[1px]"></div>
           <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center animate-flow-up">
              <Package size={24} className="text-orange-500 fill-orange-200" />
              <span className="text-[8px] font-black text-orange-600 bg-white/80 px-1 rounded mt-1">8KB PAGE</span>
           </div>
        </div>
      )}

      {/* 4. MHeap Section */}
      <section className={`flex-none mt-auto p-4 bg-slate-900 rounded-2xl border-2 transition-all ${activeStep === 'mheap' || activeStep === 'mheap-to-mcentral' ? 'border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-slate-800'}`}>
        <div className="flex items-center justify-between text-white mb-2">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-blue-400" />
            <span className="text-[10px] font-black uppercase tracking-widest">MHeap Arena (Physical Storage)</span>
          </div>
          <div className="text-[9px] font-mono">
             Reserved: <span className="text-blue-400">{(state.mHeap.usedMemory / 1024).toFixed(1)} KB</span>
          </div>
        </div>
        <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700 p-0.5 relative">
          <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${reservedPercent}%` }} />
          {activeStep === 'mheap-to-mcentral' && (
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          )}
        </div>
        <div className="flex justify-between mt-1 px-1">
          <span className="text-[8px] text-slate-500">Global Page Pool</span>
          <span className="text-[8px] text-slate-500">{(state.mHeap.activeObjectMemory / 1024).toFixed(1)} KB Active</span>
        </div>
      </section>
    </div>
  );
};

export default AllocatorView;
