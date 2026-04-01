import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { employeeService } from '../services/employeeService';
import PageHeader from '../components/common/PageHeader';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import FaceCapture from '../components/common/FaceCapture';
import { Upload, X, FileText } from 'lucide-react';

const schema = z.object({
  name:              z.string().min(2, 'Name required'),
  phone:             z.string().optional(),
  role:              z.string().min(1, 'Role required'),
  department:        z.string().min(1, 'Department required'),
  designation:       z.string().min(1, 'Designation required'),
  employeeId:        z.string().optional(),
  joiningDate:       z.string().optional(),
  salary:            z.coerce.number().optional(),
  status:            z.string().optional(),
  // bank
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

const FilePicker = ({ label, fieldKey, files, onChange, existingName }) => {
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
            <button type="button" onClick={e => { e.stopPropagation(); onChange(fieldKey, null); }}
              className="text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
          </>
        ) : existingName ? (
          <>
            <FileText className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span className="text-xs text-slate-500 truncate flex-1">{existingName} (uploaded)</span>
            <Upload className="w-3.5 h-3.5 text-slate-400" />
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-400">Click to upload (PDF, JPG, PNG, DOC)</span>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden"
        onChange={e => onChange(fieldKey, e.target.files?.[0] || null)} />
    </div>
  );
};

const EmployeeEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [facePhoto, setFacePhoto]           = useState(null);
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [docFiles, setDocFiles] = useState({
    aadhaar: null, pan: null, education: null,
    experience: null, salarySlip1: null, salarySlip2: null, salarySlip3: null,
  });
  const setFile = (key, file) => setDocFiles(p => ({ ...p, [key]: file }));

  const { data, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeeService.getOne(id).then(r => r.data?.data?.employee || r.data?.employee || r.data),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data.data.departments),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!data) return;
    reset({
      name:              data.name        || '',
      phone:             data.phone       || '',
      role:              data.role        || 'employee',
      department:        data.department  || '',
      designation:       data.designation || '',
      employeeId:        data.employeeId  || '',
      joiningDate:       data.joiningDate ? data.joiningDate.split('T')[0] : '',
      salary:            data.salary      || '',
      status:            data.status      || 'active',
      bankName:          data.bankDetails?.bankName          || '',
      accountHolderName: data.bankDetails?.accountHolderName || '',
      accountNumber:     data.bankDetails?.accountNumber     || '',
      ifscCode:          data.bankDetails?.ifscCode          || '',
      branchName:        data.bankDetails?.branchName        || '',
    });
  }, [data, reset]);

  const mut = useMutation({
    mutationFn: async (formData) => {
      // Build multipart form — same structure as register
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => { if (v !== undefined && v !== '') fd.append(k, v); });
      Object.entries(docFiles).forEach(([k, f]) => { if (f) fd.append(k, f); });

      await api.put(`/employees/${id}/full`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });

      if (faceDescriptor) {
        await employeeService.enrolFace(id, { descriptor: Array.from(faceDescriptor) });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['employee', id]);
      qc.invalidateQueries(['employees']);
      qc.invalidateQueries(['my-face']);
      toast.success('Employee updated successfully');
      navigate(`/employees/${id}`);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Update failed'),
  });

  if (isLoading) return <div className="p-6"><LoadingSkeleton /></div>;

  const existingDocs = data?.employeeDocs || {};

  return (
    <div>
      <PageHeader title="Edit Employee"
        breadcrumbs={[{ label: 'Employees', href: '/employees' }, { label: data?.name || 'Edit' }]} />

      <div className="max-w-2xl mx-auto pb-8">
        <form onSubmit={handleSubmit(d => mut.mutate(d))} className="space-y-5">

          {/* Face */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <FaceCapture
              onCapture={(desc, photo) => { setFaceDescriptor(desc); setFacePhoto(photo); }}
              existingPhoto={facePhoto}
              faceEnrolled={!!data?.faceEnrolled || !!faceDescriptor}
            />
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
                  {departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
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
              <Field label="Status" error={errors.status?.message}>
                <select {...register('status')} className="modal-input">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </Field>
            </div>
          </div>

          {/* Bank Details */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Bank Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Bank Name"><input {...register('bankName')} className="modal-input" placeholder="State Bank of India" /></Field>
              <Field label="Account Holder Name"><input {...register('accountHolderName')} className="modal-input" /></Field>
              <Field label="Account Number"><input {...register('accountNumber')} className="modal-input" /></Field>
              <Field label="IFSC Code"><input {...register('ifscCode')} className="modal-input" placeholder="SBIN0001234" /></Field>
              <Field label="Branch Name"><input {...register('branchName')} className="modal-input" /></Field>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Documents</h3>
            <p className="text-xs text-slate-400 mb-5">Upload new file to replace existing — PDF, JPG, PNG or DOC, max 10 MB</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FilePicker label="Aadhar Card"              fieldKey="aadhaar"    files={docFiles} onChange={setFile} existingName={existingDocs.aadhaar?.originalName} />
              <FilePicker label="PAN Card"                 fieldKey="pan"        files={docFiles} onChange={setFile} existingName={existingDocs.pan?.originalName} />
              <FilePicker label="Educational Certificates" fieldKey="education"  files={docFiles} onChange={setFile} existingName={existingDocs.education?.originalName} />
              <FilePicker label="Experience Certificate"   fieldKey="experience" files={docFiles} onChange={setFile} existingName={existingDocs.experience?.originalName} />
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium text-slate-500 mb-3">Salary Slips (Last 3 Months)</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FilePicker label="Month 1" fieldKey="salarySlip1" files={docFiles} onChange={setFile} existingName={existingDocs.salarySlip1?.originalName} />
                <FilePicker label="Month 2" fieldKey="salarySlip2" files={docFiles} onChange={setFile} existingName={existingDocs.salarySlip2?.originalName} />
                <FilePicker label="Month 3" fieldKey="salarySlip3" files={docFiles} onChange={setFile} existingName={existingDocs.salarySlip3?.originalName} />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={mut.isPending}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
              {mut.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={() => navigate(`/employees/${id}`)}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors">
              Cancel
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default EmployeeEdit;
