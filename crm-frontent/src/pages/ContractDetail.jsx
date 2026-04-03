import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractService } from '../services/contractService';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FileSignature, Edit, Trash2, Send, Calendar, DollarSign, User, FileText, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { formatINR } from '../utils/currency';

const ContractDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editModal, setEditModal] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  const { data: contract, isLoading } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => contractService.getOne(id).then(r => r.data?.data?.contract),
  });

  const updateMut = useMutation({
    mutationFn: (d) => contractService.update(id, d),
    onSuccess: () => {
      qc.invalidateQueries(['contract', id]);
      qc.invalidateQueries(['contracts']);
      toast.success('Contract updated');
      setEditModal(false);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update'),
  });

  const deleteMut = useMutation({
    mutationFn: () => contractService.remove(id),
    onSuccess: () => {
      toast.success('Contract deleted');
      navigate('/contracts');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to delete'),
  });

  const sendMut = useMutation({
    mutationFn: () => contractService.send(id),
    onSuccess: () => {
      qc.invalidateQueries(['contract', id]);
      toast.success('Contract sent');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to send'),
  });

  const handleEdit = () => {
    if (contract) {
      reset({
        title: contract.title,
        value: contract.value,
        startDate: contract.startDate ? format(new Date(contract.startDate), 'yyyy-MM-dd') : '',
        endDate: contract.endDate ? format(new Date(contract.endDate), 'yyyy-MM-dd') : '',
        terms: contract.terms,
        description: contract.description,
        status: contract.status,
      });
      setEditModal(true);
    }
  };

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Contract not found</p>
      </div>
    );
  }

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .crm-card { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div>
        <PageHeader
          title={contract.title}
          breadcrumbs={[
            { label: 'Home', href: '/dashboard' },
            { label: 'Contracts', href: '/contracts' },
            { label: contract.title },
          ]}
          actions={
            <div className="flex items-center gap-3 no-print">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              {contract.status === 'draft' && (
                <button
                  onClick={() => sendMut.mutate()}
                  disabled={sendMut.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {sendMut.isPending ? 'Sending...' : 'Send Contract'}
                </button>
              )}
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => setDeleteDialog(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          }
        />

        {/* Printable Area */}
        <div id="printable-area">
          {/* Print Header - Only visible when printing */}
          {isPrinting && (
            <div className="mb-8 pb-6 border-b-2 border-gray-300">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Contract Document</h1>
                  <p className="text-lg text-gray-600 mb-4">{contract.title}</p>
                  <div className="text-sm text-gray-500">
                    Generated on: {format(new Date(), 'dd MMM yyyy, hh:mm a')}
                  </div>
                </div>
                <div className="text-right">
                  {/* Logo */}
                  <div className="mb-3">
                    <img 
                      src="/logo.jpg" 
                      alt="ParNets Logo" 
                      className="h-16 ml-auto"
                    />
                  </div>
                  {/* Company Details */}
                  <div className="text-sm text-gray-600">
                    <div className="font-bold text-lg text-gray-900 mb-2">ParNets Software India Pvt Ltd</div>
                    <div className="leading-relaxed">
                      <div>So104/1/50, Singapura Main Rd,</div>
                      <div>Singapura Village, Varadharaja Nagar,</div>
                      <div>Vidyaranyapura, Bengaluru,</div>
                      <div>Karnataka 560097</div>
                      <div className="mt-2 font-medium">GST: 29AANCP7155K1ZN</div>
                      <div className="font-medium">Contact: 095909 26068</div>
                      <div className="text-indigo-600">hello@parnetsgroup.com</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="crm-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Contract Details
                  </h2>
                  <StatusBadge status={contract.status || 'draft'} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <FileSignature className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Title</p>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {contract.title}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Client</p>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {contract.client?.name || contract.clientName || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Contract Value</p>
                      <p className="font-medium text-green-600">
                        {contract.value ? formatINR(contract.value) : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Duration</p>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {contract.startDate && contract.endDate
                          ? `${format(new Date(contract.startDate), 'dd MMM yyyy')} - ${format(new Date(contract.endDate), 'dd MMM yyyy')}`
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {contract.description && (
                  <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-gray-400 mt-1" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-500 mb-2">Description</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {contract.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Terms & Conditions */}
              {contract.terms && (
                <div className="crm-card p-6">
                  <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                    Terms & Conditions
                  </h3>
                  <div
                    className="prose prose-sm max-w-none"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <pre className="whitespace-pre-wrap font-sans">{contract.terms}</pre>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="crm-card p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Additional Info
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Created By</p>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {contract.createdBy?.name || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Created At</p>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {contract.createdAt
                        ? format(new Date(contract.createdAt), 'dd MMM yyyy, hh:mm a')
                        : '—'}
                    </p>
                  </div>
                  {contract.sentAt && (
                    <div>
                      <p className="text-sm text-gray-500">Sent At</p>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {format(new Date(contract.sentAt), 'dd MMM yyyy, hh:mm a')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        <Modal
          open={editModal}
          onClose={() => setEditModal(false)}
          title="Edit Contract"
          subtitle="Update contract details"
          icon={FileSignature}
          size="md"
        >
          <form onSubmit={handleSubmit(d => updateMut.mutate(d))} className="space-y-4">
            <div>
              <label className="modal-form-label">Title *</label>
              <input {...register('title')} className="modal-input" required />
            </div>
            <div>
              <label className="modal-form-label">Value (₹)</label>
              <input {...register('value')} type="number" className="modal-input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="modal-form-label">Start Date</label>
                <input {...register('startDate')} type="date" className="modal-input" />
              </div>
              <div>
                <label className="modal-form-label">End Date</label>
                <input {...register('endDate')} type="date" className="modal-input" />
              </div>
            </div>
            <div>
              <label className="modal-form-label">Status</label>
              <select {...register('status')} className="modal-input">
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="signed">Signed</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="modal-form-label">Description</label>
              <textarea {...register('description')} rows={3} className="modal-input" />
            </div>
            <div>
              <label className="modal-form-label">Terms & Conditions</label>
              <textarea {...register('terms')} rows={6} className="modal-input" />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={updateMut.isPending}
                className="modal-btn-primary"
              >
                {updateMut.isPending ? 'Updating...' : 'Update Contract'}
              </button>
              <button
                type="button"
                onClick={() => setEditModal(false)}
                className="modal-btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={deleteDialog}
          onClose={() => setDeleteDialog(false)}
          onConfirm={() => deleteMut.mutate()}
          loading={deleteMut.isPending}
          title="Delete Contract?"
          message="Are you sure you want to delete this contract? This action cannot be undone."
        />
      </div>
    </>
  );
};

export default ContractDetail;
