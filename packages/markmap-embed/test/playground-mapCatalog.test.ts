import { describe, expect, it } from 'vitest';
import {
  createScopedMapStorage,
  createMemoryMapStorage,
  createNewMap,
  deleteSavedMap,
  listSavedMaps,
  loadSavedMap,
  saveMap,
} from '../../../examples/mindmaps-playground/src/mapCatalog';

describe('mindmaps playground mapCatalog', () => {
  it('creates a map with stable markdown and stores it in the catalog', () => {
    const storage = createMemoryMapStorage();
    const map = createNewMap(storage, {
      title: 'Acquisition Plan',
      now: () => '2026-05-29T12:00:00.000Z',
    });

    expect(map.title).toBe('Acquisition Plan');
    expect(map.markdown).toContain('# Acquisition Plan');
    expect(listSavedMaps(storage)).toEqual([
      {
        id: map.id,
        title: 'Acquisition Plan',
        layoutMode: 'auto',
        createdAt: '2026-05-29T12:00:00.000Z',
        updatedAt: '2026-05-29T12:00:00.000Z',
      },
    ]);
  });

  it('persists layout mode with saved maps', () => {
    const storage = createMemoryMapStorage();
    const map = createNewMap(storage, {
      title: 'Org Structure',
      layoutMode: 'org',
      now: () => '2026-05-29T12:00:00.000Z',
    });

    const saved = saveMap(storage, {
      ...map,
      layoutMode: 'left',
      now: () => '2026-05-29T12:05:00.000Z',
    });

    expect(saved.layoutMode).toBe('left');
    expect(listSavedMaps(storage)[0]?.layoutMode).toBe('left');
  });

  it('saves existing map content and sorts recent maps first', () => {
    const storage = createMemoryMapStorage();
    const older = createNewMap(storage, {
      title: 'Older Map',
      now: () => '2026-05-29T12:00:00.000Z',
    });
    const newer = createNewMap(storage, {
      title: 'Newer Map',
      now: () => '2026-05-29T12:05:00.000Z',
    });

    saveMap(storage, {
      ...older,
      markdown: '# Older Map\n\n## Updated',
      now: () => '2026-05-29T12:10:00.000Z',
    });

    expect(listSavedMaps(storage).map((map) => map.id)).toEqual([
      older.id,
      newer.id,
    ]);
  });

  it('removes deleted maps from the catalog', () => {
    const storage = createMemoryMapStorage();
    const map = createNewMap(storage, {
      title: 'Delete Me',
      now: () => '2026-05-29T12:00:00.000Z',
    });

    deleteSavedMap(storage, map.id);

    expect(listSavedMaps(storage)).toEqual([]);
  });

  it('isolates saved maps by storage scope', () => {
    const backingStorage = createMemoryMapStorage();
    const salesStorage = createScopedMapStorage(
      backingStorage,
      'prosper:capa:user-a',
    );
    const supportStorage = createScopedMapStorage(
      backingStorage,
      'prosper:capa:user-b',
    );

    const salesMap = createNewMap(salesStorage, {
      title: 'Sales Account Plan',
      now: () => '2026-05-29T12:00:00.000Z',
    });
    const supportMap = createNewMap(supportStorage, {
      title: 'Support Playbook',
      now: () => '2026-05-29T12:05:00.000Z',
    });

    expect(listSavedMaps(salesStorage).map((map) => map.id)).toEqual([
      salesMap.id,
    ]);
    expect(listSavedMaps(supportStorage).map((map) => map.id)).toEqual([
      supportMap.id,
    ]);
    expect(loadSavedMap(salesStorage, supportMap.id)).toBeNull();
    expect(loadSavedMap(supportStorage, salesMap.id)).toBeNull();
  });
});
