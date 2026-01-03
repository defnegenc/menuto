// Simple debug logging utility
// In production, these logs won't be shown in release builds

const isDev = __DEV__;

export function debugLog(...args: any[]) {
  if (isDev) {
    console.log(...args);
  }
}

export function debugError(...args: any[]) {
  if (isDev) {
    console.error(...args);
  }
}

export function debugWarn(...args: any[]) {
  if (isDev) {
    console.warn(...args);
  }
}

