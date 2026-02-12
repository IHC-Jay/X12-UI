import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
  setItem<T>(key: string, value: T): void {
    // console.info(`StorageService: Setting item for key "${key}":`, value);
    sessionStorage.setItem(key, JSON.stringify(value));
  }

  getItem<T>(key: string): T | null {
    const item = sessionStorage.getItem(key);
    if (item === null) return null;
    try {
      // console.info(`StorageService: Retrieved item for key "${key}": ${item}`);
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`StorageService: Error parsing item for key "${key}":`, error);
      return item as unknown as T; // Return raw string if parsing fails, caller can handle it
    }
  }

  removeItem(key: string): void {
    sessionStorage.removeItem(key);
  }

  clear(): void {
    sessionStorage.clear();
  }
}
