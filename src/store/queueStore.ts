import { create } from 'zustand';
import type { FileQueueItem } from '../types/queue';

interface QueueStore {
  items: FileQueueItem[];
  addItems: (files: FileQueueItem[]) => void;
  updateItem: (id: string, patch: Partial<FileQueueItem>) => void;
  removeItem: (id: string) => void;
  clearCompleted: () => void;
}

export const useQueueStore = create<QueueStore>((set) => ({
  items: [],
  addItems: (files) =>
    set((state) => ({ items: [...state.items, ...files] })),
  updateItem: (id, patch) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    })),
  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  clearCompleted: () =>
    set((state) => ({
      items: state.items.filter(
        (item) => item.status !== 'done' && item.status !== 'error'
      ),
    })),
}));
