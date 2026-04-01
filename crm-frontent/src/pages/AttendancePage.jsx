import { useRef, useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../services/attendanceService';
import api from '../services/api';
import PageHeader from '../components/common/PageHeader';
import toast from 'react-hot-toast';
import {
  Camera, Clock, LogIn, LogOut, AlertCircle,
  MapPin, Loader, ShieldCheck, ShieldX, UserCheck, Fingerprint,
} from 'lucide-react';
import { format } from 'date-fns';
import { loadModels, detectFast, detectFull, descriptorDistance, faceapi } from '../utils/faceApi';

const MATCH_THRESHOLD = 0.5;
// How often to run the full descriptor match (ms) — fast overlay runs every frame
const DESCRIPTOR_INTERVAL = 1500;

function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000 }
    );
  });
}

function distanceToConfidence(dist) {
  if (dist === null || dist === undefined) return 0;
  return Math.max(0, Math.round((1 - dist / MATCH_THRESHOLD) * 100));
}

// Draw corner-bracket box + landmark dots on canvas
function drawOverlay(canvas, detection, matchColor, videoEl) {
  const ctx = canvas.getContext('2d');
  const dw = videoEl.clientWidth;
  const dh = videoEl.clientHeight;
  canvas.width  = dw;
  canvas.height = dh;
  ctx.clearRect(0, 0, dw, dh);
  if (!detection) return;

  const vw = detection.detection.imageWidth  || videoEl.videoWidth  || 640;
  const vh = detection.detection.imageHeight || videoEl.videoHeight || 480;
  const sx = dw / vw;
  const sy = dh / vh;

  const { x, y, width, height } = detection.detection.box;
  // Mirror x because video is CSS-flipped
  const mx = dw - (x + width) * sx;
  const bx = mx, by = y * sy, bw = width * sx, bh = height * sy;

  const len = Math.min(bw, bh) * 0.22;
  const r   = 10;
  ctx.strokeStyle = matchColor;
  ctx.lineWidth   = 3;
  ctx.shadowColor = matchColor;
  ctx.shadowBlur  = 14;
  ctx.lineCap     = 'round';

  // Corner brackets
  const corners = [
    [bx,      by,      1,  1],
    [bx + bw, by,     -1,  1],
    [bx,      by + bh, 1, -1],
    [bx + bw, by + bh,-1, -1],
  ];
  corners.forEach(([cx, cy, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(cx + dx * r, cy);
    ctx.lineTo(cx + dx * (r + len), cy);
    ctx.moveTo(cx, cy + dy * r);
    ctx.lineTo(cx, cy + dy * (r + len));
    ctx.stroke();
  });

  // Landmark dots
  if (detection.landmarks) {
    ctx.shadowBlur = 0;
    ctx.fillStyle  = matchColor + 'cc';
    const pts = detection.landmarks.positions;
    pts.forEach(pt => {
      const lx = dw - pt.x * sx; // mirror
      const ly = pt.y * sy;
      ctx.beginPath();
      ctx.arc(lx, ly, 1.8, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

const AttendancePage = () => {
  const qc = useQueryClient();
  const videoRef   = useRef();
  const overlayRef = useRef();
  const streamRef  = useRef();
  const rafRef     = useRef();
  const lastDescriptorTime = useRef(0);

  const [streaming,       setStreaming]       = useState(false);
  const [modelsReady,     setModelsReady]     = useState(false);
  const [faceMatched,     setFaceMatched]     = useState(false);
  const [matchDistance,   setMatchDistance]   = useState(null);
  const [verifying,       setVerifying]       = useState(false);
  const [cameraError,     setCameraError]     = useState('');
  const [location,        setLocation]        = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [liveDetection,   setLiveDetection]   = useState(null); // latest fast detection

  const storedDescriptorRef = useRef(null);
  const faceMatchedRef      = useRef(false);
  const matchDistanceRef    = useRef(null);

  const { data: today, isLoading: todayLoading } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => attendanceService.getToday().then(r => r.data?.data?.attendance || null),
    refetchInterval: 30000,
  });

  const { data: faceData } = useQuery({
    queryKey: ['my-face'],
    queryFn: () => api.get('/employees/my-face').then(r => r.data?.data || {}),
  });

  useEffect(() => {
    if (!faceData?.faceDescriptor) { storedDescriptorRef.current = null; return; }
    try { storedDescriptorRef.current = new Float32Array(JSON.parse(faceData.faceDescriptor)); }
    catch { storedDescriptorRef.current = null; }
  }, [faceData]);

  useEffect(() => {
    loadModels().then(() => setModelsReady(true))
      .catch(() => setCameraError('Face recognition models failed to load. Please refresh.'));
  }, []);

  const entries       = today?.entries || [];
  const lastEntry     = entries.length > 0 ? entries[entries.length - 1] : null;
  const nextSwipeType = !lastEntry || lastEntry.type === 'out' ? 'in' : 'out';
  const checkedIn     = today?.checkIn?.time;
  const lastOut       = entries.filter(e => e.type === 'out').at(-1);

  const swipeMut = useMutation({
    mutationFn: (data) => attendanceService.swipe(data),
    onSuccess: (res) => {
      qc.invalidateQueries(['attendance-today']);
      const type = res.data?.data?.swipeType;
      toast.success(type === 'in' ? `Checked in at ${format(new Date(), 'hh:mm a')}` : `Checked out at ${format(new Date(), 'hh:mm a')}`);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Swipe failed'),
  });

  const startCamera = useCallback(async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setStreaming(true);
      setTimeout(() => {
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
      }, 50);
    } catch {
      setCameraError('Camera access denied. Please allow camera permission.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    setStreaming(false);
    setFaceMatched(false);
    setMatchDistance(null);
    setLiveDetection(null);
    if (overlayRef.current) {
      overlayRef.current.getContext('2d').clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    }
  }, []);

  useEffect(() => { startCamera(); return () => stopCamera(); }, []);

  useEffect(() => {
    setLocationLoading(true);
    getLocation().then(loc => { setLocation(loc); setLocationLoading(false); });
  }, []);

  // rAF-based detection loop — fast overlay every frame, descriptor every DESCRIPTOR_INTERVAL ms
  useEffect(() => {
    if (!streaming || !modelsReady) return;
    let active = true;

    const loop = async () => {
      if (!active || !videoRef.current || videoRef.current.readyState < 2) {
        if (active) rafRef.current = requestAnimationFrame(loop);
        return;
      }

      try {
        const now = performance.now();
        const needDescriptor = storedDescriptorRef.current &&
          (now - lastDescriptorTime.current > DESCRIPTOR_INTERVAL);

        let detection;
        if (needDescriptor) {
          // Full pipeline with descriptor
          lastDescriptorTime.current = now;
          setVerifying(true);
          const full = await detectFull(videoRef.current);
          if (!active) return;
          detection = full;
          if (full) {
            const dist = descriptorDistance(full.descriptor, storedDescriptorRef.current);
            matchDistanceRef.current = dist;
            faceMatchedRef.current   = dist < MATCH_THRESHOLD;
            setMatchDistance(dist);
            setFaceMatched(dist < MATCH_THRESHOLD);
          } else {
            matchDistanceRef.current = null;
            faceMatchedRef.current   = false;
            setMatchDistance(null);
            setFaceMatched(false);
          }
          setVerifying(false);
        } else if (!storedDescriptorRef.current) {
          // No enrolled face — fast detect only for overlay
          detection = await detectFast(videoRef.current);
          if (!active) return;
          if (detection) { faceMatchedRef.current = true; setFaceMatched(true); }
          else           { faceMatchedRef.current = false; setFaceMatched(false); }
        } else {
          // Between descriptor checks — just fast detect for overlay
          detection = await detectFast(videoRef.current);
          if (!active) return;
          if (!detection) {
            faceMatchedRef.current = false;
            setFaceMatched(false);
            setMatchDistance(null);
            matchDistanceRef.current = null;
          }
        }

        setLiveDetection(detection || null);

        // Draw overlay
        if (overlayRef.current && videoRef.current) {
          const color = faceMatchedRef.current ? '#22c55e'
            : matchDistanceRef.current !== null ? '#ef4444'
            : '#6366f1';
          drawOverlay(overlayRef.current, detection || null, color, videoRef.current);
        }
      } catch { /* ignore frame errors */ }

      if (active) rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { active = false; cancelAnimationFrame(rafRef.current); };
  }, [streaming, modelsReady]);

  const handleSwipe = async () => {
    setLocationLoading(true);
    const loc = await getLocation();
    setLocation(loc);
    setLocationLoading(false);
    swipeMut.mutate({ location: loc || undefined, faceVerified: faceMatched });
  };

  // UI state
  const hasEnrolledFace = !!faceData?.faceDescriptor;
  const noFace          = streaming && modelsReady && !liveDetection && !verifying;
  const confidence      = hasEnrolledFace ? distanceToConfidence(matchDistance) : null;

  let ringColor  = '#475569';
  let statusText = 'Camera off';
  let statusIcon = <Camera className="w-4 h-4" />;
  let statusBg   = 'bg-slate-700/70';

  if (!modelsReady && streaming) {
    ringColor = '#6366f1'; statusText = 'Loading models…'; statusBg = 'bg-indigo-600/80';
    statusIcon = <Loader className="w-4 h-4 animate-spin" />;
  } else if (cameraError) {
    ringColor = '#ef4444'; statusText = 'Camera error'; statusBg = 'bg-red-600/80';
    statusIcon = <AlertCircle className="w-4 h-4" />;
  } else if (!hasEnrolledFace && streaming && liveDetection) {
    ringColor = '#f59e0b'; statusText = 'Face detected — no enrolment'; statusBg = 'bg-amber-500/80';
    statusIcon = <AlertCircle className="w-4 h-4" />;
  } else if (!hasEnrolledFace && streaming) {
    ringColor = '#f59e0b'; statusText = 'No face enrolled'; statusBg = 'bg-amber-500/80';
    statusIcon = <AlertCircle className="w-4 h-4" />;
  } else if (verifying) {
    ringColor = '#6366f1'; statusText = 'Matching…'; statusBg = 'bg-indigo-600/80';
    statusIcon = <Loader className="w-4 h-4 animate-spin" />;
  } else if (noFace) {
    ringColor = '#ef4444'; statusText = 'No face detected'; statusBg = 'bg-red-600/80';
    statusIcon = <ShieldX className="w-4 h-4" />;
  } else if (faceMatched) {
    ringColor = '#22c55e'; statusText = `Identity verified  ${confidence}%`; statusBg = 'bg-green-600/80';
    statusIcon = <ShieldCheck className="w-4 h-4" />;
  } else if (matchDistance !== null) {
    ringColor = '#ef4444'; statusText = `Face mismatch  ${confidence}%`; statusBg = 'bg-red-600/80';
    statusIcon = <ShieldX className="w-4 h-4" />;
  } else if (streaming) {
    ringColor = '#6366f1'; statusText = 'Scanning…'; statusBg = 'bg-indigo-600/80';
    statusIcon = <Fingerprint className="w-4 h-4" />;
  }

  const canSwipe = streaming && modelsReady && faceMatched && !swipeMut.isPending;

  return (
    <div>
      <PageHeader title="Attendance" breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Attendance' }]} />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-start">

        {/* ── LEFT: Camera (3 cols) ── */}
        <div className="xl:col-span-3 flex flex-col gap-4">

          {!modelsReady && !cameraError && (
            <div className="flex items-center gap-2.5 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-sm text-indigo-700">
              <Loader className="w-4 h-4 animate-spin flex-shrink-0" />
              Loading face recognition models…
            </div>
          )}

          {/* Viewport */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 shadow-xl" style={{ aspectRatio: '4/3' }}>

            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-white font-medium">Camera unavailable</p>
                <p className="text-slate-400 text-sm">{cameraError}</p>
                <button onClick={startCamera}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
                  Retry Camera
                </button>
              </div>
            ) : streaming ? (
              <>
                {/* Video */}
                <video
                  ref={(el) => {
                    videoRef.current = el;
                    if (el && streamRef.current && !el.srcObject) {
                      el.srcObject = streamRef.current;
                      el.play().catch(() => {});
                    }
                  }}
                  className="w-full h-full object-cover"
                  muted playsInline
                  style={{ transform: 'scaleX(-1)' }}
                />

                {/* Detection overlay canvas */}
                <canvas ref={overlayRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ mixBlendMode: 'screen' }}
                />

                {/* Vignette */}
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse 65% 75% at 50% 45%, transparent 50%, rgba(0,0,0,0.5) 100%)' }} />

                {/* Scanning line — animates when verifying */}
                {verifying && (
                  <div className="absolute inset-x-0 pointer-events-none overflow-hidden"
                    style={{ top: '15%', height: '70%' }}>
                    <div className="w-full h-0.5 opacity-60 animate-bounce"
                      style={{ background: `linear-gradient(90deg, transparent, ${ringColor}, transparent)`, animationDuration: '1s' }} />
                  </div>
                )}

                {/* Pulse ring on match */}
                {faceMatched && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: '4%' }}>
                    <div className="rounded-full animate-ping opacity-20"
                      style={{ width: '44%', paddingBottom: '54%', background: ringColor }} />
                  </div>
                )}

                {/* Status pill */}
                <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-white backdrop-blur-md shadow-lg ${statusBg}`}>
                    {statusIcon}
                    {statusText}
                  </div>
                </div>

                {/* Confidence bar */}
                {hasEnrolledFace && matchDistance !== null && (
                  <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 pointer-events-none">
                    <div className="flex items-center justify-between text-xs text-white/70 mb-1.5">
                      <span className="font-medium">Match confidence</span>
                      <span className="font-bold tabular-nums" style={{ color: ringColor }}>{confidence}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/15 overflow-hidden backdrop-blur-sm">
                      <div className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${confidence}%`,
                          background: `linear-gradient(90deg, ${ringColor}99, ${ringColor})`,
                          boxShadow: `0 0 10px ${ringColor}`,
                        }} />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <Camera className="w-9 h-9 text-slate-400" />
                </div>
                <button onClick={startCamera}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
                  Start Camera
                </button>
              </div>
            )}
          </div>

          {/* No enrolment warning */}
          {!hasEnrolledFace && streaming && (
            <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-800">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
              No face enrolled. Attendance will be recorded without face verification.
            </div>
          )}

          {/* Location + Swipe */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-100 rounded-xl px-3 py-2.5 flex-1 min-w-0 shadow-sm">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
              <span className="truncate">
                {locationLoading ? 'Getting location…' : location
                  ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                  : 'Location unavailable'}
              </span>
            </div>
            <button onClick={handleSwipe} disabled={!canSwipe}
              className={`flex items-center gap-2.5 px-6 py-2.5 text-sm font-bold rounded-xl transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${
                nextSwipeType === 'in'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}>
              {swipeMut.isPending
                ? <Loader className="w-4 h-4 animate-spin" />
                : nextSwipeType === 'in' ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
              {swipeMut.isPending ? 'Processing…' : nextSwipeType === 'in' ? 'Check In' : 'Check Out'}
            </button>
          </div>
        </div>

        {/* ── RIGHT: Status + Timeline (2 cols) ── */}
        <div className="xl:col-span-2 flex flex-col gap-4">

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Clock className="w-3.5 h-3.5" />
              {format(new Date(), 'EEEE, dd MMMM yyyy')}
            </div>
            <p className="text-2xl font-bold text-slate-800 tabular-nums">{format(new Date(), 'hh:mm a')}</p>
          </div>

          {todayLoading ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center text-slate-400 text-sm">Loading…</div>
          ) : today ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'First In',  value: checkedIn ? format(new Date(checkedIn), 'hh:mm a') : '—', color: 'text-green-600' },
                  { label: 'Last Out',  value: lastOut   ? format(new Date(lastOut.time), 'hh:mm a') : '—', color: 'text-red-500' },
                  { label: 'Hours',     value: today.totalHours ? `${today.totalHours}h` : '—', color: 'text-indigo-600' },
                  { label: 'Swipes',    value: entries.length, color: 'text-slate-700' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">Today's Log</p>
                <div className="relative max-h-72 overflow-y-auto pr-1 space-y-0">
                  <div className="absolute left-[18px] top-2 bottom-2 w-px bg-slate-100" />
                  {entries.map((entry, i) => (
                    <div key={entry._id || i} className="flex items-start gap-3 py-2 relative">
                      <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center z-10 shadow-sm ${
                        entry.type === 'in' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {entry.type === 'in'
                          ? <LogIn  className="w-4 h-4 text-green-600" />
                          : <LogOut className="w-4 h-4 text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold ${entry.type === 'in' ? 'text-green-700' : 'text-red-600'}`}>
                            {entry.type === 'in' ? 'Checked In' : 'Checked Out'}
                          </span>
                          {entry.faceVerified && (
                            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full border border-green-200">
                              <ShieldCheck className="w-2.5 h-2.5" /> Verified
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-slate-400 tabular-nums">
                            {format(new Date(entry.time), 'hh:mm:ss a')}
                          </span>
                          {entry.location?.latitude && (
                            <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                              <MapPin className="w-2.5 h-2.5" />
                              {entry.location.latitude.toFixed(3)}, {entry.location.longitude.toFixed(3)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-600">No record for today</p>
              <p className="text-xs text-slate-400 mt-1">Verify your face and check in</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AttendancePage;
