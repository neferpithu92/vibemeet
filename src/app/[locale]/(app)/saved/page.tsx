'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from '@/lib/i18n/navigation';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Bookmark, Search } from 'lucide-react';

interface SavedMedia {
  id: string;
  url: string;
  thumbnail_url?: string;
  type: string;
  caption: string;
}

export default function SavedPage() {
  const router = useRouter();
  const supabase = createClient();
  const [savedMedia, setSavedMedia] = useState<SavedMedia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSaved() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);

      const { data } = await supabase
        .from('saved_posts')
        .select(`
          post_id,
          media:post_id (id, url, thumbnail_url, type, caption)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (data) {
        setSavedMedia(data.map(d => {
          const m = Array.isArray(d.media) ? d.media[0] : d.media;
          return m;
        }).filter(Boolean));
      }
      setLoading(false);
    }
    fetchSaved();
  }, [supabase]);

  if (loading) return <div className="p-8 text-center text-vibe-text-secondary min-h-screen pt-32">Caricamento...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 mt-16 min-h-screen">
      <h1 className="text-3xl font-bold font-display text-white mb-2">Elementi Salvati</h1>
      <p className="text-vibe-text-secondary mb-8">I tuoi Vibe e post preferiti.</p>

      {savedMedia.length === 0 ? (
        <EmptyState 
          icon={Bookmark}
          title="Nessun elemento salvato"
          description="Inizia a salvare i tuoi post e Vibe preferiti per ritrovarli facilmente qui."
          actionLabel="Esplora Feed"
          onAction={() => router.push('/feed')}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {savedMedia.map((m, idx) => (
            <Card key={idx} className="aspect-[3/4] overflow-hidden relative group">
               {m.type === 'video' ? (
                 <video src={m.url} className="w-full h-full object-cover" />
               ) : (
                 <img src={m.url} alt="Saved media" className="w-full h-full object-cover" />
               )}
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                 <p className="text-white text-sm line-clamp-2">{m.caption}</p>
               </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
