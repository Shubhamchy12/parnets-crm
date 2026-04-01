import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService } from '../services/employeeService';
import PageHeader from '../components/common/PageHeader';
import Avatar from '../components/common/Avatar';
import ConfirmDialog from '../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { ArrowLeft, Printer, Edit, Trash2, FileText, User, MapPin, CreditCard, Calendar, Phone, Mail, Briefcase, Building } from 'lucide-react';
import { format } from 'date-fns';

const Field = ({ label, value, icon: Icon }) => {
  const display = value === null || value === undefined ? '—'
    : typeof value === 'object' ? Object.values(value).filter(v => v && typeof v === 'string').join(', ') || '—'
    : String(value) || '—';
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
        <p className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>{label}</p>
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{display}</p>
    </div>
  );
};

const StatusBadge = ({ status = 'active' }) => {
  const styles = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-red-100 text-red-700',
    suspended: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${styles[status] || styles.active}`}>
      {status}
    </span>
  );
};

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeeService.getOne(id).then(r => r.data?.data?.employee || r.data?.employee || r.data),
  });

  const deleteMut = useMutation({
    mutationFn: () => employeeService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries(['employees']);
      toast.success('Employee deleted');
      navigate('/employees');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!employee) {
    return <div className="p-8 text-center text-slate-500">Employee not found.</div>;
  }

  const addr = employee.address && typeof employee.address === 'object'
    ? [employee.address.street, employee.address.city, employee.address.state, employee.address.zipCode, employee.address.country].filter(Boolean).join(', ')
    : employee.address || '—';

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-employee-area, #printable-employee-area * { visibility: visible; }
          #printable-employee-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .crm-card { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div>
        <PageHeader
          title={employee.name}
          breadcrumbs={[
            { label: 'Home', href: '/dashboard' },
            { label: 'Employees', href: '/employees' },
            { label: employee.name }
          ]}
          actions={
            <div className="flex items-center gap-2 flex-wrap no-print">
              <button onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                <Printer className="w-4 h-4" /> Print
              </button>
              <button onClick={() => navigate('/employees')}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl transition-colors modal-btn-secondary">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={() => navigate(`/employees/${id}/edit`)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors">
                <Edit className="w-4 h-4" /> Edit
              </button>
              <button onClick={() => setDeleteOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          }
        />

        {/* Printable Area */}
        <div id="printable-employee-area">
          {/* Print Header - Only visible when printing */}
          {isPrinting && (
            <div className="mb-8 pb-6 border-b-2 border-gray-300">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Report</h1>
                  <p className="text-lg text-gray-600 mb-4">{employee.name}</p>
                  <div className="text-sm text-gray-500">
                    Generated on: {format(new Date(), 'dd MMM yyyy, hh:mm a')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="mb-3">
                    <img 
                      src="/logo.jpg" 
                      alt="ParNets Logo" 
                      className="h-16 ml-auto"
                    />
                  </div>
                  <div className="text-sm text-gray-600">
                    <div className="font-bold text-lg text-gray-900 mb-2">ParNets Software India Pvt Ltd</div>
                    <div className="leading-relaxed">
                      <div>So104/1/50, Singapura Main Rd,</div>
                      <div>Singapura Village, Varadharaja Nagar,</div>
                      <div>Vidyaranyapura, Bengaluru,</div>
                      <div>Karnataka 560097</div>
                      <div className="mt-2 font-medium">Contact: 095909 26068</div>
                      <div className="text-indigo-600">hello@parnetsgroup.com</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left: Main Info */}
            <div className="lg:col-span-2 space-y-5">
              {/* Employee Profile Card */}
              <div className="crm-card p-6">
                <div className="flex items-start gap-4 mb-6">
                  <Avatar name={employee.name || ''} size="xl" />
                  <div className="flex-1">
                    <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-1)' }}>
                      {employee.name}
                    </h2>
                    <p className="text-sm mb-2" style={{ color: 'var(--text-3)' }}>
                      {employee.email}
                    </p>
                    <StatusBadge status={employee.status || 'active'} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <Field label="Employee ID" value={employee.employeeId} icon={User} />
                  <Field label="Department" value={employee.department} icon={Building} />
                  <Field label="Designation" value={employee.designation} icon={Briefcase} />
                  <Field label="Phone" value={employee.phone} icon={Phone} />
                  <Field label="Email" value={employee.email} icon={Mail} />
                  <Field 
                    label="Joining Date" 
                    value={employee.joiningDate ? format(new Date(employee.joiningDate), 'dd MMM yyyy') : null}
                    icon={Calendar}
                  />
                  <Field label="Role" value={employee.role} />
                  <Field label="Salary" value={employee.salary ? `₹${employee.salary.toLocaleString('en-IN')}` : null} />
                </div>

                {employee.remark && (
                  <div className="mt-5 pt-5 border-t" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>Remark</p>
                    <p className="text-sm" style={{ color: 'var(--text-2)' }}>{employee.remark}</p>
                  </div>
                )}
              </div>

              {/* Address Card */}
              <div className="crm-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-indigo-500" />
                  <h2 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Address</h2>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-2)' }}>{addr}</p>
              </div>

              {/* Bank Details */}
              {employee.bankDetails && (
                <div className="crm-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-green-500" />
                    <h2 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Bank Details</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <Field label="Bank Name" value={employee.bankDetails.bankName} />
                    <Field label="Account Holder" value={employee.bankDetails.accountHolderName} />
                    <Field label="Account Number" value={employee.bankDetails.accountNumber} />
                    <Field label="IFSC Code" value={employee.bankDetails.ifscCode} />
                    <Field label="Branch" value={employee.bankDetails.branchName} />
                  </div>
                </div>
              )}

              {/* Documents */}
              {employee.employeeDocs && Object.values(employee.employeeDocs).some(d => d?.filename) && (
                <div className="crm-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-amber-500" />
                    <h2 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Documents</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(employee.employeeDocs).map(([key, doc]) => {
                      if (!doc?.filename) return null;
                      const labels = {
                        aadhaar: 'Aadhaar Card',
                        pan: 'PAN Card',
                        education: 'Education Certificate',
                        experience: 'Experience Certificate',
                        salarySlip1: 'Salary Slip 1',
                        salarySlip2: 'Salary Slip 2',
                        salarySlip3: 'Salary Slip 3',
                      };
                      return (
                        <a
                          key={key}
                          href={`${import.meta.env.VITE_API_BASE_URL}/employees/docs/${doc.filename}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 rounded-xl transition-colors"
                          style={{ background: 'var(--bg-surface2)', border: '1px solid var(--border)' }}
                        >
                          <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                          <span className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>
                            {labels[key] || key}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Quick Info */}
            <div className="space-y-5">
              <div className="crm-card p-6">
                <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Quick Info</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>Status</p>
                    <StatusBadge status={employee.status || 'active'} />
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>Department</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                      {employee.department || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>Designation</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                      {employee.designation || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>Joining Date</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                      {employee.joiningDate ? format(new Date(employee.joiningDate), 'dd MMM yyyy') : '—'}
                    </p>
                  </div>
                  {employee.salary && (
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>Salary</p>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                        ₹{employee.salary.toLocaleString('en-IN')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {employee.faceEnrolled && (
                <div className="crm-card p-6">
                  <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-1)' }}>Face Recognition</h3>
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span>Enrolled</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <ConfirmDialog
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={() => deleteMut.mutate()}
          loading={deleteMut.isPending}
          title="Delete this employee?"
          message="This action cannot be undone."
        />
      </div>
    </>
  );
};

export default EmployeeDetail;
