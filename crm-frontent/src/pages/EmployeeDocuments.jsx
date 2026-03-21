import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { employeeService } from '../services/employeeService';
import PageHeader from '../components/common/PageHeader';
import FileUpload from '../components/common/FileUpload';
import { FileText, Download, Trash2 } from 'lucide-react';

const EmployeeDocuments = () => {
  const { id } = useParams();
  const qc = useQueryClient();
  const [files, setFiles] = useState([]);
  const [docType, setDocType] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['employee-docs', id],
    queryFn: () => employeeService.getDocuments(id).then(r => r.data?.documents || r.data || []),
  });

  const uploadMut = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      files.forEach(f => fd.append('documents', f));
      fd.append('type', docType);
      return employeeService.uploadDocument(id, fd);
    },
    onSuccess: () => { qc.invalidateQueries(['employee-docs', id]); toast.success('Uploaded'); setFiles([]); },
    onError: () => toast.error('Upload failed'),
  });

  const docs = data || [];

  return (
    <div>
      <PageHeader title="Employee Documents"
        breadcrumbs={[{ label: 'Employees', href: '/employees' }, { label: 'Documents' }]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="crm-card p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Upload Document</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Document Type</label>
            <select value={docType} onChange={e => setDocType(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">Select type</option>
              {['Aadhar','PAN','Passport','Offer Letter','Contract','Certificate','Other'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <FileUpload onFiles={setFiles} multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
          <button onClick={() => uploadMut.mutate()} disabled={!files.length || uploadMut.isPending}
            className="mt-4 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
            {uploadMut.isPending ? 'Uploading...' : 'Upload'}
          </button>
        </div>

        <div className="crm-card p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Documents ({docs.length})</h3>
          {isLoading ? <p className="text-sm text-slate-400">Loading...</p> : docs.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {docs.map((doc, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <FileText className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{doc.name || doc.originalName}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{doc.type} · {doc.size ? `${(doc.size/1024).toFixed(0)}KB` : ''}</p>
                  </div>
                  {doc.url && (
                    <a href={doc.url} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
                      <Download className="w-4 h-4 text-slate-500" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDocuments;
