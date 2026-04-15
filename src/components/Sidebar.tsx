import React from 'react';
import { Note } from '../types';
import { Plus, Search, Tag, Folder, Image as ImageIcon, Type, PenTool } from 'lucide-react';

interface SidebarProps {
  notes: Note[];
  onAddNote: (type: 'text' | 'sketch' | 'image') => void;
  onSearch: (query: string) => void;
  onFilterTag: (tag: string | null) => void;
  onFilterGroup: (group: string | null) => void;
  selectedTag: string | null;
  selectedGroup: string | null;
}

export default function Sidebar({ 
  notes, 
  onAddNote, 
  onSearch, 
  onFilterTag, 
  onFilterGroup,
  selectedTag,
  selectedGroup
}: SidebarProps) {
  const tags = Array.from(new Set(notes.flatMap(n => n.tags)));
  const groups = Array.from(new Set(notes.map(n => n.group).filter(Boolean) as string[]));

  return (
    <div className="w-64 h-full bg-[#111] border-r border-white/10 flex flex-col p-4 gap-6 overflow-y-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Create</h2>
        <div className="grid grid-cols-3 gap-2">
          <button 
            onClick={() => onAddNote('text')}
            className="flex flex-col items-center justify-center gap-1 p-2 bg-white/5 rounded border border-white/10 hover:bg-white/10 transition-colors"
          >
            <Type size={16} />
            <span className="text-[8px] font-bold">TEXT</span>
          </button>
          <button 
            onClick={() => onAddNote('sketch')}
            className="flex flex-col items-center justify-center gap-1 p-2 bg-white/5 rounded border border-white/10 hover:bg-white/10 transition-colors"
          >
            <PenTool size={16} />
            <span className="text-[8px] font-bold">SKETCH</span>
          </button>
          <button 
            onClick={() => onAddNote('image')}
            className="flex flex-col items-center justify-center gap-1 p-2 bg-white/5 rounded border border-white/10 hover:bg-white/10 transition-colors"
          >
            <ImageIcon size={16} />
            <span className="text-[8px] font-bold">IMAGE</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Search</h2>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-white/20" size={14} />
          <input 
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Find notes..."
            className="w-full bg-white/5 border border-white/10 rounded px-8 py-1.5 text-xs outline-none focus:border-neon transition-colors"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Groups</h2>
        <div className="flex flex-col gap-1">
          <button 
            onClick={() => onFilterGroup(null)}
            className={`text-xs text-left px-2 py-1 rounded transition-colors ${!selectedGroup ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
          >
            All Notes
          </button>
          {groups.map(group => (
            <button 
              key={group}
              onClick={() => onFilterGroup(group)}
              className={`text-xs text-left px-2 py-1 rounded transition-colors flex items-center gap-2 ${selectedGroup === group ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
            >
              <Folder size={12} />
              {group}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Tags</h2>
        <div className="flex flex-wrap gap-1">
          {tags.map(tag => (
            <button 
              key={tag}
              onClick={() => onFilterTag(selectedTag === tag ? null : tag)}
              className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${selectedTag === tag ? 'bg-neon border-neon text-black' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
