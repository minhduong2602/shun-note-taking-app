import React, { useState, useEffect, useRef } from 'react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Note, User, Revision } from './types';
import { 
  getNotes, 
  createNote, 
  updateNote, 
  deleteNote, 
  getUser, 
  uploadImage,
  getHistory,
  getRevisionContent
} from './lib/api';
import NoteCard from './components/NoteCard';
import Sidebar from './components/Sidebar';
import Auth from './components/Auth';
import { motion, AnimatePresence } from 'motion/react';
import { X, History as HistoryIcon, Loader2, Plus } from 'lucide-react';

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [historyNote, setHistoryNote] = useState<Note | null>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const userData = await getUser();
    setUser(userData);
    if (userData) {
      const notesData = await getNotes();
      setNotes(notesData);
    }
    setLoading(false);
  };

  const handleAddNote = async (type: 'text' | 'sketch' | 'image') => {
    if (type === 'image') {
      fileInputRef.current?.click();
      return;
    }

    const newNote: Note = {
      id: Math.random().toString(36).substr(2, 9),
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      content: type === 'sketch' ? '{}' : '',
      type,
      tags: [],
      position: { x: 100, y: 100 },
      size: { width: 300, height: 300 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsSyncing(true);
    const driveId = await createNote(newNote);
    setNotes([...notes, { ...newNote, driveId }]);
    setIsSyncing(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSyncing(true);
    try {
      const { id } = await uploadImage(file);
      const newNote: Note = {
        id: Math.random().toString(36).substr(2, 9),
        title: file.name,
        content: id,
        type: 'image',
        tags: [],
        position: { x: 100, y: 100 },
        size: { width: 400, height: 400 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const driveId = await createNote(newNote);
      setNotes([...notes, { ...newNote, driveId }]);
    } catch (error) {
      console.error("Upload failed", error);
    }
    setIsSyncing(false);
  };

  const handleUpdateNote = async (updatedNote: Note) => {
    setNotes(notes.map(n => n.id === updatedNote.id ? updatedNote : n));
    if (updatedNote.driveId) {
      // Debounce this in a real app
      await updateNote(updatedNote.driveId, updatedNote);
    }
  };

  const handleDeleteNote = async (driveId: string) => {
    if (!confirm("Delete this note?")) return;
    setNotes(notes.filter(n => n.driveId !== driveId));
    await deleteNote(driveId);
  };

  const handleShowHistory = async (note: Note) => {
    setHistoryNote(note);
    const history = await getHistory(note.driveId!);
    setRevisions(history);
  };

  const handleRestoreRevision = async (revisionId: string) => {
    if (!historyNote) return;
    setIsSyncing(true);
    const restoredNote = await getRevisionContent(historyNote.driveId!, revisionId);
    await handleUpdateNote({ ...restoredNote, driveId: historyNote.driveId });
    setHistoryNote(null);
    setIsSyncing(false);
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !selectedTag || note.tags.includes(selectedTag);
    const matchesGroup = !selectedGroup || note.group === selectedGroup;
    return matchesSearch && matchesTag && matchesGroup;
  });

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-4 bg-[#0a0a0a]">
        <Loader2 className="animate-spin text-neon" size={48} />
        <span className="text-white/40 font-mono text-sm tracking-widest">INITIALIZING STUDIO...</span>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex bg-[#0a0a0a] text-white">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        className="hidden" 
        accept="image/*"
      />

      {/* Sidebar */}
      <Sidebar 
        notes={notes}
        onAddNote={handleAddNote}
        onSearch={setSearchQuery}
        onFilterTag={setSelectedTag}
        onFilterGroup={setSelectedGroup}
        selectedTag={selectedTag}
        selectedGroup={selectedGroup}
      />

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-6 z-20 pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
            <h1 className="text-2xl font-black tracking-tighter italic">STUDIO<span className="text-neon">NOTE</span></h1>
            {isSyncing && (
              <div className="flex items-center gap-2 bg-neon/10 border border-neon/20 px-3 py-1 rounded-full">
                <Loader2 className="animate-spin text-neon" size={12} />
                <span className="text-[10px] font-bold text-neon uppercase tracking-widest">Syncing to Drive</span>
              </div>
            )}
          </div>
          <div className="pointer-events-auto">
            <Auth user={user} onAuthChange={fetchInitialData} />
          </div>
        </div>

        {!user ? (
          <div className="h-full w-full flex flex-col items-center justify-center gap-6 p-12 text-center">
            <div className="max-w-md flex flex-col gap-4">
              <h2 className="text-5xl font-black italic tracking-tighter">YOUR CREATIVE CANVAS, <span className="text-neon">SYNCED.</span></h2>
              <p className="text-white/40 text-sm leading-relaxed">
                A spatial note-taking tool designed for graphic designers. 
                Store your sketches, images, and ideas directly in your Google Drive.
              </p>
              <div className="flex justify-center mt-4">
                <Auth user={user} onAuthChange={fetchInitialData} />
              </div>
            </div>
          </div>
        ) : (
          <TransformWrapper
            initialScale={1}
            minScale={0.1}
            maxScale={2}
            limitToBounds={false}
            centerOnInit={false}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-20">
                  <button onClick={() => zoomIn()} className="w-10 h-10 bg-white/5 border border-white/10 rounded flex items-center justify-center hover:bg-white/10 transition-colors">+</button>
                  <button onClick={() => zoomOut()} className="w-10 h-10 bg-white/5 border border-white/10 rounded flex items-center justify-center hover:bg-white/10 transition-colors">-</button>
                  <button onClick={() => resetTransform()} className="w-10 h-10 bg-white/5 border border-white/10 rounded flex items-center justify-center hover:bg-white/10 transition-colors">⟲</button>
                </div>

                <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                  <div className="w-[5000px] h-[5000px] relative bg-[#0a0a0a] bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:40px_40px]">
                    {filteredNotes.map(note => (
                      <NoteCard 
                        key={note.id} 
                        note={note} 
                        onUpdate={handleUpdateNote}
                        onDelete={handleDeleteNote}
                        onShowHistory={handleShowHistory}
                      />
                    ))}
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        )}
      </div>

      {/* History Modal */}
      <AnimatePresence>
        {historyNote && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#1a1a1a] brutal-border w-full max-w-2xl max-h-[80vh] flex flex-col"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <HistoryIcon className="text-neon" size={20} />
                  <h3 className="font-bold">Version History: {historyNote.title}</h3>
                </div>
                <button onClick={() => setHistoryNote(null)} className="p-1 hover:bg-white/10 rounded transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {revisions.map((rev, i) => (
                  <div key={rev.id} className="bg-white/5 p-4 rounded border border-white/10 flex items-center justify-between hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-neon/20 rounded-full flex items-center justify-center text-neon font-bold text-xs">
                        {revisions.length - i}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{new Date(rev.modifiedTime).toLocaleString()}</span>
                        <span className="text-[10px] text-white/40 uppercase tracking-widest">
                          {rev.lastModifyingUser?.displayName || 'Unknown User'}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRestoreRevision(rev.id)}
                      className="bg-white text-black text-[10px] font-bold px-3 py-1.5 rounded hover:bg-neon transition-colors"
                    >
                      RESTORE THIS VERSION
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
