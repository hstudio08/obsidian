import React, { useState, useCallback } from 'react';
import Cropper, { Point, Area } from 'react-easy-crop';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImageBlob: Blob) => void;
  onCancel: () => void;
}

export function ImageCropper({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = (crop: Point) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteHandler = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);

    try {
      const image = await createImage(imageSrc);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('No 2d context');
      }

      // We want a standard avatar size, e.g., max 400x400
      const MAX_WIDTH = 400;
      const MAX_HEIGHT = 400;
      
      canvas.width = MAX_WIDTH;
      canvas.height = MAX_HEIGHT;

      // Draw the cropped area onto the 400x400 canvas
      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        MAX_WIDTH,
        MAX_HEIGHT
      );

      // Compress to WebP with 0.8 quality to guarantee it's under 300kb (usually ~30kb)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            onCropComplete(blob);
          } else {
            console.error('Canvas is empty');
          }
          setIsProcessing(false);
        },
        'image/webp',
        0.8
      );
    } catch (e: any) {
      alert("CROPPER ERROR: " + (e.message || e));
      console.error(e);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-semibold text-lg text-[#1b1b1c]">Crop Avatar</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="relative w-full h-[300px] sm:h-[400px] bg-gray-50">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteHandler}
          />
        </div>

        <div className="p-4 bg-white flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500 font-medium">Zoom</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#3b82f6]"
            />
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={createCroppedImage}
              disabled={isProcessing}
              className="flex-1 py-3 px-4 bg-[#1b1b1c] hover:bg-black text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Save Avatar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper to load an image from a URL
export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    if (url.startsWith('http')) {
      image.setAttribute('crossOrigin', 'anonymous');
    }
    image.src = url;
  });
