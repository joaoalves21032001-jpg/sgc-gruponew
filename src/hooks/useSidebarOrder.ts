import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'sidebar-nav-order';
const PINNED_KEY = 'sidebar-nav-pinned';

interface SidebarOrderState {
  order: string[]; // array of route paths in custom order
  pinned: string[]; // array of pinned route paths
}

function loadState(): SidebarOrderState {
  try {
    const order = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const pinned = JSON.parse(localStorage.getItem(PINNED_KEY) || '[]');
    return { order, pinned };
  } catch {
    return { order: [], pinned: [] };
  }
}

function saveState(state: SidebarOrderState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.order));
  localStorage.setItem(PINNED_KEY, JSON.stringify(state.pinned));
}

export function useSidebarOrder() {
  const [state, setState] = useState<SidebarOrderState>(loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const setOrder = useCallback((order: string[]) => {
    setState(prev => ({ ...prev, order }));
  }, []);

  const togglePin = useCallback((path: string) => {
    setState(prev => {
      const pinned = prev.pinned.includes(path)
        ? prev.pinned.filter(p => p !== path)
        : [...prev.pinned, path];
      return { ...prev, pinned };
    });
  }, []);

  const isPinned = useCallback((path: string) => {
    return state.pinned.includes(path);
  }, [state.pinned]);

  const sortItems = useCallback(<T extends { to: string }>(items: T[]): T[] => {
    const { order, pinned } = state;

    // Separate pinned and unpinned
    const pinnedItems = items.filter(i => pinned.includes(i.to));
    const unpinnedItems = items.filter(i => !pinned.includes(i.to));

    // Sort each group by saved order (if exists), otherwise keep original order
    const sortByOrder = (a: T, b: T) => {
      const ai = order.indexOf(a.to);
      const bi = order.indexOf(b.to);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    };

    pinnedItems.sort(sortByOrder);
    unpinnedItems.sort(sortByOrder);

    return [...pinnedItems, ...unpinnedItems];
  }, [state]);

  return { sortItems, setOrder, togglePin, isPinned, order: state.order, pinned: state.pinned };
}
