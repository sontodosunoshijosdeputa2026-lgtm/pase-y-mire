'use client';
import { useState } from 'react';

export default function WalletPage() {
  const [wallet] = useState({
    balance: 0.00,
    card_number: '4500 8821 9012 3456',
    card_cvv: '882',
    card_expiry: '12/28'
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24 p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Billetera Virtual</h1>

      {/* Tarjeta Virtual ID de la Cuenta */}
      <div className="w-full h-52 bg-gradient-to-r from-purple-800 via-indigo-700 to-purple-600 rounded-2xl p-5 text-white shadow-xl flex flex-col justify-between relative overflow-hidden mb-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-purple-200 font-medium">Tarjeta ID - Pase y Mire</p>
            <p className="text-sm font-semibold tracking-wide">Credencial Digital</p>
          </div>
          <div className="text-lg font-black tracking-widest bg-white/20 px-2.5 py-0.5 rounded-md">LyM</div>
        </div>

        <div className="my-2">
          <p className="text-xs text-purple-200 mb-1">Número de Cuenta / ID</p>
          <p className="text-lg font-mono tracking-widest">{wallet.card_number}</p>
        </div>

        <div className="flex justify-between items-end text-xs">
          <div>
            <p className="text-purple-200">Vence</p>
            <p className="font-mono">{wallet.card_expiry}</p>
          </div>
          <div>
            <p className="text-purple-200">CVV</p>
            <p className="font-mono">{wallet.card_cvv}</p>
          </div>
          <div className="text-right">
            <span className="bg-green-400 text-green-950 font-bold px-2 py-0.5 rounded-full text-[10px]">ACTIVA</span>
          </div>
        </div>
      </div>

      {/* Saldo Disponible */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
        <p className="text-xs text-gray-500 font-medium">Saldo Disponible</p>
        <p className="text-3xl font-extrabold text-gray-900 mt-1">${wallet.balance.toFixed(2)}</p>
        
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button className="bg-purple-600 text-white font-medium py-2.5 rounded-xl hover:bg-purple-700 transition">
            + Ingresar Dinero
          </button>
          <button className="bg-gray-100 text-gray-800 font-medium py-2.5 rounded-xl hover:bg-gray-200 transition">
            ↗ Transferir
          </button>
        </div>
      </div>

      {/* Movimientos */}
      <h2 className="text-base font-bold text-gray-900 mb-3">Últimos Movimientos</h2>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center text-gray-500 text-sm py-8">
        No hay transacciones recientes registradas.
      </div>
    </div>
  );
        }
        
