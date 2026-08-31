import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, RefreshCw } from 'lucide-react';

export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // rear camera by default

  const startCamera = useCallback(async (mode = facingMode) => {
    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setReady(false);
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Camera access was denied. Please allow camera permissions in your browser.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Could not access the camera. Please use the file upload option instead.');
      }
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);// eslint-disable-line react-hooks/exhaustive-deps

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
      }
    }, 'image/jpeg', 0.92);
    // Stop stream after capture
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  const flipCamera = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    startCamera(newMode);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-blue-400" />
            <span className="text-sm font-semibold text-white">Camera Capture</span>
          </div>
          <button
            id="camera-close-btn"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video / Error */}
        <div className="relative bg-black" style={{ minHeight: '360px' }}>
          {error ? (
            <div className="flex flex-col items-center justify-center h-72 gap-3 px-6 text-center">
              <Camera size={40} className="text-slate-600" />
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={() => startCamera()}
                className="text-xs text-blue-400 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedData={() => setReady(true)}
              className="w-full"
            />
          )}
          {/* Guide overlay */}
          {ready && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="border-2 border-white/40 rounded-lg w-4/5 h-3/4" />
              <p className="absolute bottom-4 text-xs text-white/60">
                Align the product label within the frame
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-6 py-5 bg-slate-800">
          <button
            id="camera-flip-btn"
            onClick={flipCamera}
            title="Flip camera"
            className="p-2.5 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <RefreshCw size={20} />
          </button>

          <button
            id="camera-capture-btn"
            onClick={handleCapture}
            disabled={!ready}
            className="w-16 h-16 bg-white hover:bg-blue-50 disabled:opacity-40 rounded-full shadow-lg transition-all duration-200 active:scale-95 flex items-center justify-center"
          >
            <div className="w-12 h-12 rounded-full border-4 border-slate-300" />
          </button>

          <div className="w-10" /> {/* spacer */}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
