'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [qrToken, setQrToken] = useState('');
  const [shipmentResult, setShipmentResult] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user));
  }, []);

  async function verifyShipmentQR() {
    if (!qrToken.trim()) return alert('Ingresa o escanea el token del paquete.');

    setVerifying(true);
    const { data, error } = await supabase.rpc('verify_shipping_qr', {
      p_shipping_token: qrToken.trim()
    });
    setVerifying(false);

    if (error || !data?.success) {
      alert('Error de verificación: ' + (error?.message || data?.error || 'Token inválido'));
      setShipmentResult(null);
    } else {
      setShipmentResult(data);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Perfil de Usuario</h1>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-purple-600 text-white text-2xl font-bold flex items-center justify-center shadow">
          {user?.email?.slice(0, 1).toUpperCase() || 'U'}
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-900">{user?.email || 'Usuario Activo'}</h2>
          <span className="inline-block mt-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            ✓ Cuenta Verificada
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <button onClick={() => setShowScanner(true)} className="w-full bg-purple-600 text-white p-4 rounded-xl shadow-sm text-left flex justify-between items-center font-semibold text-sm">
          <span>📷 Lector de Logística y Envíos QR</span>
          <span>➔</span>
        </button>
      </div>

      {showScanner && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-xs shadow-2xl">
            <h3 className="font-bold text-base mb-2">Verificación de Paquete</h3>
            <p className="text-xs text-gray-500 mb-4">Ingresa o lee el Token ID codificado en el paquete:</p>

            <input
              type="text"
              placeholder="UUID del Token QR"
              value={qrToken}
              onChange={(e) => setQrToken(e.target.value)}
              className="w-full border p-2.5 rounded-xl text-xs mb-3 font-mono"
            />

            <button onClick={verifyShipmentQR} disabled={verifying} className="w-full bg-purple-600 text-white font-bold py-2.5 rounded-xl text-xs mb-3 disabled:opacity-50">
              {verifying ? 'Verificando en BD...' : 'Validar Dirección y Estado'}
            </button>

            {shipmentResult && (
              <div className="bg-gray-100 p-3 rounded-xl text-xs space-y-1 mb-3">
                <p className="font-bold text-green-700">✓ PAQUETE EN TRÁNSITO</p>
                <p><b>Destinatario:</b> {shipmentResult.delivery_recipient}</p>
                <p><b>Dirección:</b> {shipmentResult.delivery_address}</p>
              </div>
            )}

            <button onClick={() => { setShowScanner(false); setShipmentResult(null); }} className="w-full text-center text-xs text-gray-500 py-1">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
          }
          
