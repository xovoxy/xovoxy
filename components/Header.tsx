
import React from 'react';
import { Info, Database } from 'lucide-react';

interface HeaderProps {
  onInfoClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onInfoClick }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
          <Database className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">GoMem Visualizer</h1>
          <p className="text-xs text-slate-500 font-medium">Internal Memory Allocator Explorer</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-6 mr-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-slate-600">MCache</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
            <span className="text-sm text-slate-600">MCentral</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-slate-400 rounded-full"></div>
            <span className="text-sm text-slate-600">MHeap</span>
          </div>
        </div>
        
        <button 
          onClick={onInfoClick}
          className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors"
        >
          <Info size={20} />
          <span className="hidden sm:inline font-medium">How it works</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
