import { clearPrototypeSession } from "./prototype-auth";

const ACCOUNT_STORAGE_PREFIXES = [
  "ditto-jobs.prototype-applications",
  "ditto-jobs.prototype-candidate-profile",
  "ditto-jobs.prototype-career-history",
  "ditto-jobs.prototype-personal-details",
  "ditto-jobs.prototype-resume-state",
  "ditto-jobs.prototype-role-questions"
];

const ASSET_DATABASES = [
  {
    name: "ditto-jobs.prototype-profile-assets",
    storeName: "profile-assets"
  },
  {
    name: "ditto-jobs.prototype-resume-assets",
    storeName: "resume-assets"
  }
];

function getEncodedEmail(email: string): string {
  return encodeURIComponent(email.trim().toLowerCase());
}

function getAssetKeyPrefix(email: string): string {
  return `${email.trim().toLowerCase()}::`;
}

function removePrototypeLocalStorageForEmail(email: string): void {
  const encodedEmail = getEncodedEmail(email);
  const keysToRemove: string[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (!key) {
      continue;
    }

    if (ACCOUNT_STORAGE_PREFIXES.some((prefix) => key.startsWith(`${prefix}:${encodedEmail}`))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
}

function openDatabase(name: string): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const request = window.indexedDB.open(name);

    request.onerror = () => resolve(null);
    request.onsuccess = () => resolve(request.result);
  });
}

function runRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
    request.onsuccess = () => resolve(request.result);
  });
}

async function deletePrototypeAssetsForEmail(email: string): Promise<void> {
  const assetKeyPrefix = getAssetKeyPrefix(email);

  await Promise.all(
    ASSET_DATABASES.map(async ({ name, storeName }) => {
      const database = await openDatabase(name);

      if (!database || !database.objectStoreNames.contains(storeName)) {
        database?.close();
        return;
      }

      try {
        const transaction = database.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const keys = await runRequest<IDBValidKey[]>(store.getAllKeys());

        await Promise.all(
          keys
            .filter((key): key is string => typeof key === "string" && key.startsWith(assetKeyPrefix))
            .map((key) => runRequest(store.delete(key)))
        );
      } finally {
        database.close();
      }
    })
  );
}

export async function clearPrototypeAccountData(email: string): Promise<void> {
  removePrototypeLocalStorageForEmail(email);
  clearPrototypeSession();
  await deletePrototypeAssetsForEmail(email);
}
