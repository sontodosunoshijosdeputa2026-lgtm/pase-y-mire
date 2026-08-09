'use client';

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24 p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Perfil de Usuario</h1>

      {/* Tarjeta del Usuario */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-purple-600 text-white text-2xl font-bold flex items-center justify-center shadow">
          U
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Usuario Verificado</h2>
          <p className="text-xs text-gray-500">Pase y Mire - Miembro Activo</p>
          <span className="inline-block mt-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            ✓ Cuenta Verificada
          </span>
        </div>
      </div>

      {/* Accesos de Gestión */}
      <div className="space-y-3">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center cursor-pointer hover:bg-gray-50">
          <span className="text-sm font-medium text-gray-800">📦 Mis Publicaciones</span>
          <span className="text-gray-400">➔</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center cursor-pointer hover:bg-gray-50">
          <span className="text-sm font-medium text-gray-800">📷 Escáner QR de Envíos</span>
          <span className="text-gray-400">➔</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center cursor-pointer hover:bg-gray-50">
          <span className="text-sm font-medium text-gray-800">⚙️ Configuración de Cuenta</span>
          <span className="text-gray-400">➔</span>
        </div>
      </div>
    </div>
  );
        }
        
