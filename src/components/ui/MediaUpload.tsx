'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { RefreshCcw, AlertTriangle, CheckCircle, UploadCloud } from 'lucide-react';

interface MediaUploadProps {
  onUploadComplete: (url: string, file?: File) => void;
  bucket: 'media' | 'stories' | 'avatars' | 'events';
  label?: string;
  aspectRatio?: 'square' | 'video' | 'any';
}

/**
 * Highly reliable upload component with real progress, offline handling, and retries.
 * Implements Critical System 6.
 */
export default function MediaUpload({ 
  onUploadComplete, 
  bucket, 
  label = 'Upload Media',
  aspectRatio = 'any'
}: MediaUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreview(url);
      setStatus('idle');
      setProgress(0);
      
      // Auto-start upload per requirements: "Start immediately"
      startUpload(selectedFile);
    }
  };

  const startUpload = async (fileToUpload: File) => {
    if (isOffline) {
      setStatus('error');
      setErrorMessage('Network disconnected. Wait for connection.');
      return;
    }

    setStatus('uploading');
    setProgress(0);
    setErrorMessage('');

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('User not authenticated');
      }

      // We use XHR to get precise byte-level progress
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${session.user.id}/${crypto.randomUUID()}.${fileExt}`;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setProgress(percentComplete);
        }
      };

      xhr.open('POST', `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${fileName}`);
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
      xhr.setRequestHeader('apikey', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Success
          setProgress(100);
          const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
          
          setStatus('success');
          setTimeout(() => {
            onUploadComplete(data.publicUrl, fileToUpload);
          }, 1000); // Give user a moment to see 100%
        } else {
          // Failure
          setStatus('error');
          setErrorMessage(`Upload failed: ${xhr.statusText}`);
        }
      };

      xhr.onerror = () => {
        setStatus('error');
        setErrorMessage('Network error during upload.');
      };

      xhr.send(fileToUpload);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Error initializing upload');
    }
  };

  const retryUpload = () => {
    if (file) startUpload(file);
  };

  const ratioClass = aspectRatio === 'square' ? 'aspect-square' : 
                     aspectRatio === 'video' ? 'aspect-[9/16]' : 'aspect-video';

  return (
    <div className="space-y-4">
      <div 
        onClick={() => status === 'idle' && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (status === 'idle') setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
          if (status !== 'idle') return;
          const droppedFile = e.dataTransfer.files?.[0];
          if (droppedFile && (droppedFile.type.startsWith('image/') || droppedFile.type.startsWith('video/'))) {
            setFile(droppedFile);
            setPreview(URL.createObjectURL(droppedFile));
            setStatus('idle');
            setProgress(0);
            startUpload(droppedFile);
          }
        }}
        className={`relative ${ratioClass} w-full rounded-2xl border-2 border-dashed ${isDragging ? 'border-vibe-purple bg-vibe-purple/10' : 'border-white/10 bg-white/5'} flex flex-col items-center justify-center transition-all overflow-hidden group ${status === 'idle' ? 'cursor-pointer hover:bg-white/10' : ''}`}
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
              <UploadCloud className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-vibe-text-secondary mt-1">PNG, JPG or MP4 (max 10MB)</p>
          </div>
        )}
        
        {preview && status === 'idle' && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-white text-sm font-bold">Change File</span>
          </div>
        )}

        {status === 'uploading' && (
          <div className="absolute inset-0 bg-vibe-dark/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 transition-all">
            <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden mb-2 relative">
              <div 
                className="h-full bg-vibe-gradient-yellow-orange transition-all duration-300 relative" 
                style={{ width: `${progress}%` }}
              >
                {/* Micro-animation for progress bar */}
                <div className="absolute top-0 left-0 bottom-0 right-0 bg-white/20 animate-pulse" />
              </div>
            </div>
            <p className="text-sm font-bold text-white z-10">{progress}% Uploaded</p>
          </div>
        )}

        {status === 'success' && (
          <div className="absolute inset-0 bg-green-500/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
            <CheckCircle className="w-12 h-12 text-white mb-2" />
            <p className="text-sm font-bold text-white">Upload Complete!</p>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 bg-red-500/80 backdrop-blur-sm flex flex-col items-center justify-center p-6">
            <AlertTriangle className="w-10 h-10 text-white mb-2" />
            <p className="text-sm font-bold text-white text-center mb-4">{errorMessage}</p>
            <Button onClick={retryUpload} variant="outline" className="gap-2 bg-white/10 hover:bg-white/20 border-white/20 text-white">
              <RefreshCcw className="w-4 h-4" />
              Retry Upload
            </Button>
          </div>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,video/*"
        capture="environment" // Hint for mobile devices to prefer camera
        className="hidden"
      />
    </div>
  );
}
