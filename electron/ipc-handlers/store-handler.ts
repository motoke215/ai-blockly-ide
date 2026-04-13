// electron/ipc-handlers/store-handler.ts
// IPC bridge: renderer ↔ electron-store (key persistence)

import { ipcMain } from 'electron';
import { storeAPI } from '../store/key-store';

export const STORE_IPC = {
  GET_KEYS:             'store:get-keys',
  SET_KEY:              'store:set-key',
  DELETE_KEY:           'store:delete-key',
  GET_BASE_URLS:        'store:get-base-urls',
  SET_BASE_URL:         'store:set-base-url',
  GET_SELECTED_PROVIDER:'store:get-selected-provider',
  SET_SELECTED_PROVIDER:'store:set-selected-provider',
  GET_SELECTED_MODELS:  'store:get-selected-models',
  SET_SELECTED_MODEL:   'store:set-selected-model',
  GET_SUMMARY:          'store:get-summary',
} as const;

export function registerStoreHandlers(): void {
  ipcMain.handle(STORE_IPC.GET_KEYS,  () => storeAPI.getKeys());
  ipcMain.handle(STORE_IPC.SET_KEY,   (_, id: string, key: string) => { storeAPI.setKey(id, key); return true; });
  ipcMain.handle(STORE_IPC.DELETE_KEY,(_, id: string) => { storeAPI.deleteKey(id); return true; });

  ipcMain.handle(STORE_IPC.GET_BASE_URLS, () => storeAPI.getBaseUrls());
  ipcMain.handle(STORE_IPC.SET_BASE_URL,  (_, id: string, url: string) => { storeAPI.setBaseUrl(id, url); return true; });

  ipcMain.handle(STORE_IPC.GET_SELECTED_PROVIDER,  () => storeAPI.getSelectedProvider());
  ipcMain.handle(STORE_IPC.SET_SELECTED_PROVIDER,  (_, id: string) => { storeAPI.setSelectedProvider(id); return true; });
  ipcMain.handle(STORE_IPC.GET_SELECTED_MODELS,    () => storeAPI.getSelectedModels());
  ipcMain.handle(STORE_IPC.SET_SELECTED_MODEL,     (_, pid: string, mid: string) => { storeAPI.setSelectedModel(pid, mid); return true; });
  ipcMain.handle(STORE_IPC.GET_SUMMARY,            () => storeAPI.getSummary());
}
