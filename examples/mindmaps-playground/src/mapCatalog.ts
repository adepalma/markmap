import {
  getDefaultLayoutMode,
  isLayoutMode,
  type LayoutMode,
} from './mapEditing';

const CATALOG_KEY = 'capa:mindmaps:catalog';
const MAP_PREFIX = 'capa:mindmaps:map:';
const SCOPED_PREFIX = 'capa:mindmaps:';

export interface MapStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SavedMapSummary {
  id: string;
  title: string;
  layoutMode: LayoutMode;
  createdAt: string;
  updatedAt: string;
}

export interface SavedMap extends SavedMapSummary {
  markdown: string;
}

export interface CreateMapOptions {
  title?: string;
  layoutMode?: LayoutMode;
  now?: () => string;
}

export interface SaveMapOptions extends SavedMap {
  now?: () => string;
}

export function createMemoryMapStorage(): MapStorage {
  const values = new Map<string, string>();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function normalizeStorageScope(scope: string) {
  return scope
    .trim()
    .replace(/[^a-zA-Z0-9:_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}

function getScopedKey(key: string, scope: string) {
  const prefix = `${SCOPED_PREFIX}${scope}:`;
  if (key === CATALOG_KEY) return `${prefix}catalog`;
  if (key.startsWith(MAP_PREFIX))
    return `${prefix}map:${key.slice(MAP_PREFIX.length)}`;
  return `${prefix}${key}`;
}

export function createScopedMapStorage(
  storage: MapStorage,
  scope: string,
): MapStorage {
  const normalizedScope = normalizeStorageScope(scope);
  if (!normalizedScope) return storage;
  return {
    getItem(key) {
      return storage.getItem(getScopedKey(key, normalizedScope));
    },
    setItem(key, value) {
      storage.setItem(getScopedKey(key, normalizedScope), value);
    },
    removeItem(key) {
      storage.removeItem(getScopedKey(key, normalizedScope));
    },
  };
}

function getNow(options?: { now?: () => string }) {
  return options?.now?.() ?? new Date().toISOString();
}

function slugifyTitle(title: string) {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'mindmap'
  );
}

function createMapId(title: string, now: string) {
  const stamp = now.replace(/\D/g, '').slice(0, 14);
  return `${slugifyTitle(title)}-${stamp}`;
}

function readCatalog(storage: MapStorage): SavedMapSummary[] {
  const raw = storage.getItem(CATALOG_KEY);
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value)
      ? value
          .filter(
            (item) =>
              typeof item?.id === 'string' &&
              typeof item?.title === 'string' &&
              typeof item?.createdAt === 'string' &&
              typeof item?.updatedAt === 'string',
          )
          .map((item) => ({
            id: item.id,
            title: item.title,
            layoutMode: isLayoutMode(item.layoutMode)
              ? item.layoutMode
              : getDefaultLayoutMode(),
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          }))
      : [];
  } catch {
    return [];
  }
}

function writeCatalog(storage: MapStorage, maps: SavedMapSummary[]) {
  storage.setItem(CATALOG_KEY, JSON.stringify(maps));
}

function getMapKey(id: string) {
  return `${MAP_PREFIX}${id}`;
}

export function listSavedMaps(storage: MapStorage) {
  return readCatalog(storage).sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function loadSavedMap(storage: MapStorage, id: string): SavedMap | null {
  const raw = storage.getItem(getMapKey(id));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (
      typeof value?.id === 'string' &&
      typeof value?.title === 'string' &&
      typeof value?.markdown === 'string' &&
      typeof value?.createdAt === 'string' &&
      typeof value?.updatedAt === 'string'
    ) {
      return {
        id: value.id,
        title: value.title,
        layoutMode: isLayoutMode(value.layoutMode)
          ? value.layoutMode
          : getDefaultLayoutMode(),
        markdown: value.markdown,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function saveMap(
  storage: MapStorage,
  options: SaveMapOptions,
): SavedMap {
  const updatedAt = getNow(options);
  const map: SavedMap = {
    id: options.id,
    title: options.title.trim() || 'Untitled mindmap',
    layoutMode: isLayoutMode(options.layoutMode)
      ? options.layoutMode
      : getDefaultLayoutMode(),
    markdown: options.markdown,
    createdAt: options.createdAt,
    updatedAt,
  };
  storage.setItem(getMapKey(map.id), JSON.stringify(map));
  const nextCatalog = [
    {
      id: map.id,
      title: map.title,
      layoutMode: map.layoutMode,
      createdAt: map.createdAt,
      updatedAt: map.updatedAt,
    },
    ...readCatalog(storage).filter((item) => item.id !== map.id),
  ];
  writeCatalog(storage, nextCatalog);
  return map;
}

export function createNewMap(
  storage: MapStorage,
  options: CreateMapOptions = {},
): SavedMap {
  const title = options.title?.trim() || 'Untitled mindmap';
  const now = getNow(options);
  return saveMap(storage, {
    id: createMapId(title, now),
    title,
    layoutMode: options.layoutMode || getDefaultLayoutMode(),
    markdown: `# ${title}\n\n## First Branch\n- Add a node\n- Double-click to edit\n\n## Next Steps\n- Save this map\n- Export when ready`,
    createdAt: now,
    updatedAt: now,
    now: () => now,
  });
}

export function deleteSavedMap(storage: MapStorage, id: string) {
  storage.removeItem(getMapKey(id));
  writeCatalog(
    storage,
    readCatalog(storage).filter((item) => item.id !== id),
  );
}
