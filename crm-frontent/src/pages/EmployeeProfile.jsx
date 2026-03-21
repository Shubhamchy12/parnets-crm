import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { employeeService } from '../services/employeeService';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Avatar from '../components/common/Avatar';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import { Edit, FileText, Camera, Mail, Phone, MapPin, Calendar, Briefcase } from 'lucide-react';

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
      <Icon className="w-4 h-4 text-slate-500" />
    </div>
    <div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-sm font-medium text-slate-800">{value || '—'}</p>
    </div>
  </div>
);

const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeeService.getOne(id).then(r => r.data?.data?.employee || r.data?.data || r.data),
  });

  if (isLoading) return <div className="p-6"><LoadingSkeleton /></div>;
  if (!data) return <div className="p-6 text-slate-500">Employee not found.</div>;

  return (
    <div>
      <PageHeader title="Employee Profile"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Employees', href: '/employees' }, { label: data.name || 'Profile' }]}
        actions={
          <div className="flex gap-2">
            <Link to={`/employees/${id}/documents`} className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              <FileText className="w-4 h-4" /> Documents
            </Link>
            <Link to={`/employees/${id}/enrol-face`} className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              <Camera className="w-4 h-4" /> Face Enrol
            </Link>
            <Link to={`/employees/${id}/edit`} className="modal-btn-primary flex items-center gap-2 px-4 py-2">
              <Edit className="w-4 h-4" /> Edit
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
          <Avatar name={data.name || ''} size="xl" className="mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">{data.name}</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{data.designation}</p>
          <p className="text-xs text-indigo-600 font-medium mt-1">{data.department}</p>
          <div className="mt-3"><StatusBadge status={data.status || 'active'} /></div>
          {data.employeeId && <p className="text-xs text-slate-400 mt-2">ID: {data.employeeId}</p>}
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Contact & Details</h3>
          <InfoRow icon={Mail} label="Email" value={data.email || data.user?.email} />
          <InfoRow icon={Phone} label="Phone" value={data.phone} />
          <InfoRow icon={MapPin} label="Address" value={
            data.address && typeof data.address === 'object'
              ? [data.address.street, data.address.city, data.address.state, data.address.zipCode, data.address.country].filter(Boolean).join(', ')
              : data.address
          } />
          <InfoRow icon={Calendar} label="Joining Date" value={data.joiningDate ? new Date(data.joiningDate).toLocaleDateString() : null} />
          <InfoRow icon={Briefcase} label="Salary" value={data.salary ? `₹${data.salary.toLocaleString()}` : null} />
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;
