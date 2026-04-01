import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useRef, useState, useEffect } from 'react';
import api from '../services/api';
import PageHeader from '../components/common/PageHeader';
import { Eye, EyeOff, Upload, X, FileText } from 'lucide-react';
import FaceCapture from '../components/common/FaceCapture';

const schema = z.object({
  name:        z.string().min(2, 'Name required'),
  email:       z.string().email('Valid email required'),
  password:    z.string().min(6, 'Password must be at least 6 characters'),
  phone:       z.string().optional(),
  department:  z.string().min(1, 'Department required'),
  designation: z.string().min(1, 'Designation required'),
  role:        z.string().min(1, 'Role required'),
  employeeId:  z.string().optional(),
  joiningDate: z.string().optional(),
  salary:      z.coerce.number().optional(),
  // bank details
  bankName:          z.string().optional(),
  accountHolderName: z.string().optional(),
  accountNumber:     z.string().optional(),
  ifscCode:          z.string().optional(),
  branchName:        z.string().optional(),
});

const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
    {children}
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

// Single file picker with preview name
const FilePicker = ({ label, fieldKey, files, onChange }) => {
  const inputRef = useRef();
  const file = files[fieldKey];
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
      <div
        className="flex items-center gap-3 border border-dashed border-slate-300 rounded-xl px-4 py-3 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        {file ? (
          <>
            <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            <span className="text-xs text-slate-700 truncate flex-1">{file.name}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(fieldKey, null); }}
              className="text-slate-400 hover:text-red-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-400">Click to upload (PDF, JPG, PNG, DOC)</span>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        className="hidden"
        onChange={(e) => onChange(fieldKey, e.target.files?.[0] || null)}
      />
    </div>
  );
};

const EmployeeNew = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [facePhoto, setFacePhoto] = useState(null);
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [docFiles, setDocFiles] = useState({
    aadhaar: null, pan: null, education: null,
    experience: null, salarySlip1: null, salarySlip2: null, salarySlip3: null,
  });

  const setFile = (key, file) => setDocFiles(prev => ({ ...prev, [key]: file }));

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/departments');
      return res.data.data.departments;
    },
  });

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: 'employee' },
  });

  const mut = useMutation({
    mutationFn: (formData) => api.post('/employees/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    onSuccess: (res) => {
      qc.invalidateQueries(['employees']);
      toast.success('Employee created successfully');
      const id = res.data?.data?.employee?._id;
      navigate(id ? `/employees/${id}` : '/employees');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to create'),
  });

  const onSubmit = (data) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== '') fd.append(k, v); });
    // Only send the descriptor — it's all that's needed for face matching
    if (faceDescriptor) fd.append('faceDescriptor', JSON.stringify(Array.from(faceDescriptor)));
    // Skip facePhoto base64 — too large and not needed for matching
    Object.entries(docFiles).forEach(([k, f]) => { if (f) fd.append(k, f); });
    mut.mutate(fd);
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

          {/* ── Face Photo ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <FaceCapture
              onCapture={(descriptor, photo) => { setFaceDescriptor(descriptor); setFacePhoto(photo); }}
              existingPhoto={facePhoto}
              faceEnrolled={!!faceDescriptor}
            />
          </div>

          {/* ── Employee Details ── */}
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
                  {departments.map((d) => (
                    <option key={d._id} value={d.name}>{d.name}</option>
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

          {/* ── Login Credentials ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Login Credentials</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Email (Login ID) *" error={errors.email?.message}>
                <input {...register('email')} type="email" className="modal-input" placeholder="john@company.com" />
              </Field>
              <Field label="Password *" error={errors.password?.message}>
                <div className="relative">
                  <input {...register('password')} type={showPassword ? 'text' : 'password'}
                    className="modal-input pr-10" placeholder="Min 6 characters" />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>
            </div>
          </div>

          {/* ── Bank Details ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Bank Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Bank Name" error={errors.bankName?.message}>
                <input {...register('bankName')} className="modal-input" placeholder="State Bank of India" />
              </Field>
              <Field label="Account Holder Name" error={errors.accountHolderName?.message}>
                <input {...register('accountHolderName')} className="modal-input" placeholder="John Doe" />
              </Field>
              <Field label="Account Number" error={errors.accountNumber?.message}>
                <input {...register('accountNumber')} className="modal-input" placeholder="1234567890" />
              </Field>
              <Field label="IFSC Code" error={errors.ifscCode?.message}>
                <input {...register('ifscCode')} className="modal-input" placeholder="SBIN0001234" />
              </Field>
              <Field label="Branch Name" error={errors.branchName?.message}>
                <input {...register('branchName')} className="modal-input" placeholder="MG Road Branch" />
              </Field>
            </div>
          </div>

          {/* ── Document Upload ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Document Upload</h3>
            <p className="text-xs text-slate-400 mb-5">PDF, JPG, PNG or DOC — max 10 MB each</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FilePicker label="Aadhar Card" fieldKey="aadhaar" files={docFiles} onChange={setFile} />
              <FilePicker label="PAN Card" fieldKey="pan" files={docFiles} onChange={setFile} />
              <FilePicker label="Educational Certificates" fieldKey="education" files={docFiles} onChange={setFile} />
              <FilePicker label="Experience Certificate" fieldKey="experience" files={docFiles} onChange={setFile} />
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium text-slate-500 mb-3">Salary Slips (Last 3 Months)</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FilePicker label="Month 1" fieldKey="salarySlip1" files={docFiles} onChange={setFile} />
                <FilePicker label="Month 2" fieldKey="salarySlip2" files={docFiles} onChange={setFile} />
                <FilePicker label="Month 3" fieldKey="salarySlip3" files={docFiles} onChange={setFile} />
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-3">
            <button type="submit" disabled={mut.isPending}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
              {mut.isPending ? 'Creating...' : 'Create Employee'}
            </button>
            <button type="button" onClick={() => navigate('/employees')}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors">
              Cancel
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default EmployeeNew;
