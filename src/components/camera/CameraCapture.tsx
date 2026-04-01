'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface CameraCaptureProps {
  onCapture: (url: string, type: 'photo' | 'video') => void;
  onClose: () => void;
  mode?: 'photo' | 'video' | 'both';
}

export default function CameraCapture({ 
  onCapture, 
  onClose,
  mode = 'both'
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(
    'environment'
  );
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'photo' | 'video'>('photo');
  const [isUploading, setIsUploading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 }
        },
        audio: mode !== 'photo'
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error('Camera error:', err);
    }
  }, [facingMode, mode]);

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [facingMode]);

  // Take photo
  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPreview(dataUrl);
    setPreviewType('photo');
  };

  // Start recording
  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    
    // Check supported types
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setPreview(url);
      setPreviewType('video');
    };
    mediaRecorderRef.current = recorder;
    recorder.start(100);
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= 60) {
          stopRecording();
          return 60;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Upload and confirm
  const handleConfirm = async () => {
    if (!preview) return;
    setIsUploading(true);

    try {
      let blob: Blob;
      let fileName: string;
      let contentType: string;

      if (previewType === 'photo') {
        const res = await fetch(preview);
        blob = await res.blob();
        fileName = `${Date.now()}.jpg`;
        contentType = 'image/jpeg';
      } else {
        const res = await fetch(preview);
        blob = await res.blob();
        fileName = `${Date.now()}.webm`;
        contentType = 'video/webm';
      }

      const formData = new FormData();
      formData.append('file', blob, fileName);
      formData.append('bucket', 'media');

      const uploadRes = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      });

      const result = await uploadRes.json();
      if (result.data?.url) {
        onCapture(result.data.url, previewType);
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      {/* Preview or Live camera */}
      {preview ? (
        <div className="flex-1 relative">
          {previewType === 'photo' ? (
            <img src={preview} 
                 className="w-full h-full object-contain" 
                 alt="Preview" />
          ) : (
            <video src={preview} 
                   className="w-full h-full object-contain"
                   controls 
                   autoPlay />
          )}
        </div>
      ) : (
        <div className="flex-1 relative overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ transform: facingMode === 'user' 
              ? 'scaleX(-1)' : 'none' }}
          />
          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2
                            flex items-center gap-2 bg-black/60 
                            rounded-full px-4 py-2">
              <div className="w-3 h-3 rounded-full bg-red-500 
                              animate-pulse" />
              <span className="text-white font-mono text-sm">
                {recordingTime}s / 60s
              </span>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="bg-black p-6 safe-area-bottom">
        {preview ? (
          /* Preview controls */
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPreview(null)}
              className="w-14 h-14 rounded-full bg-white/20 
                         flex items-center justify-center text-white 
                         text-xl"
            >
              ✕
            </button>
            <button
              onClick={handleConfirm}
              disabled={isUploading}
              className="w-20 h-20 rounded-full bg-vibe-purple 
                         flex items-center justify-center text-white 
                         text-2xl disabled:opacity-50"
            >
              {isUploading ? '...' : '✓'}
            </button>
            <div className="w-14" />
          </div>
        ) : (
          /* Camera controls */
          <div className="flex items-center justify-between">
            {/* Close */}
            <button
              onClick={onClose}
              className="w-12 h-12 rounded-full bg-white/20 
                         flex items-center justify-center text-white"
            >
              ✕
            </button>

            {/* Shutter */}
            <button
              onTouchStart={mode !== 'photo' ? startRecording : undefined}
              onTouchEnd={mode !== 'photo' && isRecording 
                ? stopRecording : undefined}
              onClick={mode === 'photo' ? takePhoto : undefined}
              onMouseDown={mode !== 'photo' ? startRecording : undefined}
              onMouseUp={mode !== 'photo' && isRecording ? stopRecording : undefined}
              className={`w-20 h-20 rounded-full border-4 
                          border-white flex items-center 
                          justify-center transition-all ${
                isRecording 
                  ? 'bg-red-500 scale-90' 
                  : 'bg-white/20 active:scale-90 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
              }`}
            >
              {isRecording ? (
                <div className="w-6 h-6 bg-white rounded" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-white" />
              )}
            </button>

            {/* Flip camera */}
            <button
              onClick={() => setFacingMode(prev => 
                prev === 'user' ? 'environment' : 'user')}
              className="w-12 h-12 rounded-full bg-white/20 
                         flex items-center justify-center 
                         text-white text-xl"
            >
              🔄
            </button>
          </div>
        )}

        {/* Mode hint */}
        {!preview && mode === 'both' && !isRecording && (
          <p className="text-white/50 text-xs text-center mt-3">
            Tocca per foto • Tieni premuto per video
          </p>
        )}
      </div>
    </div>
  );
}
