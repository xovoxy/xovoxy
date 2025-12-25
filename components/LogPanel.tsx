
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
            const isRequest = log.startsWith('->');
            const isAI = log.includes('[AI]');
            const isSuccess = log.includes('[Success]') || log.includes('[Final]');
            const isStrategy = log.includes('[Strategy]');
            
            return (
                <div key={i} className={`text-[11px] leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-300
                    ${isRequest ? 'text-blue-400 font-bold border-l-2 border-blue-500 pl-2 mt-2' : 
                      isAI ? 'text-purple-400 flex items-center gap-2' :
                      isSuccess ? 'text-emerald-400 font-bold' : 
                      isStrategy ? 'text-blue-300 italic' :
                      'text-slate-500'}
                `}>
                    {isAI && <BrainCircuit size={10} />}
                    <span className="opacity-40 mr-2 text-[9px]">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                    {log}
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default LogPanel;
