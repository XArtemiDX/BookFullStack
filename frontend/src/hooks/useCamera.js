import { useState, useRef, useEffect, useCallback } from 'react';

export const useCamera = (onCapture, onError) => {
  const videoRef = useRef(null);
  const [mediaStream, setMediaStream] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const stopCamera = useCallback(() => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      setMediaStream(null);
    }
    setIsActive(false);
    setIsInitializing(false);
  }, [mediaStream]);

  const startCamera = useCallback(async () => {
    // проверка протокола безопасности
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        onError('Ошибка: Камера работает только по HTTPS!');
        return;
    }
    
    if (isActive) return;
    setIsInitializing(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
            facingMode: "environment", 
            width: { ideal: 1920 }, 
            height: { ideal: 1080 } 
        }
      });
      
      setMediaStream(stream);
      setIsActive(true);
      setIsInitializing(false);
      
    } catch (err) {
      console.error("Ошибка камеры:", err);
      onError('Не удалось получить доступ к камере.');
      setIsInitializing(false);
      stopCamera();
    }
  }, [isActive, onError, stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !mediaStream) return;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file);
        stopCamera();
      }
    }, 'image/jpeg', 0.92);
  }, [mediaStream, onCapture, stopCamera]);

  // Подключение потока к <video>
  useEffect(() => {
    if (videoRef.current && mediaStream) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(e => console.warn("Autoplay blocked:", e));
        };
    }
  }, [mediaStream, isActive]);

  // Очистка при удалении компонента
  useEffect(() => {
    return () => stopCamera();
  }, []); 

  return { videoRef, isActive, isInitializing, startCamera, stopCamera, capturePhoto };
};
