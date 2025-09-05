import * as SecureStore from 'expo-secure-store';
import type { TokenCache } from '@clerk/clerk-expo';

export const tokenCache: TokenCache = {
  getToken: (key) => SecureStore.getItemAsync(key),
  saveToken: (key, val) => SecureStore.setItemAsync(key, val),
  removeToken: (key) => SecureStore.deleteItemAsync(key),
};
