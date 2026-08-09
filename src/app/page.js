'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('Todos');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setProducts(data);
      }
    } catch (err) {
      console.error('Error cargando productos:', err);
    } finally {
      // OBLIGATORIO: Apaga el spinner aunque la DB esté vacía o dé error
      setLoading(false);
    }
  }

  const filtered = products.filter(p => {
    const matchesSearch = p.title?.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === 'Todos' || p.category === category;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="max-w-md mx-auto p-5 space-y-6">
      
      {/* Header con Isologo PyM y Nombre Pase y Mire */}
      <header className="flex justify-between items-center pt-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#E07A5F] to-[#F4A261] flex items-center justify-center text-white font-black text-lg shadow-[4px_6px_12px_rgba(224,122,95,0.4)]">
            PyM
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#3D405B]">Pase y Mire</h1>
            <p className="text-xs text-[#818C78] font-medium">El espacio más libre ✨</p>
          </div>
        </div>

        <button 
          onClick={() => alert('Función de publicar productos activa')}
          className="w-10 h-10 rounded-full bg-[#FAF6F0] shadow-[6px_6px_12px_rgba(210,190,175,0.5)] flex items-center justify-center text-[#E07A5F] font-bold text-xl active:scale-95 transition"
        >
          +
        </button>
      </header>

      {/* Buscador Arcilla */}
      <div className="relative">
        <input
          type="text"
          placeholder="¿Qué estás buscando?"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full clay-input text-[#3D405B] placeholder-[#A0A2B1] text-xs font-medium px-5 py-4 rounded-3xl focus:outline-none"
        />
        <span className="absolute right-4 top-3.5 text-lg">🔍</span>
      </div>

      {/* Categorías */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {['Todos', 'Vehículos', 'Inmuebles', 'Tecnología', 'Moda'].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              category === cat
                ? 'bg-[#E07A5F] text-white shadow-[0_6px_15px_rgba(224,122,95,0.4)]'
                : 'bg-[#FAF6F0] text-[#818C78] shadow-[4px_4px_8px_rgba(210,190,175,0.4)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Título de Sección */}
      <h2 className="text-lg font-extrabold text-[#3D405B]">Publicaciones</h2>

      {/* Catálogo */}
      {loading ? (
        <div className="text-center py-12 text-[#818C78] font-medium text-xs animate-pulse">
          Cargando catálogo de Pase y Mire...
        </div>
      ) : filtered.length === 0 ? (
        <div className="clay-card p-8 text-center text-[#818C78] text-xs font-medium">
          No hay publicaciones en esta categoría.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filtered.map((item) => (
            <div key={item.id} className="clay-card p-4 flex flex-col space-y-3 relative overflow-hidden">
              <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-[#EFE8DF] flex items-center justify-center">
                <img
                  src={item.images?.[0] || 'https://via.placeholder.com/400'}
                  alt={item.title}
                  className="w-full h-full object-cover rounded-2xl"
                />
                <span className="absolute top-3 left-3 bg-[#FAF6F0]/90 backdrop-blur-md text-[#E07A5F] text-[10px] font-black px-3 py-1 rounded-full border border-white/40">
                  {item.category || 'General'}
                </span>
              </div>

              <div className="flex justify-between items-end pt-1">
                <div>
                  <h3 className="font-extrabold text-sm text-[#3D405B]">{item.title}</h3>
                  <p className="text-xs text-[#818C78] line-clamp-1 mt-0.5">{item.description}</p>
                  <p className="text-lg font-black text-[#E07A5F] mt-1">${item.price}</p>
                </div>

                <button className="clay-button text-white font-bold text-xs px-5 py-2.5 rounded-full active:scale-95 transition">
                  AGREGAR
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
                                   }
    
