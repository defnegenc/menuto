import * as SecureStore from 'expo-secure-store';

const KEY = 'menuto:last_auth';

export type LastAuthMethod =
  | 'email_password_sign_in'
  | 'email_password_sign_up'
  | 'google';

export type LastAuthRecord = {
  method: LastAuthMethod;
  identifier?: string; // e.g. email (optional)
  ts: number; // epoch ms
};

export async function getLastAuth(): Promise<LastAuthRecord | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastAuthRecord;
    if (!parsed || typeof parsed.ts !== 'number' || typeof parsed.method !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setLastAuth(record: LastAuthRecord): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(record));
  } catch {
    // best-effort; ignore
  }
}

export function formatLastAuthMethod(method: LastAuthMethod): string {
  switch (method) {
    case 'email_password_sign_in':
      return 'Email + password (sign in)';
    case 'email_password_sign_up':
      return 'Email + password (sign up)';
    default:
      return 'Email + password';
  }
}


