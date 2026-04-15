export type NoteType = 'text' | 'sketch' | 'image';

export interface Note {
  id: string;
  driveId?: string;
  title: string;
  content: string; // Markdown text, tldraw snapshot, or image Drive ID
  type: NoteType;
  tags: string[];
  group?: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export interface Revision {
  id: string;
  modifiedTime: string;
  lastModifyingUser?: {
    displayName: string;
    photoLink: string;
  };
}
