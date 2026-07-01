const FIRESTORE_BASE = "https://firestore.googleapis.com/v1";

function firebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  };
}

export function hasFirebaseConfig() {
  const config = firebaseConfig();
  return Boolean(config.apiKey && config.projectId);
}

function decodeValue(value) {
  if (!value || typeof value !== "object") return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) {
    return (value.arrayValue.values || []).map(decodeValue);
  }
  if ("mapValue" in value) {
    return decodeFields(value.mapValue.fields || {});
  }
  return null;
}

function decodeFields(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeValue(value)])
  );
}

export async function getFirestoreDoc(path) {
  if (!hasFirebaseConfig()) return null;

  const { apiKey, projectId } = firebaseConfig();
  const cleanPath = String(path).replace(/^\/+/, "");
  const url = `${FIRESTORE_BASE}/projects/${projectId}/databases/(default)/documents/${cleanPath}?key=${apiKey}`;

  const res = await fetch(url, { next: { revalidate: 30 } });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Firestore read failed: ${res.status}`);
  }

  const json = await res.json();
  return decodeFields(json.fields || {});
}

export async function getFirestoreCollection(path, pageSize = 300) {
  if (!hasFirebaseConfig()) return [];

  const { apiKey, projectId } = firebaseConfig();
  const cleanPath = String(path).replace(/^\/+/, "");
  const url = `${FIRESTORE_BASE}/projects/${projectId}/databases/(default)/documents/${cleanPath}?key=${apiKey}&pageSize=${pageSize}`;

  const res = await fetch(url, { next: { revalidate: 30 } });
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`Firestore collection read failed: ${res.status}`);
  }

  const json = await res.json();
  return (json.documents || []).map((doc) => ({
    id: String(doc.name || "").split("/").pop(),
    ...decodeFields(doc.fields || {})
  }));
}
