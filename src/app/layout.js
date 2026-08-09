import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900 antialiased min-h-screen">
        <Header />
        <main className="pb-16">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
