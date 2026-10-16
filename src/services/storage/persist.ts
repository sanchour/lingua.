export interface StorageInfo {
  supported: boolean;
  usage: number;
  quota: number;
  persisted: boolean;
}

export async function getStorageInfo(): Promise<StorageInfo> {
  const storage = navigator.storage;
  if (!storage?.estimate) return { supported: false, usage: 0, quota: 0, persisted: false };
  const [estimate, persisted] = await Promise.all([storage.estimate(), storage.persisted?.() ?? Promise.resolve(false)]);
  return { supported: true, usage: estimate.usage ?? 0, quota: estimate.quota ?? 0, persisted };
}

/**
 * Asks the browser not to evict Lingua's data under storage pressure.
 * Installed apps are usually granted this silently; Safari decides without a prompt.
 */
export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
