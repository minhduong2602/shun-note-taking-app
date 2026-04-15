import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Tldraw, createShapeId, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { Note } from '../types';
import { Trash2, History, Tag, Maximize2, Minimize2, Edit3, Save } from 'lucide-react';
import { motion } from 'motion/react';
import Draggable from 'react-draggable';

interface NoteCardProps {
  note: Note;
  onUpdate: (note: Note) => void;
  onDelete: (id: string) => void;
  onShowHistory: (note: Note) => void;
}

export default function NoteCard({ note, onUpdate, onDelete, onShowHistory }: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(note.content);
  const [title, setTitle] = useState(note.title);

  const handleSave = () => {
    onUpdate({ ...note, content, title, updatedAt: new Date().toISOString() });
    setIsEditing(false);
  };

  const handleTldrawMount = (editor: Editor) => {
    if (note.type === 'sketch' && note.content) {
      try {
        const snapshot = JSON.parse(note.content);
        editor.loadSnapshot(snapshot);
      } catch (e) {
        console.error("Failed to load sketch snapshot", e);
      }
    }

    editor.on('change', () => {
      // Debounce this in a real app
      const snapshot = editor.getSnapshot();
      onUpdate({ ...note, content: JSON.stringify(snapshot), updatedAt: new Date().toISOString() });
    });
  };

  return (
    <Draggable
      defaultPosition={note.position}
      onStop={(e, data) => onUpdate({ ...note, position: { x: data.x, y: data.y } })}
      handle=".drag-handle"
    >
      <motion.div
        layout
        className="absolute bg-[#1a1a1a] brutal-border overflow-hidden flex flex-col"
        style={{ width: note.size.width, height: note.size.height }}
      >
        {/* Header */}
        <div className="drag-handle h-10 bg-white/5 border-b border-white/10 flex items-center justify-between px-3 cursor-move">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-transparent border-none outline-none text-sm font-bold text-white w-32"
                autoFocus
              />
            ) : (
              <span className="text-sm font-bold truncate max-w-[150px]">{note.title}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onShowHistory(note)} className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors">
              <History size={14} />
            </button>
            <button onClick={() => setIsEditing(!isEditing)} className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors">
              <Edit3 size={14} />
            </button>
            <button onClick={() => onDelete(note.driveId!)} className="p-1 hover:bg-white/10 rounded text-red-500/60 hover:text-red-500 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 relative">
          {note.type === 'text' && (
            isEditing ? (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-full bg-transparent border-none outline-none resize-none text-sm font-mono"
              />
            ) : (
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{note.content}</ReactMarkdown>
              </div>
            )
          )}

          {note.type === 'sketch' && (
            <div className="absolute inset-0 tldraw-container pointer-events-auto">
              <Tldraw onMount={handleTldrawMount} hideUi />
            </div>
          )}

          {note.type === 'image' && (
            <div className="w-full h-full flex items-center justify-center">
               <img 
                src={`https://drive.google.com/uc?id=${note.content}`} 
                alt={note.title} 
                className="max-w-full max-h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-8 bg-white/5 border-t border-white/10 flex items-center justify-between px-3">
          <div className="flex items-center gap-1">
            {note.tags.map(tag => (
              <span key={tag} className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/60">#{tag}</span>
            ))}
          </div>
          {isEditing && (
            <button onClick={handleSave} className="flex items-center gap-1 text-[10px] bg-neon text-black font-bold px-2 py-0.5 rounded">
              <Save size={10} /> SAVE
            </button>
          )}
        </div>
      </motion.div>
    </Draggable>
  );
}
