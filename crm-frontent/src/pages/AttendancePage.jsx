import { useRef, useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../services/attendanceService';
import api from '../services/api';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import toast from 'react-hot-toast';
import { Camera, Clock, CheckCircle, LogIn, LogOut, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

// Simple pixel-based face similarity — compares two image data arrays
// Returns a score 0-1 (1 = identical). Threshold ~0.75 for match.
function compareImages(canvas1, canvas2) {
  try {
    const ctx1 = canvas1.getContext('2d');
    const ctx2 = canvas2.getContext('2d');
    const SIZE = 32; // downscale for comparison
    const tmp1 = document.createElement('canvas'); tmp1.width = SIZE; tmp1.height = SIZE;
    const tmp2 = document.createElement('canvas'); tmp2.width = SIZE; tmp2.height = SIZE;
    tmp1.getContext('2d').drawImage(canvas1, 0, 0, SIZE, SIZE);
    tmp2.getContext('2d').drawImage(canvas2, 0, 0, SIZE, SIZE);
    const d1 = tmp1.getContext('2d').getImageData(0, 0, SIZE, SIZE).data;
    const d2 = tmp2.getContext('2d').getImageData(0, 0, SIZE, SIZE).data;
    let diff = 0;
    for (let i = 0; i < d1.length; i += 4) {
      diff += Math.abs(d1[i] - d2[i]) + Math.abs(d1[i+1] - d2[i+1]) + Math.abs(d1[i+2] - d2[i+2]);
    }
    const maxDiff = SIZE * SIZE * 3 * 255;
    return 1 - diff / maxDiff;
  } catch { return 0; }
}

const AttendancePage = () => {
  const qc = useQueryClient();
  const videoRef = useRef();
  const canvasRef = useRef();
  const streamRef = useRef();
  const storedImgRef = useRef(); // Image element for stored face photo

  const [streaming, setStreaming] = useState(false);
  const [faceMatched, setFaceMatched] = useState(false);
  const [matchScore, setMatchScore] = useState(0);
  const [cameraError, setCameraError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const { data: today } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => attendanceService.getToday().then(r => r.data?.data?.attendance || r.data?.attendance || null),
    refetchInterval: 30000,
  });

  // Fetch stored face photo for the logged-in user
  const { data: faceData } = useQuery({
    queryKey: ['my-face'],
    queryFn: () => api.get('/employees/my-face').then(r => r.data?.data?.facePhoto || null),
  });

  const checkInMut = useMutation({
    mutationFn: () => attendanceService.checkIn({}),
    onSuccess: () => { qc.invalidateQueries(['attendance-today']); toast.success(`Checked in at ${format(new Date(), 'hh:mm a, dd MMM yyyy')}`); },
    onError: (e) => toast.error(e.response?.data?.message || 'Check-in failed'),
  });

  const checkOutMut = useMutation({
    mutationFn: () => attendanceService.checkOut({}),
    onSuccess: () => { qc.invalidateQueries(['attendance-today']); toast.success(`Checked out at ${format(new Date(), 'hh:mm a, dd MMM yyyy')}`); },
    onError: (e) => toast.error(e.response?.data?.message || 'Check-out failed'),
  });

  const startCamera = useCallback(async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
    } catch (err) {
      setCameraError('Camera access denied. Please allow camera permission in your browser.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setStreaming(false);
    setFaceMatched(false);
    setMatchScore(0);
  }, []);

  // Auto-start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Load stored face photo into an img element for comparison
  useEffect(() => {
    if (!faceData) return;
    const img = new Image();
    img.src = faceData;
    img.onload = () => { storedImgRef.current = img; };
  }, [faceData]);

  // Continuously verify face every 1.5s when streaming
  useEffect(() => {
    if (!streaming) return;
    const interval = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;
      if (!storedImgRef.current) {
        // No stored photo — allow check-in without face match
        setFaceMatched(true);
        setMatchScore(1);
        return;
      }
      setVerifying(true);
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth || 320;
      canvas.height = videoRef.current.videoHeight || 240;
      canvas.getContext('2d').drawImage(videoRef.current, 0, 0);

      // Draw stored photo to a temp canvas for comparison
      const storedCanvas = document.createElement('canvas');
      storedCanvas.width = storedImgRef.current.width;
      storedCanvas.height = storedImgRef.current.height;
      storedCanvas.getContext('2d').drawImage(storedImgRef.current, 0, 0);

      const score = compareImages(canvas, storedCanvas);
      setMatchScore(score);
      setFaceMatched(score > 0.72);
      setVerifying(false);
    }, 1500);
    return () => clearInterval(interval);
  }, [streaming]);

  const checkedIn = today?.checkIn?.time;
  const checkedOut = today?.checkOut?.time;

  const matchColor = faceMatched ? '#22c55e' : matchScore > 0.55 ? '#f59e0b' : '#ef4444';
  const matchLabel = faceMatched ? 'Face Matched ✓' : matchScore > 0.55 ? 'Adjusting...' : 'Face Not Matched';

  return (
    <div>
      <PageHeader title="Attendance" breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Attendance' }]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Camera panel */}
        <div className="crm-card p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Camera className="w-4 h-4" /> Face Verification
          </h3>

          <div className="relative rounded-xl overflow-hidden bg-slate-900 mb-3" style={{ aspectRatio: '4/3' }}>
            {cameraError ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4 text-center">
                <AlertCircle className="w-10 h-10 text-red-400" />
                <p className="text-slate-400 text-sm">{cameraError}</p>
                <button onClick={startCamera}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors">
                  Retry Camera
                </button>
              </div>
            ) : streaming ? (
              <>
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                <canvas ref={canvasRef} className="hidden" />
                {/* Face oval overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="rounded-full border-4 transition-colors duration-500"
                    style={{ width: 160, height: 200, borderColor: matchColor, boxShadow: `0 0 20px ${matchColor}55` }} />
                </div>
                {/* Match status badge */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                  <div className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                    style={{ background: matchColor + 'cc' }}>
                    {verifying ? 'Verifying...' : matchLabel}
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <button onClick={startCamera}
                  className="flex flex-col items-center gap-2 text-slate-400 hover:text-white transition-colors">
                  <Camera className="w-10 h-10" />
                  <span className="text-sm">Start Camera</span>
                </button>
              </div>
            )}
          </div>

          {!faceData && streaming && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              No face photo enrolled. Check-in allowed without face verification.
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => checkInMut.mutate()}
              disabled={!streaming || !faceMatched || !!checkedIn || checkInMut.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40">
              <LogIn className="w-4 h-4" />
              {checkInMut.isPending ? 'Checking in...' : 'Check In'}
            </button>
            <button
              onClick={() => checkOutMut.mutate()}
              disabled={!streaming || !faceMatched || !checkedIn || !!checkedOut || checkOutMut.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40">
              <LogOut className="w-4 h-4" />
              {checkOutMut.isPending ? 'Checking out...' : 'Check Out'}
            </button>
          </div>
        </div>

        {/* Today's status */}
        <div className="crm-card p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Today — {format(new Date(), 'EEEE, dd MMM yyyy')}
          </h3>
          {today ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100">
                <div>
                  <p className="text-xs text-green-600 font-medium">Check In</p>
                  <p className="text-2xl font-bold text-green-700">
                    {checkedIn ? format(new Date(checkedIn), 'hh:mm a') : '—'}
                  </p>
                  {checkedIn && (
                    <p className="text-xs text-green-500 mt-0.5">{format(new Date(checkedIn), 'dd MMM yyyy')}</p>
                  )}
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                <div>
                  <p className="text-xs text-red-600 font-medium">Check Out</p>
                  <p className="text-2xl font-bold text-red-700">
                    {checkedOut ? format(new Date(checkedOut), 'hh:mm a') : '—'}
                  </p>
                  {checkedOut && (
                    <p className="text-xs text-red-400 mt-0.5">{format(new Date(checkedOut), 'dd MMM yyyy')}</p>
                  )}
                </div>
                <LogOut className="w-8 h-8 text-red-300" />
              </div>
              {today.totalHours && (
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-xs text-indigo-600 font-medium">Working Hours</p>
                  <p className="text-2xl font-bold text-indigo-700">{today.totalHours}h</p>
                </div>
              )}
              <StatusBadge status={today.status || 'present'} />
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No attendance record for today</p>
              <p className="text-xs mt-1 text-slate-300">Use the camera to check in</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;
