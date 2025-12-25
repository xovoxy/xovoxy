
export type ObjectSize = number;

export enum AllocStrategy {
  STACK = 'STACK',
  TINY = 'TINY',
  SMALL = 'SMALL',
  LARGE = 'LARGE',
  DATA = 'DATA'
}

export interface AllocEvent {
  size: number;
  hasPointer: boolean;
  name: string;
  reason: string;
  type: string;
  escapes: boolean;
  location: 'stack' | 'heap' | 'data';
  classSize?: number; // 匹配到的规格大小
  waste?: number;     // 产生的内存碎片
}

export interface MSpan {
  id: string;
  sizeClass: number;
  objectSize: number;
  totalObjects: number;
  freeObjects: number;
  objects: boolean[]; 
}

export interface MCache {
  spans: (MSpan | null)[];
  tinyOffset: number; // Tiny 分配器偏移量
}

export interface MCentral {
  sizeClass: number;
  objectSize: number;
  nonEmptySpans: MSpan[];
  emptySpans: MSpan[];
}

export interface MHeap {
  freeSpans: MSpan[];
  totalMemory: number;
  usedMemory: number; // 实际从 OS 申请的页面总量
  activeObjectMemory: number; // 逻辑上被对象占用的总量
}

export interface AllocatorState {
  mCache: MCache;
  mCentrals: MCentral[];
  mHeap: MHeap;
  logs: string[];
  stackObjects: { id: string; name: string; size: number }[];
  staticObjects: { id: string; name: string; size: number }[];
}

// Go 真实的 Size Classes (部分核心规格)
export const SIZE_CLASSES = [
  8, 16, 32, 48, 64, 80, 96, 112, 128, 144, 160, 176, 192, 208, 224, 240, 256,
  320, 384, 448, 512, 640, 768, 896, 1024, 1280, 1536, 1792, 2048,
  4096, 8192, 16384, 32768
];

export const MAX_SMALL_OBJECT = 32768;
export const PAGE_SIZE = 8192; // 8KB
