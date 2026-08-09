'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ReelsPage() {
  const [reels, setReels] = useState([]);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    loadReels();
  }, []);

  async function loadReels() {
    const { data } = await supabase.from('reels').select('*').order('created_at', { ascending: false });
    setReels(data || []);
  }

  async function handleUpload() {
    if (!file) return alert('Selecciona un archivo de video');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert('Debes iniciar sesión para publicar');

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: storageError } = await supabase.storage
      .from('reels')
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (storageError) {
      setUploading(false);
      return alert('Error al subir video: ' + storageError.message);
    }

    const { data: publicUrlData } = supabase.storage.from('reels').getPublicUrl(filePath);

    await supabase.from('reels').insert([{
      user_id: user.id,
      video_url: publicUrlData.publicUrl,
      caption: caption
    }]);

    setUploading(false);
    setFile(null);
    setCaption('');
    setShowUpload(false);
    loadReels();
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24 max-w-md mx-auto relative flex flex-col justify-between p-4">
      <div className="flex justify-between items-center my-2">
        <h2 className="text-xl font-bold">🎬 Reels Comunidad</h2>
        <button onClick={() => setShowUpload(true)} className="bg-purple-600 text-xs font-bold px-3 py-2 rounded-xl">+ Subir Video</button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 my-auto">
        {reels.length === 0 ? (
          <div className="text-center text-gray-400 py-16 text-xs">No hay videos disponibles en este momento.</div>
        ) : (
          reels.map((r) => (
            <div key={r.id} className="bg-gray-900 rounded-2xl overflow-hidden p-3 border border-gray-800">
              <video src={r.video_url} controls className="w-full h-80 object-cover rounded-xl mb-2" />
              <p className="text-xs font-medium text-gray-200">{r.caption}</p>
            </div>
          ))
        )}
      </div>

      {showUpload && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 text-white rounded-2xl p-5 w-full max-w-xs border border-gray-700">
            <h3 className="font-bold text-sm mb-3">Subir Video desde el Dispositivo</h3>
            
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full bg-gray-800 border border-gray-700 p-2 rounded-xl text-xs mb-3 text-white"
            />
            
            <input
              type="text"
              placeholder="Descripción / Título"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 p-2 rounded-xl text-xs mb-4 text-white"
            />
            
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowUpload(false)} disabled={uploading} className="text-xs text-gray-400">Cancelar</button>
              <button onClick={handleUpload} disabled={uploading} className="bg-purple-600 text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-50">
                {uploading ? 'Subiendo...' : 'Publicar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
