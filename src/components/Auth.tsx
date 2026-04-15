import React from 'react';
import { User } from '../types';
import { LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { getAuthUrl, logout } from '../lib/api';

interface AuthProps {
  user: User | null;
  onAuthChange: () => void;
}

export default function Auth({ user, onAuthChange }: AuthProps) {
  const handleLogin = async () => {
    const url = await getAuthUrl();
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const authWindow = window.open(
      url,
      'google_oauth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!authWindow) {
      alert("Please allow popups to sign in with Google.");
      return;
    }

    const checkWindow = setInterval(() => {
      if (authWindow.closed) {
        clearInterval(checkWindow);
        onAuthChange();
      }
    }, 1000);

    window.addEventListener('message', (event) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        clearInterval(checkWindow);
        // Small delay to ensure session is persisted
        setTimeout(() => {
          onAuthChange();
        }, 500);
      }
    }, { once: true });
  };

  const handleLogout = async () => {
    await logout();
    onAuthChange();
  };

  if (user) {
    return (
      <div className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/10">
        <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-white/20" referrerPolicy="no-referrer" />
        <div className="flex flex-col">
          <span className="text-xs font-bold truncate max-w-[100px]">{user.name}</span>
          <button onClick={handleLogout} className="text-[10px] text-white/40 hover:text-white flex items-center gap-1 transition-colors">
            <LogOut size={10} /> LOGOUT
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      className="flex items-center gap-2 bg-white text-black font-bold px-4 py-2 rounded hover:bg-neon transition-colors"
    >
      <LogIn size={18} /> SIGN IN WITH GOOGLE
    </button>
  );
}
