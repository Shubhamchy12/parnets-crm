import { useRef, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { employeeService } from '../services/employeeService';
import PageHeader from '../components/common/PageHeader';
import { Camera, CheckCircle, XCircle, Loader } from 'lucide-react';

// NOTE: face-api.js models must be placed in /public/models/
// This component provides the UI shell; face detection requires face-api.js loaded separately.

const STEPS = ['Setup', 'Capture', 'Done'];

const Check = ({ ok, label }) => (
  <div className={`flex items-center gap-2 text-sm ${ok ? 'text-green-600' : 'text-slate-400'}`}>
    {ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
    {label}
  </div>
);

const FaceEnrolment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef();
  const canvasRef = useRef();
  const streamRef = useRef();

  const [step, setStep] = useState(0);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [checks, setChecks] = useState({ faceDetected: false, centred: false, lighting: false });
  const [capturing, setCapturing] = useState(false);
  const [capturedFrames, setCapturedFrames] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setStreaming(true);
    } catch {
      toast.error('Camera access denied. Please allow camera permission.');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setStreaming(false);
  };

  useEffect(() => {
    // Simulate model loading (replace with actual face-api.js loading)
    const timer = setTimeout(() => setModelsLoaded(true), 1500);
    return () => { clearTimeout(timer); stopCamera(); };
  }, []);

  // Simulate face detection checks when streaming
  useEffect(() => {
    if (!streaming) return;
    const interval = setInterval(() => {
      // In real impl: run faceapi.detectSingleFace(videoRef.current) here
      setChecks({ faceDetected: true, centred: true, lighting: true });
    }, 500);
    return () => clearInterval(interval);
  }, [streaming]);

  const captureFrames = async () => {
    setCapturing(true);
    setCapturedFrames(0);
    // Simulate capturing 8 frames
    for (let i = 1; i <= 8; i++) {
      await new Promise(r => setTimeout(r, 300));
      setCapturedFrames(i);
    }
    setCapturing(false);
    // In real impl: extract descriptors from frames and average them
    // Then POST to API
    setSubmitting(true);
    try {
      // Placeholder descriptor — replace with real averaged descriptor from face-api.js
      await employeeService.enrolFace(id, { descriptor: Array(128).fill(0), framesCount: 8 });
      toast.success('Face enrolled successfully');
      setStep(2);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Enrolment failed');
    } finally {
      setSubmitting(false);
      stopCamera();
    }
  };

  return (
    <div>
      <PageHeader title="Face Enrolment"
        breadcrumbs={[{ label: 'Employees', href: '/employees' }, { label: 'Face Enrolment' }]} />

      <div className="max-w-xl mx-auto">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i <= step ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{i + 1}</div>
              <span className={`text-sm ${i === step ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-slate-200" />}
            </div>
          ))}
        </div>

        <div className="crm-card p-6">
          {step === 0 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">Ready to enrol face</h3>
              <p className="text-sm text-slate-500 mb-6">We'll capture 8 frames to create your face profile. Ensure good lighting and face the camera directly.</p>
              {!modelsLoaded ? (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                  <Loader className="w-4 h-4 animate-spin" /> Loading face detection models...
                </div>
              ) : (
                <button onClick={() => { setStep(1); startCamera(); }}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
                  Start Camera
                </button>
              )}
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="relative rounded-xl overflow-hidden bg-slate-900 mb-4" style={{ aspectRatio: '4/3' }}>
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                {capturing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="text-white text-center">
                      <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm font-medium">Capturing frame {capturedFrames}/8</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <Check ok={checks.faceDetected} label="Face detected" />
                <Check ok={checks.centred} label="Centred" />
                <Check ok={checks.lighting} label="Good lighting" />
              </div>

              <button
                onClick={captureFrames}
                disabled={!checks.faceDetected || capturing || submitting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                {submitting ? 'Enrolling...' : capturing ? `Capturing ${capturedFrames}/8...` : 'Capture & Enrol'}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="text-center py-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Enrolment Complete</h3>
              <p className="text-sm text-slate-500 mb-6">Face profile has been saved successfully.</p>
              <button onClick={() => navigate(`/employees/${id}`)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
                Back to Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FaceEnrolment;
