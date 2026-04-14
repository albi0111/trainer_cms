// ─────────────────────────────────────────────────────────────────────────────
// Drive Service — Low-level Google Drive API interaction
// Source of truth: resrc/system_prompt.md §4 & §5
// ─────────────────────────────────────────────────────────────────────────────

import { getAccessToken } from '../auth/googleAuth';

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

/**
 * Searches for a file/folder by name and parent.
 */
export async function findFile(name: string, parentId?: string): Promise<DriveFile | null> {
  const token = await getAccessToken();
  let query = `name = '${name}' and trashed = false`;
  if (parentId) query += ` and '${parentId}' in parents`;

  const resp = await fetch(`${DRIVE_API}?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType)`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await resp.json();
  return data.files?.[0] || null;
}

/**
 * Creates a folder.
 */
export async function createFolder(name: string, parentId?: string): Promise<string> {
  const token = await getAccessToken();
  const body: any = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) body.parents = [parentId];

  const resp = await fetch(DRIVE_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  return data.id;
}

/**
 * Creates or updates a file with JSON content.
 * §Rule 5.3: Idempotent file handling.
 */
export async function uploadJson(name: string, content: any, parentId: string): Promise<string> {
  const token = await getAccessToken();
  const existing = await findFile(name, parentId);
  const blob = new Blob([JSON.stringify(content)], { type: 'application/json' });

  if (existing) {
    // Update existing
    await fetch(`${UPLOAD_API}/${existing.id}?uploadType=media`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: blob,
    });
    return existing.id;
  } else {
    // Create new (Multipart to include metadata and content in one go)
    const metadata = {
      name,
      parents: [parentId],
      mimeType: 'application/json',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const resp = await fetch(`${UPLOAD_API}?uploadType=multipart`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await resp.json();
    return data.id;
  }
}

/**
 * Downloads and parses JSON content from a Drive file.
 */
export async function downloadJson<T>(fileId: string): Promise<T | null> {
  const token = await getAccessToken();
  const resp = await fetch(`${DRIVE_API}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!resp.ok) return null;
  return await resp.json();
}
