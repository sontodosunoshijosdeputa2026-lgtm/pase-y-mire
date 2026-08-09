'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function WalletPage() {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [amountInput, setAmountInput] = useState('');
  const [transferEmail, setTransferEmail] = useState('');
  const [modalType, setModalType] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  async function loadWalletData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUser(user);

    const { data: w } = await supabase.from('wallets').select('*').eq('user_id', user.id).single();
    setWallet(w);

    if (w) {
      const { data: txs } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', w.id)
        .order('created_at', { ascending: false });
      setTransactions(txs || []);
    }
    setLoading(false);
  }

  async function handleDeposit() {
    const val = parseFloat(amountInput);
    if (isNaN(val) || val <= 0) return alert('Ingresa un monto válido.');

    setProcessing(true);
    const { data, error } = await supabase.rpc('deposit_wallet_funds', { p_amount: val });
    setProcessing(false);

    if (error) {
      alert('Error al depositar: ' + error.message);
    } else {
      setAmountInput('');
      setModalType(null);
      loadWalletData();
    }
  }

  async function handleTransfer() {
    const val = parseFloat(amountInput);
    if (isNaN(val) || val <= 0) return alert('Ingresa un monto válido.');
    if (!transferEmail.trim()) return alert('Ingresa un email de destino.');

    setProcessing(true);
    const { data, error } = await supabase.rpc('transfer_wallet_funds', {
      p_recipient_email: transferEmail.trim().toLowerCase(),
      p_amount: val
    });
    setProcessing(false);

    if (error) {
      alert('Error en la transferencia: ' + error.message);
    } else {
      setAmountInput('');
      setTransferEmail('');
      setModalType(null);
      loadWalletData();
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Cargando Billetera...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Billetera Virtual</h1>

      <div className="w-full h-52 bg-gradient-to-r from-purple-800 via-indigo-700 to-purple-600 rounded-2xl p-5 text-white shadow-xl flex flex-col justify-between relative overflow-hidden mb-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-purple-200 font-medium">Tarjeta ID - Pase y Mire</p>
            <p className="text-sm font-semibold tracking-wide truncate max-w-[200px]">{user?.email || 'Credencial Digital'}</p>
          </div>
          <div className="text-lg font-black tracking-widest bg-white/20 px-2.5 py-0.5 rounded-md">LyM</div>
        </div>

        <div className="my-2">
          <p className="text-xs text-purple-200 mb-1">Número de Cuenta / ID</p>
          <p className="text-lg font-mono tracking-widest">{wallet?.card_number || '4500 0000 0000 0000'}</p>
        </div>

        <div className="flex justify-between items-end text-xs">
          <div>
            <p className="text-purple-200">Vence</p>
            <p className="font-mono">{wallet?.card_expiry || '12/28'}</p>
          </div>
          <div>
            <p className="text-purple-200">CVV</p>
            <p className="font-mono">{wallet?.card_cvv || '882'}</p>
          </div>
          <div className="text-right">
            <span className="bg-green-400 text-green-950 font-bold px-2 py-0.5 rounded-full text-[10px]">ACTIVA</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
        <p className="text-xs text-gray-500 font-medium">Saldo Disponible</p>
        <p className="text-3xl font-extrabold text-gray-900 mt-1">${(wallet?.balance || 0).toFixed(2)}</p>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <button onClick={() => setModalType('deposit')} className="bg-purple-600 text-white font-medium py-2.5 rounded-xl hover:bg-purple-700 transition text-sm">
            + Ingresar Dinero
          </button>
          <button onClick={() => setModalType('transfer')} className="bg-gray-100 text-gray-800 font-medium py-2.5 rounded-xl hover:bg-gray-200 transition text-sm">
            ↗ Transferir
          </button>
        </div>
      </div>

      {modalType && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-xs shadow-2xl">
            <h3 className="font-bold text-lg mb-3">
              {modalType === 'deposit' ? 'Ingresar Dinero' : 'Transferir Dinero'}
            </h3>

            {modalType === 'transfer' && (
              <input
                type="email"
                placeholder="Email del destinatario"
                value={transferEmail}
                onChange={(e) => setTransferEmail(e.target.value)}
                className="w-full border p-2.5 rounded-xl text-xs mb-3"
              />
            )}

            <input
              type="number"
              placeholder="Monto ($)"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-full border p-2.5 rounded-xl text-xs mb-4"
            />

            <div className="flex justify-end gap-2">
              <button onClick={() => setModalType(null)} disabled={processing} className="px-3 py-2 text-xs text-gray-500">Cancelar</button>
              <button
                onClick={modalType === 'deposit' ? handleDeposit : handleTransfer}
                disabled={processing}
                className="bg-purple-600 text-white text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-50"
              >
                {processing ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-base font-bold text-gray-900 mb-3">Últimos Movimientos</h2>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        {transactions.length === 0 ? (
          <p className="text-center text-gray-500 text-xs py-4">No hay transacciones registradas.</p>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="flex justify-between items-center text-xs border-b pb-2 last:border-0">
              <div>
                <p className="font-semibold text-gray-800">{tx.description}</p>
                <p className="text-[10px] text-gray-400">{new Date(tx.created_at).toLocaleString()}</p>
              </div>
              <span className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {tx.amount > 0 ? `+$${tx.amount.toFixed(2)}` : `-$${Math.abs(tx.amount).toFixed(2)}`}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
  }
               
