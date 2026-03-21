import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useRef, useState, useEffect } from 'react';
import { employeeService } from '../services/employeeService';
import PageHeader from '../components/common/PageHeader';
import { Camera, CheckCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  department: z.string().min(1, 'Department required'),
  designation: z.string().min(1, 'Designation required'),
  role: z.string().min(1, 'Role required'),
  employeeId: z.string().optional(),
  joiningDate: z.string().optional(),
  salary: z.coerce.number().optional(),
});

const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
    {children}
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

const EmployeeNew = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const videoRef = useRef();
  const canvasRef = useRef();
  const streamRef = useRef();

  const [streaming, setStreaming] = useState(false);
  const [facePhoto, setFacePhoto] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: 'employee' },
  });

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setStreaming(true);
    } catch {
      toast.error('Camera access denied');
    }
  };

  useEffect(() => {
    if (streaming && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [streaming]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setStreaming(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setFacePhoto(dataUrl);
    stopCamera();
    toast.success('Photo captured');
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => stopCamera(), []);

  const mut = useMutation({
    mutationFn: (data) => employeeService.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries(['employees']);
      toast.success('Employee created successfully');
      const id = res.data?.data?.employee?._id || res.data?.employee?._id;
      navigate(id ? `/employees/${id}` : '/employees');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to create'),
  });

  const onSubmit = (data) => {
    if (!facePhoto) {
      toast.error('Please capture a face photo for attendance');
      return;
    }
    mut.mutate({ ...data, facePhoto });
  };

  return (
    <div>
      <PageHeader
        title="Add New Employee"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Employees', href: '/employees' },
          { label: 'New' },
        ]}
      />

      <div className="max-w-2xl mx-auto pb-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Camera - centered circle */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex flex-col items-center gap-4">
            <p className="text-sm font-semibold text-slate-700">Face Photo for Attendance</p>
            <div className="w-40 h-40 rounded-full overflow-hidden bg-slate-100 border-4 border-indigo-100 shadow-inner flex items-center justify-center">
              {facePhoto ? (
                <img src={facePhoto} alt="Face" className="w-full h-full object-cover" />
              ) : streaming ? (
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              ) : (
                <Camera className="w-10 h-10 text-slate-300" />
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
            {facePhoto ? (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" /> Photo captured
                </div>
                <button
                  type="button"
                  onClick={() => { setFacePhoto(null); startCamera(); }}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retake
                </button>
              </div>
            ) : streaming ? (
              <button
                type="button"
                onClick={capturePhoto}
                className="flex items-center gap-2 px-5 py-2.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium"
              >
                <Camera className="w-4 h-4" /> Capture Photo
              </button>
            ) : (
              <button
                type="button"
                onClick={startCamera}
                className="flex items-center gap-2 px-5 py-2.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium"
              >
                <Camera className="w-4 h-4" /> Open Camera
              </button>
            )}
            <p className="text-xs text-slate-400 text-center">
              Used to verify identity during attendance check-in/out
            </p>
          </div>

          {/* Employee Details */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Employee Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Full Name *" error={errors.name?.message}>
                <input {...register('name')} className="modal-input" placeholder="John Doe" />
              </Field>
              <Field label="Phone" error={errors.phone?.message}>
                <input {...register('phone')} className="modal-input" placeholder="+91 9876543210" />
              </Field>
              <Field label="Role *" error={errors.role?.message}>
                <select {...register('role')} className="modal-input">
                  <option value="employee">Employee</option>
                  <option value="sales">Sales</option>
                </select>
              </Field>
              <Field label="Department *" error={errors.department?.message}>
                <select {...register('department')} className="modal-input">
                  <option value="">Select department</option>
                  {['Engineering', 'Sales', 'HR', 'Finance', 'Support', 'Operations', 'Marketing'].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </Field>
              <Field label="Designation *" error={errors.designation?.message}>
                <input {...register('designation')} className="modal-input" placeholder="Software Engineer" />
              </Field>
              <Field label="Employee ID" error={errors.employeeId?.message}>
                <input {...register('employeeId')} className="modal-input" placeholder="EMP001" />
              </Field>
              <Field label="Joining Date" error={errors.joiningDate?.message}>
                <input {...register('joiningDate')} type="date" className="modal-input" />
              </Field>
              <Field label="Salary" error={errors.salary?.message}>
                <input {...register('salary')} type="number" className="modal-input" placeholder="50000" />
              </Field>
            </div>
          </div>

          {/* Login Credentials */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Login Credentials</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Email (Login ID) *" error={errors.email?.message}>
                <input {...register('email')} type="email" className="modal-input" placeholder="john@company.com" />
              </Field>
              <Field label="Password *" error={errors.password?.message}>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className="modal-input pr-10"
                    placeholder="Min 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting || mut.isPending}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              {mut.isPending ? 'Creating...' : 'Create Employee'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/employees')}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default EmployeeNew;
