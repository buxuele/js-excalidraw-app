import { openDB } from 'idb';

const DB_NAME = 'my-excalidraw-app-db';
const DB_VERSION = 1;
const STORE_NAME = 'pages';

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  },
});

export const db = {
  async getAllPages() {
    return (await dbPromise).getAll(STORE_NAME);
  },

  // 简化：直接存入或更新整个页面对象
  async upsertPage(page) {
    return (await dbPromise).put(STORE_NAME, page);
  },

  async deletePage(id) {
    return (await dbPromise).delete(STORE_NAME, id);
  },
};