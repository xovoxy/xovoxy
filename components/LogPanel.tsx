
import React, { useRef, useEffect } from 'react';
import { Terminal, BrainCircuit } from 'lucide-react';

interface LogPanelProps {
  logs: string[];
}

const LogPanel: React.FC<LogPanelProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-800 shadow-inner overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 text-slate-400">
          <Terminal size={14} />
          <span className="text-xs font-bold uppercase tracking-widest">Allocation History</span>
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 font-mono scrollbar-thin scrollbar-thumb-slate-700 scroll-smooth"
      >
        {logs.map((log, i) => {
            const isAI = log.includes('[AI]');
            const isSuccess = log.includes('[SUCCESS]') || log.includes('[Final]');
            const isAllocatorStack = log.includes('[ALLOCATOR: STACK]');
            const isAllocatorData = log.includes('[ALLOCATOR: DATA SEGMENT]');
            const isAllocatorHeap = log.includes('[ALLOCATOR: MCACHE]') || log.includes('[ALLOCATOR: MCENTRAL]') || log.includes('[ALLOCATOR: MHEAP]');
            const isCompiler = log.includes('[COMPILER]');
            const isTransition = log.includes('[TRANSITION]');
            
            return (
                <div key={i} className={`text-[10px] leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-300
                    ${isAI ? 'text-purple-400 flex items-center gap-2' :
                      isSuccess ? 'text-emerald-400 font-bold' : 
                      isAllocatorStack ? 'text-emerald-400 border-l-2 border-emerald-500/50 pl-2' :
                      isAllocatorData ? 'text-amber-400 border-l-2 border-amber-500/50 pl-2' :
                      isAllocatorHeap ? 'text-blue-300 border-l-2 border-blue-400/50 pl-2' :
                      isCompiler ? 'text-slate-400 italic' :
                      isTransition ? 'text-orange-400 font-bold' :
                      'text-slate-500'}
                `}>
                    {isAI && <BrainCircuit size={10} />}
                    <span className="opacity-30 mr-2 text-[8px] tracking-tighter">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                    {log}
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default LogPanel;
