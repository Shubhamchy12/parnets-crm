/**
 * FaceCapture — reusable face enrolment widget.
 * Shows live camera with real-time face detection feedback,
 * quality checks, and captures a high-quality descriptor.
 *
 * Props:
 *   onCapture(descriptor: Float32Array, photoDataUrl: string) — called on success
 *   existingPhoto?: string  — base64 preview of already-enrolled face
 *   faceEnrolled?: boolean  — whether a descriptor is already stored
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, CheckCircle, RefreshCw, AlertCircle, Loader, Scan, ZoomIn } from 'lucide-react';
import { loadModels, getDescriptor, faceapi } from '../../utils/faceApi';
import toast from 'react-hot-toast';

const DETECTOR_OPTIONS = () => new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 });

// Quality checks shown to user
const CHECKS = [
  { key: 'faceFound',   label: 'Face detected' },
  { key: 'centred',     label: 'Face centred' },
  { key: 'size',        label: 'Close enough' },
  { key: 'confidence',  label: 'Good confidence' },
];

export default function FaceCapture({ onCapture, existingPhoto, faceEnrolled }) {
  const videoRef  = useRef();
  const canvasRef = useRef();
  const overlayRef = useRef();
  const streamRef = useRef();
  const animRef   = useRef();

  const [phase, setPhase]         = useState('idle');   // idle | loading | streaming | capturing | done
  const [modelsReady, setModelsReady] = useState(false);
  const [checks, setChecks]       = useState({ faceFound: false, centred: false, size: false, confidence: false });
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [faceError, setFaceError] = useState('');
  const [detection, setDetection] = useState(null); // latest detection result

  // Load models once
  useEffect(() => {
    setPhase('loading');
    loadModels()
      .then(() => { setModelsReady(true); setPhase('idle'); })
      .catch(() => { setFaceError('Face models failed to load. Please refresh.'); setPhase('idle'); });
  }, []);

  const startCamera = useCallback(async () => {
    setFaceError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width:  { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
      });
      streamRef.current = stream;
      // Set phase first so the video element renders, then assign stream in next tick
      setPhase('streaming');
      // Use setTimeout to ensure the video element is in the DOM before assigning
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch {
      setFaceError('Camera access denied. Please allow camera permission.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setPhase('idle');
    setChecks({ faceFound: false, centred: false, size: false, confidence: false });
    setDetection(null);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // Live detection loop
  useEffect(() => {
    if (phase !== 'streaming' || !modelsReady) return;
    let active = true;

    const loop = async () => {
      if (!active || !videoRef.current || videoRef.current.readyState < 2) {
        if (active) animRef.current = requestAnimationFrame(loop);
        return;
      }
      try {
        const result = await faceapi
          .detectSingleFace(videoRef.current, DETECTOR_OPTIONS())
          .withFaceLandmarks();

        if (!active) return;

        if (result) {
          const { box, score } = result.detection;
          const vw = videoRef.current.videoWidth  || 640;
          const vh = videoRef.current.videoHeight || 480;

          const cx = box.x + box.width  / 2;
          const cy = box.y + box.height / 2;
          const centreX = Math.abs(cx - vw / 2) < vw * 0.2;
          const centreY = Math.abs(cy - vh / 2) < vh * 0.25;
          const bigEnough = box.width > vw * 0.2 && box.height > vh * 0.2;

          setDetection({ box, score, vw, vh });
          setChecks({
            faceFound:  true,
            centred:    centreX && centreY,
            size:       bigEnough,
            confidence: score > 0.75,
          });
        } else {
          setDetection(null);
          setChecks({ faceFound: false, centred: false, size: false, confidence: false });
        }
      } catch { /* ignore */ }

      if (active) animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => { active = false; cancelAnimationFrame(animRef.current); };
  }, [phase, modelsReady]);

  // Draw bounding box on overlay canvas
  useEffect(() => {
    if (!overlayRef.current || !videoRef.current) return;
    const canvas = overlayRef.current;
    const ctx = canvas.getContext('2d');
    const dw = videoRef.current.clientWidth  || 480;
    const dh = videoRef.current.clientHeight || 360;
    canvas.width  = dw;
    canvas.height = dh;
    ctx.clearRect(0, 0, dw, dh);

    if (!detection) return;
    const { box, vw, vh } = detection;
    const scaleX = dw / vw;
    const scaleY = dh / vh;

    const allGood = checks.faceFound && checks.centred && checks.size && checks.confidence;
    ctx.strokeStyle = allGood ? '#22c55e' : '#6366f1';
    ctx.lineWidth   = 3;
    ctx.shadowColor = allGood ? '#22c55e' : '#6366f1';
    ctx.shadowBlur  = 12;

    const x = box.x * scaleX;
    const y = box.y * scaleY;
    const w = box.width  * scaleX;
    const h = box.height * scaleY;
    const r = 12;
    const len = 24;

    // Corner brackets
    [[x, y, 1, 1], [x+w, y, -1, 1], [x, y+h, 1, -1], [x+w, y+h, -1, -1]].forEach(([cx, cy, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(cx + dx * r, cy);
      ctx.lineTo(cx + dx * (r + len), cy);
      ctx.moveTo(cx, cy + dy * r);
      ctx.lineTo(cx, cy + dy * (r + len));
      ctx.stroke();
    });
  }, [detection, checks]);

  const allGood = checks.faceFound && checks.centred && checks.size && checks.confidence;

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsReady || !allGood) return;
    setPhase('capturing');
    setFaceError('');
    try {
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      // Draw un-mirrored (video preview is CSS-flipped, capture should be normal)
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
      ctx.restore();

      // Run full pipeline with descriptor
      const result = await faceapi
        .detectSingleFace(video, DETECTOR_OPTIONS())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!result) {
        setFaceError('Face lost during capture. Please try again.');
        setPhase('streaming');
        return;
      }

      const photoUrl = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedPhoto(photoUrl);
      stopCamera();
      setPhase('done');
      onCapture(result.descriptor, photoUrl);
      toast.success('Face enrolled successfully');
    } catch {
      setFaceError('Capture failed. Please try again.');
      setPhase('streaming');
    }
  };

  const reset = () => {
    setCapturedPhoto(null);
    setFaceError('');
    setPhase('idle');
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const previewSrc = capturedPhoto || existingPhoto;

  return (
    <div className="flex flex-col items-center gap-4 w-full">

      {/* Header */}
      <div className="flex items-center gap-2 self-start">
        <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
          <Scan className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Face Enrolment</p>
          <p className="text-xs text-slate-400">
            {faceEnrolled && !capturedPhoto ? 'Face already enrolled — click to update' : 'Capture face for attendance verification'}
          </p>
        </div>
        {(faceEnrolled || capturedPhoto) && (
          <span className="ml-auto flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
            <CheckCircle className="w-3 h-3" /> Enrolled
          </span>
        )}
      </div>

      {/* Models loading */}
      {phase === 'loading' && (
        <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 px-4 py-2.5 rounded-xl border border-indigo-200 w-full">
          <Loader className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
          Loading face recognition models...
        </div>
      )}

      {/* Camera / Preview area */}
      <div className="w-full">
        {phase === 'streaming' || phase === 'capturing' ? (
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 w-full" style={{ aspectRatio: '4/3' }}>
        <video
          ref={(el) => {
            videoRef.current = el;
            if (el && streamRef.current && !el.srcObject) {
              el.srcObject = streamRef.current;
              el.play().catch(() => {});
            }
          }}
          className="w-full h-full object-cover"
          muted
          playsInline
          style={{ transform: 'scaleX(-1)' }}
        />
            {/* Detection overlay */}
            <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: 'scaleX(-1)' }} />
            <canvas ref={canvasRef} className="hidden" />

            {/* Guide oval */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="rounded-full border-2 border-dashed transition-colors duration-300"
                style={{
                  width: '42%', paddingBottom: '52%',
                  borderColor: allGood ? '#22c55e' : '#6366f188',
                }} />
            </div>

            {/* Status pill */}
            <div className="absolute top-3 left-0 right-0 flex justify-center">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white backdrop-blur-sm transition-colors ${
                allGood ? 'bg-green-500/80' : 'bg-slate-800/70'
              }`}>
                {phase === 'capturing' ? (
                  <><Loader className="w-3 h-3 animate-spin" /> Capturing...</>
                ) : allGood ? (
                  <><CheckCircle className="w-3 h-3" /> Ready to capture</>
                ) : (
                  <><Scan className="w-3 h-3" /> Align your face</>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Idle / Done preview */
          <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center"
            style={{ aspectRatio: '4/3' }}>
            {previewSrc ? (
              <>
                <img src={previewSrc} alt="Enrolled face" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/90 text-white text-xs font-semibold rounded-full">
                    <CheckCircle className="w-3 h-3" /> Face Enrolled
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                  <Camera className="w-8 h-8" />
                </div>
                <p className="text-sm">No face enrolled yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quality checks — shown while streaming */}
      {(phase === 'streaming' || phase === 'capturing') && (
        <div className="grid grid-cols-2 gap-2 w-full">
          {CHECKS.map(c => (
            <div key={c.key}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                checks[c.key]
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
              {checks[c.key]
                ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 flex-shrink-0" />}
              {c.label}
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {faceError && (
        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 px-3 py-2.5 rounded-xl border border-red-200 w-full">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {faceError}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 w-full">
        {phase === 'streaming' ? (
          <>
            <button type="button" onClick={capturePhoto}
              disabled={!allGood || phase === 'capturing'}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40">
              <Camera className="w-4 h-4" /> Capture Face
            </button>
            <button type="button" onClick={stopCamera}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm rounded-xl transition-colors">
              Cancel
            </button>
          </>
        ) : phase === 'capturing' ? (
          <div className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-400 text-white text-sm font-semibold rounded-xl">
            <Loader className="w-4 h-4 animate-spin" /> Processing...
          </div>
        ) : phase === 'done' || previewSrc ? (
          <div className="flex gap-2 w-full">
            <button type="button" onClick={() => { reset(); startCamera(); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
              {faceEnrolled ? 'Re-enrol' : 'Retake'}
            </button>
          </div>
        ) : (
          <button type="button" onClick={startCamera} disabled={!modelsReady}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
            <Camera className="w-4 h-4" />
            {modelsReady ? 'Open Camera' : 'Loading models...'}
          </button>
        )}
      </div>

      {/* Tip */}
      {phase === 'streaming' && (
        <p className="text-xs text-slate-400 text-center flex items-center gap-1">
          <ZoomIn className="w-3 h-3" /> Move closer until all checks turn green, then capture
        </p>
      )}
    </div>
  );
}
