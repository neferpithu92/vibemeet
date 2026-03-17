'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';

interface MediaUploadProps {
  onUploadComplete: (url: string, file: File) => void;
  bucket: 'media' | 'stories';
  label?: string;
  aspectRatio?: 'square' | 'video' | 'any';
}

/**
 * Componente per il caricamento di file media con anteprima.
 */
export default function MediaUpload({ 
  onUploadComplete, 
  bucket, 
  label = 'Carica Foto o Video',
  aspectRatio = 'any'
}: MediaUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreview(url);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setProgress(10); // Inizio simulato

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);

    try {
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        setProgress(100);
        onUploadComplete(result.data.url || result.data.media_url, file);
      } else {
        console.error('Upload failed');
      }
    } catch (err) {
      console.error('Error uploading:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const ratioClass = aspectRatio === 'square' ? 'aspect-square' : aspectRatio === 'video' ? 'aspect-[9/16]' : 'aspect-video';

  return (
    <div className="space-y-4">
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`relative ${ratioClass} w-full rounded-2xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-all overflow-hidden group`}
      >
        {preview ? (
          file?.type.startsWith('video') ? (
            <video src={preview} className="w-full h-full object-cover" />
          ) : (
            <img src={preview} alt="Anteprima" className="w-full h-full object-cover" />
          )
        ) : (
          <div className="text-center p-6">
            <div className="w-12 h-12 rounded-full bg-vibe-purple/20 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">📸</span>
            </div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-vibe-text-secondary mt-1">PNG, JPG o MP4 (max 10MB)</p>
          </div>
        )}
        
        {preview && !isUploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-white text-sm font-bold">Cambia File</span>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-vibe-dark/80 backdrop-blur-sm flex flex-col items-center justify-center p-6">
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-vibe-purple transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm font-bold animate-pulse">Caricamento in corso...</p>
          </div>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,video/*"
        className="hidden"
      />

      {file && !isUploading && progress < 100 && (
        <Button 
          variant="primary" 
          className="w-full"
          onClick={handleUpload}
        >
          Conferma Caricamento
        </Button>
      )}
    </div>
  );
}
