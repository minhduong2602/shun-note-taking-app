import { Note, User, Revision } from "../types";

export async function getAuthUrl(): Promise<string> {
  const res = await fetch("/api/auth/url");
  const data = await res.json();
  return data.url;
}

export async function getUser(): Promise<User | null> {
  const res = await fetch("/api/user");
  if (!res.ok) return null;
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch("/api/logout", { method: "POST" });
}

export async function getNotes(): Promise<Note[]> {
  const res = await fetch("/api/notes");
  if (!res.ok) return [];
  return res.json();
}

export async function createNote(note: Note): Promise<string> {
  const res = await fetch("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note),
  });
  const data = await res.json();
  return data.driveId;
}

export async function updateNote(driveId: string, note: Note): Promise<void> {
  await fetch(`/api/notes/${driveId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note),
  });
}

export async function deleteNote(driveId: string): Promise<void> {
  await fetch(`/api/notes/${driveId}`, { method: "DELETE" });
}

export async function getHistory(driveId: string): Promise<Revision[]> {
  const res = await fetch(`/api/notes/${driveId}/history`);
  if (!res.ok) return [];
  return res.json();
}

export async function getRevisionContent(driveId: string, revisionId: string): Promise<Note> {
  const res = await fetch(`/api/notes/${driveId}/history/${revisionId}`);
  return res.json();
}

export async function uploadImage(file: File): Promise<{ id: string; link: string }> {
  const reader = new FileReader();
  const data = await new Promise<string>((resolve) => {
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: file.name,
      type: file.type,
      data,
    }),
  });
  return res.json();
}
