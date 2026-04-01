import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService } from '../services/employeeService';
import api from '../services/api';
import Avatar from '../components/common/Avatar';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import PageHeader from '../components/common/PageHeader';
import { Plus, X, User, MapPin, FileText, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ── Status pill (no arrow, no dropdown) ───────────────────────────────────────
const STATUS_STYLE = {
  active:    { bg: '#dcfce7', color: '#16a34a' },
  inactive:  { bg: '#fee2e2', color: '#dc2626' },
  suspended: { bg: '#fef3c7', color: '#d97706' },
  completed: { bg: '#ede9fe', color: '#7c3aed' },
};
const StatusPill = ({ status = 'active' }) => {
  const s = STATUS_STYLE[status] || STATUS_STYLE.active;
  return (
    <span className="px-3 py-1 rounded-full text-xs font-semibold capitalize"
      style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
};

// ── Form helpers ───────────────────────────────────────────────────────────────
const Field = ({ label, children, error }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-4)' }}>{label}</label>
    {children}
    {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
  </div>
);
const Inp = (props) => (
  <input {...props} className="px-3 py-2 rounded-xl text-sm outline-none w-full"
    style={{ background: 'var(--bg-surface2)', border: '1px solid var(--border)', color: 'var(--text-1)' }} />
);
const Sel = ({ children, ...props }) => (
  <select {...props} className="px-3 py-2 rounded-xl text-sm outline-none w-full"
    style={{ background: 'var(--bg-surface2)', border: '1px solid var(--border)', color: 'var(--text-1)' }}>
    {children}
  </select>
);

// ── File picker with remove ────────────────────────────────────────────────────
const FilePicker = ({ label, fieldKey, files, onChange, existingName }) => {
  const file = files[fieldKey];
  const displayName = file ? file.name : existingName || null;
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-4)' }}>{label}</label>
      <label className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm cursor-pointer"
        style={{ background: 'var(--bg-surface2)', border: '1px dashed var(--border)', color: 'var(--text-3)' }}>
        {displayName ? (
          <>
            <FileText className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--brand)' }} />
            <span className="truncate flex-1 text-xs">{displayName}</span>
            <button type="button" onClick={e => { e.preventDefault(); onChange(fieldKey, null, true); }}>
              <X className="w-3.5 h-3.5 text-red-400" />
            </button>
          </>
        ) : (
          <><Upload className="w-4 h-4 flex-shrink-0" /><span className="text-xs">Upload (PDF, JPG, PNG, DOC)</span></>
        )}
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden"
          onChange={e => onChange(fieldKey, e.target.files?.[0] || null, false)} />
      </label>
    </div>
  );
};



// ── Reusable section header ────────────────────────────────────────────────────
const SecHead = ({ color, icon: Icon, title, sub }) => (
  <div className="flex items-center gap-2 mb-4">
    <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: color }}>
      <Icon className="w-3 h-3 text-white" />
    </div>
    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
      {title}{sub && <span className="normal-case font-normal ml-1" style={{ color: 'var(--text-4)' }}>({sub})</span>}
    </p>
  </div>
);

const EMPTY_FORM = { name:'', email:'', phone:'', department:'', designation:'', joiningDate:'', status:'active', remark:'', street:'', city:'', state:'', zipCode:'', country:'India' };
const EMPTY_DOCS = { aadhaar:null, pan:null, education:null };
const DOC_LABELS = { aadhaar:'Aadhaar Card', pan:'PAN Card', education:'Certificate Document' };

