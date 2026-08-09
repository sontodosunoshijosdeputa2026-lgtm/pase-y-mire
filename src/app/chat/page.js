'use client';
import { useState } from 'react';

export default function ChatPage() {
  const [tab, setTab] = useState('chats');

  return (
    <div className="min-h-screen bg-gray-50 pb-24 p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Comunicación</h1>

      {/* Selector de Pestañas */}
      <div className="flex bg-gray-200 p-1 rounded-xl mb-4 text-sm font-medium">
        <button
          onClick={() => setTab('chats')}
          className={`flex-1 py-2 rounded-lg transition ${tab === 'chats' ? 'bg-white shadow text-purple-700 font-bold' : 'text-gray-600'}`}
        >
          💬 Chats
        </button>
        <button
          onClick={() => setTab('calls')}
          className={`flex-1 py-2 rounded-lg transition ${tab === 'calls' ? 'bg-white shadow text-purple-700 font-bold' : 'text-gray-600'}`}
        >
          📞 Llamadas
        </button>
        <button
          onClick={() => setTab('contacts')}
          className={`flex-1 py-2 rounded-lg transition ${tab === 'contacts' ? 'bg-white shadow text-purple-700 font-bold' : 'text-gray-600'}`}
        >
          👥 Contactos
        </button>
      </div>

      {/* Contenido según pestaña */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 min-h-[300px]">
        {tab === 'chats' && (
          <p className="text-center text-gray-500 text-sm py-12">No tienes conversaciones activas actualmente.</p>
        )}
        {tab === 'calls' && (
          <p className="text-center text-gray-500 text-sm py-12">No hay registro de llamadas recientes.</p>
        )}
        {tab === 'contacts' && (
          <p className="text-center text-gray-500 text-sm py-12">Tu lista de contactos está vacía.</p>
        )}
      </div>
    </div>
  );
            }
