import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Pase y Mire',
  description: 'El espacio más libre',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-[#F5EFE6] text-[#3D405B] antialiased">
        <main className="min-h-screen pb-28">{children}</main>

        {/* Menú de Solapas Flotante Fijo */}
        <nav className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
          <div className="bg-[#FAF6F0]/90 backdrop-blur-xl border border-white/60 rounded-full px-5 py-2.5 shadow-[0_10px_30px_rgba(180,150,130,0.3)] flex justify-between items-center">
            
            <Link href="/" className="flex flex-col items-center text-[#E07A5F] hover:scale-105 transition">
              <span className="text-xl">🏪</span>
              <span className="text-[10px] font-bold mt-0.5">Inicio</span>
            </Link>

            <Link href="/reels" className="flex flex-col items-center text-[#818C78] hover:text-[#E07A5F] hover:scale-105 transition">
              <span className="text-xl">🎬</span>
              <span className="text-[10px] font-bold mt-0.5">Reels</span>
            </Link>

            <Link href="/wallet" className="flex flex-col items-center text-[#818C78] hover:text-[#E07A5F] hover:scale-105 transition">
              <span className="text-xl">💳</span>
              <span className="text-[10px] font-bold mt-0.5">Billetera</span>
            </Link>

            <Link href="/chat" className="flex flex-col items-center text-[#818C78] hover:text-[#E07A5F] hover:scale-105 transition">
              <span className="text-xl">💬</span>
              <span className="text-[10px] font-bold mt-0.5">Chat</span>
            </Link>

            <Link href="/profile" className="flex flex-col items-center text-[#818C78] hover:text-[#E07A5F] hover:scale-105 transition">
              <span className="text-xl">👤</span>
              <span className="text-[10px] font-bold mt-0.5">Perfil</span>
            </Link>

          </div>
        </nav>
      </body>
    </html>
  );
          }
          
