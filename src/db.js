import { openDB } from 'idb';
// ... (所有代码与你提供的版本一致，无需修改)
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
  async getPageById(id) {
    return (await dbPromise).get(STORE_NAME, id);
  },
  async upsertPage(page) {
    return (await dbPromise).put(STORE_NAME, page);
  },
  async deletePage(id) {
    return (await dbPromise).delete(STORE_NAME, id);
  },
};