
export type ObjectSize = number;

export enum AllocStrategy {
  STACK = 'STACK', // 栈分配（未逃逸）
  TINY = 'TINY',
  SMALL = 'SMALL',
  LARGE = 'LARGE'
}

export interface AllocEvent {
  size: number;
  hasPointer: boolean;
  name: string;   // 变量名 (用于 UI 展示)
  reason: string; // 详细原因 (用于日志打印)
  type: 'slice' | 'map' | 'struct' | 'array' | 'primitive' | 'channel' | 'other';
  escapes: boolean; // 是否逃逸到堆
  line?: number;
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
  usedMemory: number;
}

export interface AllocatorState {
  mCache: MCache;
  mCentrals: MCentral[];
  mHeap: MHeap;
  logs: string[];
  stackObjects: { id: string; name: string; size: number }[];
}

export const SIZE_CLASSES = [
  8, 16, 32, 48, 64, 80, 96, 112, 128, 144, 160, 176, 192, 208, 224, 240, 256,
  512, 1024, 2048, 4096, 8192, 16384, 32768
];

export const MAX_SMALL_OBJECT = 32768;
