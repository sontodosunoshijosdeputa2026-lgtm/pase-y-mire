import React from 'react';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        {/* Logo con Iniciales LyM */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-700 to-indigo-500 text-white font-extrabold flex items-center justify-center text-base shadow-md tracking-wider">
          LyM
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-none">Pase y Mire</h1>
          <p className="text-[11px] text-gray-500 mt-0.5">Productos, servicios y comunidad</p>
        </div>
      </div>
    </header>
  );
        }
