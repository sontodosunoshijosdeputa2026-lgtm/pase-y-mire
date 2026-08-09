'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Inicio', path: '/', icon: '🏠' },
    { name: 'Reels', path: '/reels', icon: '🎬' },
    { name: 'Chats', path: '/chat', icon: '💬' },
    { name: 'Billetera', path: '/wallet', icon: '💳' },
    { name: 'Perfil', path: '/profile', icon: '👤' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 py-2 px-3 flex justify-around items-center z-50 shadow-lg">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link
            key={item.path}
            href={item.path}
            className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all ${
              isActive ? 'text-purple-600 font-bold scale-105' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <span className="text-xl mb-0.5">{item.icon}</span>
            <span className="text-[10px]">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
