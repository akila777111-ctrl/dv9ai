import { useEffect, useMemo, useState } from "react";

const PASSPORT_EVIDENCE = {
  id: "passport-found-2026-08-30",
  title: "Паспорт найден",
  occurredAt: "2026-08-30T10:25:24+02:00",
  timezone: "Europe/Berlin",
  expectedSha256: "5d696d057e0f7ead68808ffc89c16aeca118e17921eb946b7507c1325559a2cf",
  privacy: "OWNER_LOCAL",
  status: "PHYSICAL_FOUND",
  note: "Физический украинский паспорт найден. Фото используется только как приватное подтверждение события.",
};

const DB_NAME = "dv9-evidence";
const STORE_NAME = "private-blobs";
const DB_VERSION = 1;

function openEvidenceDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB open failed"));
  });
}

async function readPrivateBlob(key) {
  const db = await openEvidenceDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("Evidence read failed"));
    });
  } finally {
    db.close();
  }
}

async function writePrivateBlob(key, blob) {
  const db = await openEvidenceDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Evidence write failed"));
      tx.onabort = () => reject(tx.error || new Error("Evidence write aborted"));
    });
  } finally {
    db.close();
  }
}

async function sha256(blob) {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function formatLocalTimestamp(iso) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: PASSPORT_EVIDENCE.timezone,
  }).format(date);
}

export default function EvidenceReceipt() {
  const [blob, setBlob] = useState(null);
  const [localHash, setLocalHash] = useState("");
  const [state, setState] = useState("HASH_RECORDED");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    readPrivateBlob(PASSPORT_EVIDENCE.id)
      .then(async (storedBlob) => {
        if (!active || !storedBlob) return;
        const hash = await sha256(storedBlob);
        if (!active) return;
        setBlob(storedBlob);
        setLocalHash(hash);
        setState(hash === PASSPORT_EVIDENCE.expectedSha256 ? "EVIDENCE_VERIFIED" : "LOCAL_EVIDENCE_ATTACHED");
      })
      .catch(() => {
        if (active) setState("HASH_RECORDED");
      });

    return () => {
      active = false;
    };
  }, []);

  const previewUrl = useMemo(() => (blob ? URL.createObjectURL(blob) : ""), [blob]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function attachEvidence(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    try {
      const hash = await sha256(file);
      await writePrivateBlob(PASSPORT_EVIDENCE.id, file);
      setBlob(file);
      setLocalHash(hash);
      setState(hash === PASSPORT_EVIDENCE.expectedSha256 ? "EVIDENCE_VERIFIED" : "LOCAL_EVIDENCE_ATTACHED");
    } catch (attachError) {
      console.error("DV9 evidence attachment failed", attachError);
      setError("Не удалось сохранить фото локально на этом устройстве.");
    }
  }

  const verified = state === "EVIDENCE_VERIFIED";

  return (
    <section className="evidencePanel" aria-labelledby="evidence-title">
      <div className="evidenceHeader">
        <div>
          <p className="sectionLabel">DV9 EVIDENCE RECEIPT</p>
          <h2 id="evidence-title">{PASSPORT_EVIDENCE.title}</h2>
          <p>{PASSPORT_EVIDENCE.note}</p>
        </div>
        <span className={`evidenceState ${verified ? "evidenceState--verified" : ""}`}>{state}</span>
      </div>

      <div className="evidenceGrid">
        <div className="evidenceMeta">
          <div><span>TIME</span><strong>{formatLocalTimestamp(PASSPORT_EVIDENCE.occurredAt)}</strong></div>
          <div><span>ZONE</span><strong>{PASSPORT_EVIDENCE.timezone}</strong></div>
          <div><span>EVENT</span><strong>{PASSPORT_EVIDENCE.status}</strong></div>
          <div><span>PRIVACY</span><strong>{PASSPORT_EVIDENCE.privacy}</strong></div>
          <div className="evidenceHash">
            <span>PHOTO SHA-256</span>
            <code>{PASSPORT_EVIDENCE.expectedSha256}</code>
          </div>
          {localHash && localHash !== PASSPORT_EVIDENCE.expectedSha256 ? (
            <div className="evidenceHash">
              <span>LOCAL PHOTO SHA-256</span>
              <code>{localHash}</code>
            </div>
          ) : null}
        </div>

        <div className="evidencePhoto">
          {previewUrl ? (
            <img src={previewUrl} alt="Локально прикреплённое подтверждение события" />
          ) : (
            <div className="evidencePlaceholder">
              <strong>Фото не загружается в репозиторий</strong>
              <span>Прикрепи его локально на своём устройстве.</span>
            </div>
          )}
          <label className="evidenceAttach">
            Прикрепить приватное фото
            <input type="file" accept="image/*" onChange={attachEvidence} />
          </label>
          <small>Файл хранится только в IndexedDB текущего браузера. В GitHub уходит только код и заранее зафиксированный SHA-256.</small>
          {error ? <p className="evidenceError">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}
