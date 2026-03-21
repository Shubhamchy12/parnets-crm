import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '../services/documentService';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/common/PageHeader';
import FileUpload from '../components/common/FileUpload';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';
import { FileText, Download, Trash2, Upload, Search, Eye, User, Calendar, HardDrive } from 'lucide-react';
import { format } from 'date-fns';

const iconColor = (mimeType) => {
  if (mimeType?.includes('pdf')) return 'text-red-500';
  if (mimeType?.includes('image')) return 'text-blue-500';
  if (mimeType?.includes('word') || mimeType?.includes('doc')) return 'text-blue-700';
  if (mimeType?.includes('sheet') || mimeType?.includes('excel') || mimeType?.includes('csv')) return 'text-green-600';
  return 'text-slate-400';
};

// Read a File object as base64 data URL
const readAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const Documents = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = ['admin', 'super_admin'].includes(user?.role);

  const [search, setSearch] = useState('');
  const [uploadModal, setUploadModal] = useState(false);
  const [files, setFiles] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [viewDoc, setViewDoc] = useState(null);   // holds full doc with data
  const [viewLoading, setViewLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['documents', search],
    queryFn: async () => {
      const r = await documentService.getAll({ search });
      const list = r?.data?.data?.documents ?? r?.data?.documents ?? r?.data ?? [];
      return Array.isArray(list) ? list : [];
    },
  });

  const uploadMut = useMutation({
    mutationFn: async () => {
      return Promise.all(files.map(async (f) => {
        const dataUrl = await readAsDataURL(f);
        return documentService.upload({
          name: f.name,
          type: f.type.split('/')[0] || 'other',
          mimeType: f.type,
          size: f.size,
          data: dataUrl,   // base64 content stored in DB
          url: '',
        });
      }));
    },
    onSuccess: () => {
      qc.invalidateQueries(['documents']);
      toast.success('Uploaded');
      setUploadModal(false);
      setFiles([]);
    },
    onError: () => toast.error('Upload failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => documentService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries(['documents']);
      toast.success('Deleted');
      setDeleteId(null);
      setViewDoc(null);
    },
  });

  const openViewer = async (doc) => {
    setViewLoading(true);
    try {
      const r = await documentService.getById(doc._id);
      const full = r?.data?.data?.document ?? doc;
      setViewDoc(full);
    } catch {
      toast.error('Could not load document');
    } finally {
      setViewLoading(false);
    }
  };

  const docs = data || [];

  return (
    <div>
      <PageHeader
        title="Documents"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Documents' }]}
        actions={
          <button onClick={() => setUploadModal(true)}
            className="modal-btn-primary flex items-center gap-2 px-4 py-2">
            <Upload className="w-4 h-4" /> Upload
          </button>
        }
      />

      <div className="crm-card p-5">
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 max-w-sm"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-slate-400">Loading...</div>
        ) : docs.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No documents found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {docs.map(doc => (
              <div key={doc._id}
                className="border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <FileText className={`w-8 h-8 ${iconColor(doc.mimeType)}`} />
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openViewer(doc)}
                      className="p-1.5 hover:bg-indigo-50 rounded-lg transition-colors" title="View">
                      <Eye className="w-3.5 h-3.5 text-indigo-500" />
                    </button>
                    {(isAdmin || doc.uploadedBy === user?._id) && (
                      <button onClick={() => setDeleteId(doc._id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-800 truncate mb-1">{doc.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {doc.size ? `${(doc.size / 1024).toFixed(0)} KB` : '—'}
                  {' · '}
                  {doc.createdAt ? format(new Date(doc.createdAt), 'dd MMM yyyy') : ''}
                </p>
                {isAdmin && doc.uploaderName && (
                  <p className="text-xs mt-1 text-indigo-500 truncate">↑ {doc.uploaderName}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Upload Modal ── */}
      <Modal open={uploadModal} onClose={() => setUploadModal(false)} title="Upload Documents" size="md">
        <FileUpload onFiles={setFiles} multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.csv" />
        <div className="flex gap-3 mt-4">
          <button onClick={() => uploadMut.mutate()}
            disabled={!files.length || uploadMut.isPending}
            className="modal-btn-primary">
            {uploadMut.isPending ? 'Uploading...' : 'Upload'}
          </button>
          <button onClick={() => setUploadModal(false)} className="modal-btn-secondary">Cancel</button>
        </div>
      </Modal>

      {/* ── View Modal ── */}
      <Modal open={!!viewDoc || viewLoading} onClose={() => setViewDoc(null)} title="View Document" size="lg">
        {viewLoading && (
          <div className="flex items-center justify-center py-16 text-slate-400">Loading...</div>
        )}
        {viewDoc && !viewLoading && (
          <div className="space-y-4">
            {/* ── Preview ── */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden"
              style={{ minHeight: 300 }}>
              {viewDoc.mimeType?.startsWith('image/') && viewDoc.data ? (
                <img src={viewDoc.data} alt={viewDoc.name}
                  className="w-full max-h-[60vh] object-contain" />
              ) : viewDoc.mimeType === 'application/pdf' && viewDoc.data ? (
                <iframe src={viewDoc.data} title={viewDoc.name}
                  className="w-full" style={{ height: '60vh', border: 'none' }} />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <FileText className={`w-16 h-16 ${iconColor(viewDoc.mimeType)}`} />
                  <p className="text-sm text-slate-500">Preview not available for this file type</p>
                  {viewDoc.data && (
                    <a href={viewDoc.data} download={viewDoc.name}
                      className="modal-btn-primary flex items-center gap-2 text-sm">
                      <Download className="w-4 h-4" /> Download to view
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* ── Metadata ── */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <HardDrive className="w-4 h-4 text-slate-400" />
                <span>{viewDoc.size ? `${(viewDoc.size / 1024).toFixed(0)} KB` : '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{viewDoc.createdAt ? format(new Date(viewDoc.createdAt), 'dd MMM yyyy') : '—'}</span>
              </div>
              {(isAdmin || viewDoc.uploaderName) && (
                <div className="flex items-center gap-2 text-slate-600 col-span-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Uploaded by <strong>{viewDoc.uploaderName || 'Unknown'}</strong></span>
                </div>
              )}
            </div>

            {/* ── Actions ── */}
            <div className="flex gap-3 pt-3 border-t border-slate-100">
              {viewDoc.data && (
                <a href={viewDoc.data} download={viewDoc.name}
                  className="modal-btn-primary flex items-center gap-2">
                  <Download className="w-4 h-4" /> Download
                </a>
              )}
              {(isAdmin || viewDoc.uploadedBy?.toString() === user?._id) && (
                <button onClick={() => setDeleteId(viewDoc._id)}
                  className="modal-btn-secondary flex items-center gap-2 !text-red-500 hover:!bg-red-50">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMut.mutate(deleteId)}
        loading={deleteMut.isPending}
        title="Delete Document?"
      />
    </div>
  );
};

export default Documents;
