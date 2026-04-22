const DB_NAME = "ditto-jobs.prototype-resume-assets";
const STORE_NAME = "resume-assets";
const DB_VERSION = 1;

interface StoredResumeAsset {
  blob: Blob;
  fileName: string;
  lastModified: number;
  type: string;
}

function buildAssetKey(email: string, recordId: string): string {
  return `${email.trim().toLowerCase()}::${recordId}`;
}

function openResumeAssetDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error ?? new Error("Unable to open resume asset database."));
    };

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

function runRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => {
      reject(request.error ?? new Error("IndexedDB request failed."));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

export async function savePrototypeResumeAsset(
  email: string,
  recordId: string,
  file: File
): Promise<void> {
  const database = await openResumeAssetDatabase();

  if (!database) {
    return;
  }

  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const asset: StoredResumeAsset = {
      blob: file,
      fileName: file.name,
      lastModified: file.lastModified,
      type: file.type
    };

    await runRequest(store.put(asset, buildAssetKey(email, recordId)));
  } finally {
    database.close();
  }
}

export async function readPrototypeResumeAsset(
  email: string,
  recordId: string
): Promise<File | null> {
  const database = await openResumeAssetDatabase();

  if (!database) {
    return null;
  }

  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const result = await runRequest<StoredResumeAsset | undefined>(
      store.get(buildAssetKey(email, recordId))
    );

    if (!result) {
      return null;
    }

    return new File([result.blob], result.fileName, {
      lastModified: result.lastModified,
      type: result.type
    });
  } finally {
    database.close();
  }
}

export async function deletePrototypeResumeAsset(
  email: string,
  recordId: string
): Promise<void> {
  const database = await openResumeAssetDatabase();

  if (!database) {
    return;
  }

  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    await runRequest(store.delete(buildAssetKey(email, recordId)));
  } finally {
    database.close();
  }
}
