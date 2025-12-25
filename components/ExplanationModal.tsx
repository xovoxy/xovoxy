
import React from 'react';
import { X, ExternalLink, Zap, BrainCircuit, ShieldAlert, Cpu, ArrowDownFromLine } from 'lucide-react';

interface ExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExplanationModal: React.FC<ExplanationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-slate-800">Go 内存：栈 vs 堆</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-6 text-slate-600 leading-relaxed text-sm">
          <section className="grid grid-cols-2 gap-4">
             <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <h3 className="text-emerald-800 font-bold mb-2 flex items-center gap-2">
                  <ArrowDownFromLine size={16} /> 栈 (Stack)
                </h3>
                <ul className="text-[11px] space-y-1 list-disc pl-4">
                  <li><strong>速度：</strong> 极快（仅移动指针）</li>
                  <li><strong>清理：</strong> 函数返回即销毁，无 GC 压力</li>
                  <li><strong>容量：</strong> 初始 2KB，按需扩容</li>
                  <li><strong>适合：</strong> 短生命周期、小对象</li>
                </ul>
             </div>
             <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h3 className="text-blue-800 font-bold mb-2 flex items-center gap-2">
                  <Zap size={16} /> 堆 (Heap)
                </h3>
                <ul className="text-[11px] space-y-1 list-disc pl-4">
                  <li><strong>速度：</strong> 较慢（涉及分配策略/锁）</li>
                  <li><strong>清理：</strong> 依靠垃圾回收 (GC)</li>
                  <li><strong>容量：</strong> 受系统物理内存限制</li>
                  <li><strong>适合：</strong> 长生命周期、大对象</li>
                </ul>
             </div>
          </section>

          <section className="bg-amber-50 p-4 rounded-xl border border-amber-100">
            <h3 className="text-amber-800 font-bold mb-2 flex items-center gap-2">
              <BrainCircuit size={16} /> 什么是逃逸分析 (Escape Analysis)？
            </h3>
            <p>编译器在编译阶段决定一个对象放在栈还是堆。常见的逃逸场景：</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 font-mono text-[11px]">
              <li><b>指针逃逸：</b>函数返回局部变量的地址。</li>
              <li><b>动态逃逸：</b>分配大小在运行时才确定的切片。</li>
              <li><b>接口逃逸：</b>将变量转换为 interface 类型（编译器难以确定其确切类型）。</li>
              <li><b>超大对象：</b>超过了栈帧的预设上限。</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-2">内存分配阶梯</h3>
            <p>当变量不得不“逃逸”到堆上时，它会按顺序尝试：</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <p className="font-bold text-blue-700 text-xs uppercase mb-1">1. MCache</p>
                <p className="text-[11px]">线程局部，无锁分配。80% 的堆分配在此完成。</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <p className="font-bold text-orange-700 text-xs uppercase mb-1">2. MCentral</p>
                <p className="text-[11px]">全局共享，按规格分组。当 MCache 耗尽时批发补充。</p>
              </div>
              <div className="p-3 bg-slate-200 rounded-lg">
                <p className="font-bold text-slate-700 text-xs uppercase mb-1">3. MHeap</p>
                <p className="text-[11px]">底层 Arena 空间。管理页内存，负责大对象分配。</p>
              </div>
            </div>
          </section>

          <div className="pt-4 flex justify-end">
            <a 
              href="https://go.dev/doc/gc-guide" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 font-semibold hover:underline"
            >
              阅读 Go 内存管理指南 <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExplanationModal;
