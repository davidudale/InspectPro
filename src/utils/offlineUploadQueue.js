const DB_NAME = "inspectpro_offline_uploads";
const DB_VERSION = 1;
const STORE_NAME = "uploads";

const openDb = () =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("scope", "scope", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB."));
  });

const withStore = async (mode, handler) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);

    let settled = false;
    const safeResolve = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const safeReject = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    tx.oncomplete = () => safeResolve(undefined);
    tx.onerror = () => safeReject(tx.error || new Error("IndexedDB transaction failed."));
    tx.onabort = () => safeReject(tx.error || new Error("IndexedDB transaction aborted."));

    try {
      const maybePromise = handler(store, tx, safeResolve, safeReject);
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.catch(safeReject);
      }
    } catch (error) {
      safeReject(error);
    }
  }).finally(() => db.close());
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });

const dataUrlToBlob = (dataUrl) => {
  const [meta, base64] = String(dataUrl || "").split(",");
  if (!meta || !base64) {
    throw new Error("Invalid queued image payload.");
  }
  const mimeMatch = /data:(.*?);base64/.exec(meta);
  const mimeType = mimeMatch?.[1] || "application/octet-stream";
  const binary = atob(base64);
  const length = binary.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
};

const makeQueueId = () =>
  `offline-upload-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const enqueueOfflineImageUpload = async ({
  scope,
  label,
  target,
  file,
  meta = {},
}) => {
  if (!scope || !file) {
    throw new Error("scope and file are required for offline image queueing.");
  }
  const dataUrl = await readFileAsDataUrl(file);
  const payload = {
    id: makeQueueId(),
    scope,
    label: label || "image",
    status: "pending",
    target: target || {},
    meta: meta || {},
    fileName: file.name || "image",
    mimeType: file.type || "image/*",
    dataUrl,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    retries: 0,
    error: "",
  };

  await withStore("readwrite", (store) => {
    store.put(payload);
  });

  return payload;
};

export const getOfflineImageUploads = async (scope) => {
  const rows = [];
  await withStore("readonly", (store, _tx, _resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const items = Array.isArray(request.result) ? request.result : [];
      items.forEach((item) => {
        if (!scope || item.scope === scope) rows.push(item);
      });
    };
    request.onerror = () => reject(request.error || new Error("Unable to read queued uploads."));
  });
  return rows.sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
};

export const removeOfflineImageUpload = async (id) => {
  if (!id) return;
  await withStore("readwrite", (store) => {
    store.delete(id);
  });
};

export const flushOfflineImageUploads = async ({
  scope,
  uploadFn,
  onUploaded,
  onFailed,
}) => {
  if (typeof uploadFn !== "function") {
    throw new Error("uploadFn is required to flush offline uploads.");
  }

  const pendingItems = (await getOfflineImageUploads(scope)).filter(
    (item) => item.status === "pending" || item.status === "failed",
  );

  let uploaded = 0;
  let failed = 0;

  for (const item of pendingItems) {
    try {
      const blob = dataUrlToBlob(item.dataUrl);
      const file = new File([blob], item.fileName || "queued-image", {
        type: item.mimeType || blob.type || "application/octet-stream",
      });
      const uploadedUrl = await uploadFn(file, item);
      await removeOfflineImageUpload(item.id);
      if (typeof onUploaded === "function") {
        await onUploaded(item, uploadedUrl);
      }
      uploaded += 1;
    } catch (error) {
      failed += 1;
      await withStore("readwrite", (store) => {
        store.put({
          ...item,
          status: "failed",
          retries: Number(item.retries || 0) + 1,
          updatedAt: Date.now(),
          error: String(error?.message || error || "Upload failed"),
        });
      });
      if (typeof onFailed === "function") {
        await onFailed(item, error);
      }
    }
  }

  return { uploaded, failed, total: pendingItems.length };
};

