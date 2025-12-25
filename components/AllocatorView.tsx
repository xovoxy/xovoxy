
import React from 'react';
import { Layers, Server, Globe, Zap, ArrowDownFromLine, ArrowDownNarrowWide, Package, Box } from 'lucide-react';
import { AllocatorState, SIZE_CLASSES } from '../types';

interface AllocatorViewProps {
  state: AllocatorState;
  activeStep: string | null;
  activeSizeClass: number | null;
}

const AllocatorView: React.FC<AllocatorViewProps> = ({ state, activeStep, activeSizeClass }) => {
  const heapUsagePercent = Math.min(100, (state.mHeap.usedMemory / state.mHeap.totalMemory) * 100);
  
  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      
      {/* 0. Data Segment Section (New) */}
      <section className={`flex-none transition-all duration-300 rounded-2xl p-4 border-2 ${activeStep === 'data' ? 'bg-amber-50 border-amber-500 shadow-lg scale-[1.01]' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Box size={18} className="text-amber-600" />
            <h3 className="font-black text-slate-700 uppercase tracking-tight text-xs">Static Data Segment (.data / .bss)</h3>
          </div>
          <div className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded uppercase tracking-tighter">
            Global Persistence
          </div>
        </div>
        
        <div className="flex gap-2 min-h-[50px] items-center overflow-x-auto pb-1 no-scrollbar">
          {state.staticObjects.map((obj, i) => (
            <div key={i} className="flex-none bg-white border-2 border-amber-500 px-4 py-2 rounded-xl shadow-sm animate-in zoom-in-90 flex flex-col items-center justify-center min-w-[80px] hover:shadow-md transition-shadow">
               <span className="text-sm font-black text-amber-800 leading-none">{obj.name}</span>
               <span className="text-[10px] text-amber-400 font-mono mt-1 font-bold">{obj.size}B</span>
            </div>
          ))}
          {activeStep === 'data' && (
            <div className="flex-none bg-amber-100 w-24 h-12 rounded-xl animate-pulse border-2 border-dashed border-amber-400 flex items-center justify-center">
              <span className="text-amber-600 text-[10px] font-black uppercase">Binding...</span>
            </div>
          )}
          {state.staticObjects.length === 0 && !activeStep && (
            <div className="text-slate-400 text-[10px] italic py-3 ml-2">No global variables.</div>
          )}
        </div>
      </section>

      {/* 1. Stack Section */}
      <section className={`flex-none transition-all duration-300 rounded-2xl p-4 border-2 ${activeStep === 'stack' ? 'bg-emerald-50 border-emerald-500 shadow-lg scale-[1.01]' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ArrowDownFromLine size={18} className="text-emerald-600" />
            <h3 className="font-black text-slate-700 uppercase tracking-tight text-xs">Goroutine Stack (Thread Local)</h3>
          </div>
          <div className="flex gap-2 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded uppercase tracking-tighter">
            LIFO / NO GC
          </div>
        </div>
        
        <div className="flex gap-2 min-h-[50px] items-center overflow-x-auto pb-1 no-scrollbar">
          {state.stackObjects.map((obj, i) => (
            <div key={i} className="flex-none bg-white border-2 border-emerald-500 px-4 py-2 rounded-xl shadow-sm animate-in zoom-in-90 flex flex-col items-center justify-center min-w-[80px] hover:shadow-md transition-shadow">
               <span className="text-sm font-black text-emerald-800 leading-none">{obj.name}</span>
               <span className="text-[10px] text-emerald-400 font-mono mt-1 font-bold">{obj.size}B</span>
            </div>
          ))}
          {activeStep === 'stack' && (
            <div className="flex-none bg-emerald-100 w-24 h-12 rounded-xl animate-pulse border-2 border-dashed border-emerald-400 flex items-center justify-center">
              <span className="text-emerald-600 text-[10px] font-black uppercase">Pushing...</span>
            </div>
          )}
          {state.stackObjects.length === 0 && !activeStep && (
            <div className="text-slate-400 text-[10px] italic py-3 ml-2">Stack is empty.</div>
          )}
        </div>
      </section>

      {/* Escape Animation Layer */}
      {activeStep === 'escape-animation' && (
        <div className="flex justify-center my-1 animate-bounce">
          <ArrowDownNarrowWide size={32} className="text-orange-500" />
          <span className="text-orange-600 text-[10px] font-black ml-2 self-center uppercase">Escaping to Heap...</span>
        </div>
      )}

      {/* 2. MCache Section */}
      <section className={`flex-none transition-all duration-300 rounded-2xl bg-slate-50/50 p-5 border-2 border-transparent ${activeStep?.includes('mcache') ? 'border-blue-500 bg-white shadow-xl scale-[1.01]' : 'border-slate-100'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-blue-500" />
            <h3 className="font-black text-slate-700 uppercase tracking-tight text-xs">MCache (Thread Local Allocator)</h3>
          </div>
          {activeStep === 'refill-mcache' && (
            <div className="flex items-center gap-1.5 text-blue-600 text-[10px] font-black animate-pulse bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                <Zap size={12} className="fill-blue-600" /> REFILLING
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {SIZE_CLASSES.slice(0, 24).map((size, idx) => {
            const span = state.mCache.spans[idx];
            const isActive = activeSizeClass === idx && activeStep?.includes('mcache');
            const utilization = span ? Math.round(((span.totalObjects - span.freeObjects) / span.totalObjects) * 100) : 0;
            
            return (
              <div key={idx} className={`p-2 rounded-xl border-2 transition-all duration-300 relative ${
                    isActive ? 'border-blue-500 bg-blue-50 z-10 scale-110 shadow-lg ring-4 ring-blue-100' : 
                    span ? 'bg-white border-blue-50 shadow-sm' : 'bg-slate-100/40 border-slate-200 opacity-60'
                }`}>
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 bg-slate-100'}`}>C{idx}</span>
                  <span className="text-[8px] font-mono font-bold text-slate-600">{size}B</span>
                </div>
                {span ? (
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-0.5 h-3 overflow-hidden">
                      {span.objects.slice(0, 10).map((occ, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-sm ${occ ? 'bg-blue-500' : 'bg-slate-200'} ${isActive && activeStep === 'allocating-slot' && !occ ? 'animate-ping' : ''}`} />
                      ))}
                    </div>
                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-700 ${utilization > 80 ? 'bg-red-400' : 'bg-blue-400'}`} style={{ width: `${utilization}%` }} />
                    </div>
                  </div>
                ) : (
                  <div className="h-4 flex items-center justify-center">
                    <div className={`w-full h-0.5 rounded-full ${isActive && activeStep?.includes('refill') ? 'bg-blue-400 animate-pulse' : 'bg-slate-200'}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. MCentral Section */}
      <section className={`flex-none transition-all duration-300 rounded-2xl bg-slate-50/50 p-5 border-2 border-transparent ${activeStep?.includes('mcentral') ? 'border-orange-500 bg-white shadow-xl scale-[1.01]' : 'border-slate-100'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Server size={18} className="text-orange-500" />
            <h3 className="font-black text-slate-700 uppercase tracking-tight text-xs">MCentral (Global Shared Pool)</h3>
          </div>
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Available Spans</div>
        </div>
        
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {state.mCentrals.slice(0, 24).map((central, idx) => {
            const isActive = activeSizeClass === idx && activeStep?.includes('mcentral');
            const spanCount = central.nonEmptySpans.length;
            
            return (
              <div key={idx} className={`p-2 rounded-xl border-2 transition-all duration-300 relative ${
                    isActive ? 'border-orange-500 bg-orange-50 z-10 scale-110 shadow-lg ring-4 ring-orange-100' : 
                    spanCount > 0 ? 'bg-white border-orange-50 shadow-sm' : 'bg-slate-100/40 border-slate-200 opacity-60'
                }`}>
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${isActive ? 'bg-orange-600 text-white' : 'text-slate-400 bg-slate-100'}`}>S{idx}</span>
                  <span className="text-[8px] font-mono font-bold text-slate-600">{central.objectSize}B</span>
                </div>
                
                <div className="flex flex-col items-center justify-center pt-1 min-h-[24px]">
                    <div className="flex items-center gap-1">
                        <span className={`text-xs font-black ${spanCount > 0 ? 'text-orange-600' : 'text-slate-300'}`}>{spanCount}</span>
                        <Package size={10} className={`${spanCount > 0 ? 'text-orange-400' : 'text-slate-200'}`} />
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. MHeap Section */}
      <section className={`flex-none mt-auto transition-all duration-500 ${activeStep === 'mheap' ? 'scale-[1.01]' : ''}`}>
        <div className={`bg-slate-900 rounded-2xl px-6 py-4 border-2 shadow-2xl transition-all ${activeStep === 'mheap' ? 'border-blue-400 ring-8 ring-blue-900/20' : 'border-slate-800'}`}>
            <div className="flex items-center justify-between gap-6 mb-2">
                <div className="flex items-center gap-3">
                    <Globe size={18} className="text-blue-400" />
                    <h3 className="text-white font-black text-xs uppercase tracking-widest leading-none">MHeap (Base Memory Arena)</h3>
                </div>
                <div className="text-right">
                    <p className="text-white font-mono text-xs font-black">{(state.mHeap.usedMemory / (1024*1024)).toFixed(1)} MB / 1 GB</p>
                </div>
            </div>
            <div className="relative h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div className={`absolute top-0 left-0 h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]`} style={{ width: `${heapUsagePercent}%` }} />
            </div>
        </div>
      </section>
    </div>
  );
};

export default AllocatorView;