// ── Form section components (defined OUTSIDE main component to prevent remount) ──
const PersonalFields = ({ f, onChange, depts, errs }) => (
  <div className="grid grid-cols-2 gap-4">
    <Field label="Full Name *" error={errs.name}>
      <Inp value={f.name} onChange={e => onChange('name', e.target.value)} placeholder="e.g. John Doe" />
    </Field>
    <Field label="Email Address *" error={errs.email}>
      <Inp type="email" value={f.email} onChange={e => onChange('email', e.target.value)} placeholder="john@company.com" />
    </Field>
    <Field label="Department *" error={errs.department}>
      <Sel value={f.department} onChange={e => onChange('department', e.target.value)}>
        <option value="">Select department</option>
        {depts.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
      </Sel>
    </Field>
    <Field label="Designation *" error={errs.designation}>
      <Inp value={f.designation} onChange={e => onChange('designation', e.target.value)} placeholder="e.g. Software Engineer" />
    </Field>
    <Field label="Phone Number">
      <Inp value={f.phone} onChange={e => onChange('phone', e.target.value)} placeholder="+91 9876543210" />
    </Field>
    <Field label="Joining Date">
      <Inp type="date" value={f.joiningDate} onChange={e => onChange('joiningDate', e.target.value)} />
    </Field>
    <Field label="Status">
      <Sel value={f.status} onChange={e => onChange('status', e.target.value)}>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="suspended">Suspended</option>
        <option value="completed">Completed</option>
      </Sel>
    </Field>
    <Field label="Remark">
      <Inp value={f.remark} onChange={e => onChange('remark', e.target.value)} placeholder="Optional note..." />
    </Field>
    {f.status && (
      <div className="col-span-2 flex items-center gap-2">
        <span className="text-xs" style={{ color: 'var(--text-4)' }}>Status preview:</span>
        <StatusPill status={f.status} />
      </div>
    )}
  </div>
);

const AddressFields = ({ f, onChange }) => (
  <div className="grid grid-cols-2 gap-4">
    <div className="col-span-2">
      <Field label="Street / Area">
        <Inp value={f.street} onChange={e => onChange('street', e.target.value)} placeholder="123 Main Street" />
      </Field>
    </div>
    <Field label="City"><Inp value={f.city} onChange={e => onChange('city', e.target.value)} placeholder="Mumbai" /></Field>
    <Field label="State"><Inp value={f.state} onChange={e => onChange('state', e.target.value)} placeholder="Maharashtra" /></Field>
    <Field label="ZIP / PIN Code"><Inp value={f.zipCode} onChange={e => onChange('zipCode', e.target.value)} placeholder="400001" /></Field>
    <Field label="Country"><Inp value={f.country} onChange={e => onChange('country', e.target.value)} placeholder="India" /></Field>
  </div>
);

const DocFields = ({ docs, onChange, existingDocs }) => (
  <div className="grid grid-cols-3 gap-3">
    {Object.keys(EMPTY_DOCS).map(key => (
      <FilePicker key={key} label={DOC_LABELS[key]} fieldKey={key} files={docs} onChange={onChange}
        existingName={existingDocs?.[key]?.originalName || (existingDocs?.[key]?.filename ? DOC_LABELS[key] : null)} />
    ))}
  </div>
);

// ── Main ───────────────────────────────────────────────────────────────────────
const SubEmployeeProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showAdd, setShowAdd]   = useState(false);
  const [editEmp, setEditEmp]   = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [form, setForm]         = useState(EMPTY_FORM);
  const [docFiles, setDocFiles] = useState(EMPTY_DOCS);
  const [errors, setErrors]     = useState({});

  // edit state
  const [editForm, setEditForm]     = useState(EMPTY_FORM);
  const [editDocs, setEditDocs]     = useState(EMPTY_DOCS);
  const [removedDocs, setRemovedDocs] = useState({});

  const { data: deptData = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data?.data?.departments || []),
  });

  const { data: empData, isLoading } = useQuery({
    queryKey: ['sub-employees', user?._id],
    queryFn: () => employeeService.getAll({ limit: 200 }).then(r => r.data),
    enabled: !!user?._id,
  });
  const employees = empData?.data?.employees || empData?.employees || [];

  const set  = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const eSet = (k, v) => setEditForm(p => ({ ...p, [k]: v }));

  const setFile = (key, file) => setDocFiles(p => ({ ...p, [key]: file }));
  const setEditFile = (key, file, remove) => {
    setEditDocs(p => ({ ...p, [key]: file }));
    if (remove) setRemovedDocs(p => ({ ...p, [key]: true }));
    else setRemovedDocs(p => { const n = { ...p }; delete n[key]; return n; });
  };

  const validate = (f) => {
    const e = {};
    if (!f.name.trim()) e.name = 'Name required';
    if (!f.email.trim()) e.email = 'Email required';
    if (!f.department) e.department = 'Department required';
    if (!f.designation.trim()) e.designation = 'Designation required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const buildFd = (f, docs) => {
    const fd = new FormData();
    fd.append('name', f.name); fd.append('email', f.email);
    fd.append('password', 'Parnets@123'); fd.append('role', 'employee');
    fd.append('phone', f.phone); fd.append('department', f.department);
    fd.append('designation', f.designation); fd.append('status', f.status);
    if (f.joiningDate) fd.append('joiningDate', f.joiningDate);
    if (f.remark) fd.append('remark', f.remark);
    const addr = [f.street, f.city, f.state, f.zipCode, f.country].filter(Boolean).join(', ');
    if (addr) fd.append('address', addr);
    Object.entries(docs).forEach(([k, file]) => { if (file) fd.append(k, file); });
    return fd;
  };

  // Add mutation
  const addMut = useMutation({
    mutationFn: (fd) => api.post('/employees/register', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => {
      qc.invalidateQueries(['sub-employees']); toast.success('Employee added');
      setShowAdd(false); setForm(EMPTY_FORM); setDocFiles({ aadhaar:null, pan:null, education:null });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to add'),
  });

  // Edit mutation
  const editMut = useMutation({
    mutationFn: ({ id, fd }) => api.put(`/employees/${id}/full`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => {
      qc.invalidateQueries(['sub-employees']); toast.success('Employee updated');
      setEditEmp(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update'),
  });

  // Delete mutation
  const deleteMut = useMutation({
    mutationFn: (id) => employeeService.remove(id),
    onSuccess: () => { qc.invalidateQueries(['sub-employees']); toast.success('Employee deleted'); setDeleteId(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to delete'),
  });

  const openEdit = (emp) => {
    const addr = emp.address && typeof emp.address === 'object' ? emp.address : {};
    setEditForm({
      name: emp.name || '', email: emp.email || '', phone: emp.phone || '',
      department: emp.department || '', designation: emp.designation || '',
      joiningDate: emp.joiningDate ? emp.joiningDate.split('T')[0] : '',
      status: emp.status || 'active', remark: emp.remark || '',
      street: addr.street || '', city: addr.city || '',
      state: addr.state || '', zipCode: addr.zipCode || '', country: addr.country || 'India',
    });
    setEditDocs({ aadhaar:null, pan:null, education:null }); setRemovedDocs({});
    setEditEmp(emp);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!validate(form)) return;
    addMut.mutate(buildFd(form, docFiles));
  };

  const handleEdit = (e) => {
    e.preventDefault();
    if (!validate(editForm)) return;
    const fd = new FormData();
    ['name','phone','department','designation','status','remark','joiningDate'].forEach(k => {
      if (editForm[k] !== undefined) fd.append(k, editForm[k]);
    });
    const addr = [editForm.street, editForm.city, editForm.state, editForm.zipCode, editForm.country].filter(Boolean).join(', ');
    if (addr) fd.append('address', addr);
    Object.entries(editDocs).forEach(([k, file]) => { if (file) fd.append(k, file); });
    editMut.mutate({ id: editEmp._id, fd });
  };

  return (
    <div>
      <PageHeader title="Sub Employee"
        breadcrumbs={[{label:'Home',href:'/dashboard'},{label:'Sub Employee'}]}
        actions={
          <button onClick={()=>setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{background:'var(--brand)'}}>
            <Plus className="w-4 h-4"/> Add Employee
          </button>
        }
      />

      {/* ── Table ── */}
      <div className="rounded-2xl overflow-x-auto" style={{background:'var(--bg-surface)',border:'1px solid var(--border)',boxShadow:'var(--shadow-sm)'}}>
        {isLoading ? <div className="p-6"><LoadingSkeleton/></div>
          : employees.length===0 ? (
            <div className="py-16 text-center text-sm" style={{color:'var(--text-4)'}}>No employees yet. Click "+ Add Employee" to get started.</div>
          ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{borderBottom:'1px solid var(--border)',background:'var(--bg-surface2)'}}>
                {['Employee','Department','Designation','Phone','Joining Date','Remark','Status','Actions'].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{color:'var(--text-4)'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp,i)=>(
                <tr key={emp._id} style={{borderBottom:i<employees.length-1?'1px solid var(--border)':'none'}}
                  className="transition-colors hover:bg-[var(--bg-surface2)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={emp.name||''} size="sm"/>
                      <div>
                        <p className="font-medium" style={{color:'var(--text-1)'}}>{emp.name}</p>
                        <p className="text-xs" style={{color:'var(--text-4)'}}>{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{color:'var(--text-2)'}}>{emp.department||'—'}</td>
                  <td className="px-4 py-3" style={{color:'var(--text-2)'}}>{emp.designation||'—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{color:'var(--text-2)'}}>{emp.phone||'—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{color:'var(--text-2)'}}>
                    {emp.joiningDate?format(new Date(emp.joiningDate),'dd MMM yyyy'):'—'}
                  </td>
                  <td className="px-4 py-3 max-w-[100px] truncate" style={{color:'var(--text-3)'}}>{emp.remark||'—'}</td>
                  <td className="px-4 py-3"><StatusPill status={emp.status||'active'}/></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <button onClick={()=>navigate(`/employees/${emp._id}`)} className="text-xs font-semibold hover:underline" style={{color:'var(--brand)'}}>View</button>
                      <span style={{color:'var(--border)'}}>|</span>
                      <button onClick={()=>openEdit(emp)} className="text-xs font-semibold hover:underline" style={{color:'var(--text-3)'}}>Edit</button>
                      <span style={{color:'var(--border)'}}>|</span>
                      <button onClick={()=>setDeleteId(emp._id)} className="text-xs font-semibold hover:underline" style={{color:'#ef4444'}}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {editEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.5)',backdropFilter:'blur(2px)'}}>
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden" style={{background:'var(--bg-surface)',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{borderBottom:'1px solid var(--border)'}}>
              <div><h2 className="text-base font-bold" style={{color:'var(--text-1)'}}>Edit Employee</h2>
              <p className="text-xs mt-0.5" style={{color:'var(--text-4)'}}>Update details for {editEmp.name}</p></div>
              <button onClick={()=>setEditEmp(null)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:'var(--bg-surface2)',color:'var(--text-3)'}}><X className="w-4 h-4"/></button>
            </div>
            <form onSubmit={handleEdit} className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
              <div><SecHead color="var(--brand)" icon={User} title="Personal Information"/>
                <PersonalFields f={editForm} onChange={eSet} depts={deptData} errs={errors}/></div>
              <div><SecHead color="#8b5cf6" icon={MapPin} title="Address" sub="Optional"/>
                <AddressFields f={editForm} onChange={eSet}/></div>
              <div><SecHead color="#f59e0b" icon={FileText} title="Documents" sub="Replace or remove"/>
                <DocFields docs={editDocs} onChange={setEditFile} existingDocs={editEmp.employeeDocs}/></div>
            </form>
            <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{borderTop:'1px solid var(--border)',background:'var(--bg-surface)'}}>
              <button type="button" onClick={()=>setEditEmp(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{background:'var(--bg-surface2)',color:'var(--text-2)'}}>Cancel</button>
              <button onClick={handleEdit} disabled={editMut.isPending} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{background:'var(--brand)'}}>
                {editMut.isPending?'Saving...':'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.45)'}}>
          <div className="rounded-2xl p-6 w-80" style={{background:'var(--bg-surface)',border:'1px solid var(--border)'}}>
            <h3 className="text-base font-bold mb-2" style={{color:'var(--text-1)'}}>Delete Employee?</h3>
            <p className="text-sm mb-5" style={{color:'var(--text-3)'}}>This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={()=>setDeleteId(null)} className="flex-1 py-2 rounded-xl text-sm font-medium" style={{background:'var(--bg-surface2)',color:'var(--text-2)'}}>Cancel</button>
              <button onClick={()=>deleteMut.mutate(deleteId)} disabled={deleteMut.isPending}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{background:'#ef4444'}}>
                {deleteMut.isPending?'Deleting...':'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.5)',backdropFilter:'blur(2px)'}}>
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden" style={{background:'var(--bg-surface)',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{borderBottom:'1px solid var(--border)'}}>
              <div><h2 className="text-base font-bold" style={{color:'var(--text-1)'}}>Add New Employee</h2>
              <p className="text-xs mt-0.5" style={{color:'var(--text-4)'}}>Fill in the details to register a new employee</p></div>
              <button onClick={()=>setShowAdd(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:'var(--bg-surface2)',color:'var(--text-3)'}}><X className="w-4 h-4"/></button>
            </div>
            <form onSubmit={handleAdd} className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
              <div><SecHead color="var(--brand)" icon={User} title="Personal Information"/>
                <PersonalFields f={form} onChange={set} depts={deptData} errs={errors}/></div>
              <div><SecHead color="#8b5cf6" icon={MapPin} title="Address" sub="Optional"/>
                <AddressFields f={form} onChange={set}/></div>
              <div><SecHead color="#f59e0b" icon={FileText} title="Documents" sub="Optional"/>
                <DocFields docs={docFiles} onChange={setFile}/></div>
            </form>
            <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{borderTop:'1px solid var(--border)',background:'var(--bg-surface)'}}>
              <button type="button" onClick={()=>setShowAdd(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{background:'var(--bg-surface2)',color:'var(--text-2)'}}>Cancel</button>
              <button onClick={handleAdd} disabled={addMut.isPending} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{background:'var(--brand)'}}>
                {addMut.isPending?'Adding...':'Add Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubEmployeeProfile;
