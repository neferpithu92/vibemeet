'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { X, Check, Upload, AlertTriangle } from 'lucide-react';

interface AvatarCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAvatarUpdated: (url: string) => void;
  currentAvatarUrl?: string | null;
}

export default function AvatarCropperModal({ 
  isOpen, 
  onClose, 
  onAvatarUpdated,
  currentAvatarUrl 
}: AvatarCropperModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  
  // Implements System 10 - Modal Behavior (Lock background scroll, handle back button)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Handle back button
      window.history.pushState({ modal: true }, '');
      const handlePopState = () => onClose();
      window.addEventListener('popstate', handlePopState);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('popstate', handlePopState);
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl as string);
      setZoom(1);
      setError('');
    }
  };

  const readFile = (file: File) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result), false);
      reader.readAsDataURL(file);
    });
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: any) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    canvas.width = 250;
    canvas.height = 250;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      250,
      250
    );

    return new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  };

  const saveAvatar = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    
    setIsUploading(true);
    setError('');

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error('Not authenticated');

      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedBlob) throw new Error('Failed to create cropped image');

      const fileName = `${session.user.id}/avatar-${Date.now()}.jpg`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, {
           contentType: 'image/jpeg',
           upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      
      // Save instantly to profiles
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrlData.publicUrl })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      onAvatarUpdated(publicUrlData.publicUrl);
      setImageSrc(null);
      if (window.history.state?.modal) {
         window.history.back(); // Trigger popstate
      } else {
         onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload avatar');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-vibe-dark border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()} // trap focus/clicks
      >
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h2 className="font-display font-bold text-lg">Update Avatar</h2>
          <button 
            onClick={() => {
              if (window.history.state?.modal) window.history.back();
              else onClose();
            }}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            disabled={isUploading}
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        <div className="p-4 flex-1 flex flex-col">
          {!imageSrc ? (
            <div 
              className="flex-1 min-h-[300px] border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 hover:border-vibe-purple transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
               {currentAvatarUrl ? (
                 <img src={currentAvatarUrl} alt="Current" className="w-24 h-24 rounded-full opacity-50 mb-4" />
               ) : (
                 <div className="w-16 h-16 rounded-full bg-vibe-purple/20 flex items-center justify-center mb-4">
                   <Upload className="w-8 h-8 text-vibe-purple" />
                 </div>
               )}
               <p className="font-medium text-sm text-center px-4">Tap to upload a new profile picture</p>
               <input 
                 type="file" 
                 ref={fileInputRef} 
                 onChange={handleFileChange} 
                 accept="image/*" 
                 className="hidden" 
               />
            </div>
          ) : (
             <div className="relative w-full h-[300px] bg-black rounded-xl overflow-hidden">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
             </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <div className="mt-6 flex gap-3">
             {imageSrc && (
               <Button 
                 variant="secondary" 
                 className="flex-1" 
                 onClick={() => setImageSrc(null)}
                 disabled={isUploading}
               >
                 Cancel
               </Button>
             )}
             <Button 
               variant="primary" 
               className="flex-1 font-bold"
               onClick={imageSrc ? saveAvatar : () => fileInputRef.current?.click()}
               disabled={isUploading}
             >
               {isUploading ? (
                 <span className="flex items-center gap-2 animate-pulse">
                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                   Saving...
                 </span>
               ) : imageSrc ? (
                 <span className="flex items-center gap-2">
                   <Check className="w-4 h-4" /> Save Avatar
                 </span>
               ) : (
                 'Choose Image'
               )}
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
