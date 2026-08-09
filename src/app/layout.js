import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Pase y Mire',
  description: 'El espacio más libre',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-gray-100 text-gray-900 antialiased selection:bg-purple-500 selection:text-white">
        {/* Contenido principal */}
        <main className="min-h-screen pb-20">
          {children}
        </main>

        {/* Barra de Navegación Flotante Fija */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-xl max-w-md mx-auto">
          <div className="flex justify-around items-center h-16 px-2">
            <Link href="/" className="flex flex-col items-center justify-center text-gray-600 hover:text-purple-600 font-medium text-[11px] w-full py-1 transition-colors">
              <span className="text-xl mb-0.5">🏪</span>
              <span>Inicio</span>
            </Link>

            <Link href="/reels" className="flex flex-col items-center justify-center text-gray-600 hover:text-purple-600 font-medium text-[11px] w-full py-1 transition-colors">
              <span className="text-xl mb-0.5">🎬</span>
              <span>Reels</span>
            </Link>

            <Link href="/wallet" className="flex flex-col items-center justify-center text-gray-600 hover:text-purple-600 font-medium text-[11px] w-full py-1 transition-colors">
              <span className="text-xl mb-0.5">💳</span>
              <span>Billetera</span>
            </Link>

            <Link href="/profile" className="flex flex-col items-center justify-center text-gray-600 hover:text-purple-600 font-medium text-[11px] w-full py-1 transition-colors">
              <span className="text-xl mb-0.5">👤</span>
              <span>Perfil</span>
            </Link>
          </div>
        </nav>
      </body>
    </html>
  );
          }
          
