const DB_NAME = "ditto-jobs.prototype-profile-assets";
const STORE_NAME = "profile-assets";
const DB_VERSION = 1;

interface StoredProfileAsset {
  blob: Blob;
  fileName: string;
  lastModified: number;
  type: string;
}

function buildAssetKey(email: string, fileId: string): string {
  return `${email.trim().toLowerCase()}::${fileId}`;
}

function openProfileAssetDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error ?? new Error("Unable to open profile asset database."));
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

export async function savePrototypeProfileAsset(
  email: string,
  fileId: string,
  file: File
): Promise<void> {
  const database = await openProfileAssetDatabase();

  if (!database) {
    return;
  }

  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    await runRequest(
      store.put(
        {
          blob: file,
          fileName: file.name,
          lastModified: file.lastModified,
          type: file.type
        } satisfies StoredProfileAsset,
        buildAssetKey(email, fileId)
      )
    );
  } finally {
    database.close();
  }
}

export async function readPrototypeProfileAsset(
  email: string,
  fileId: string
): Promise<File | null> {
  const database = await openProfileAssetDatabase();

  if (!database) {
    return null;
  }

  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const result = await runRequest<StoredProfileAsset | undefined>(
      store.get(buildAssetKey(email, fileId))
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

export async function deletePrototypeProfileAsset(email: string, fileId: string): Promise<void> {
  const database = await openProfileAssetDatabase();

  if (!database) {
    return;
  }

  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    await runRequest(store.delete(buildAssetKey(email, fileId)));
  } finally {
    database.close();
  }
}
