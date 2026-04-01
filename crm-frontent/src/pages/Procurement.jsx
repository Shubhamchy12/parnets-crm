import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit, Trash2, Eye, Package, Truck, Calendar,
  CheckCircle, XCircle, Clock, AlertTriangle, Download,
  ShoppingCart, Calculator
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatINR } from '../utils/currency';

const CATEGORIES = [
  { value: 'mobile_app',          label: 'Mobile App Development' },
  { value: 'web_development',     label: 'Web Development' },
  { value: 'ui_ux_design',        label: 'UI/UX Design' },
  { value: 'software_development',label: 'Software Development' },
  { value: 'cloud_services',      label: 'Cloud Services' },
  { value: 'digital_marketing',   label: 'Digital Marketing' },
  { value: 'data_analytics',      label: 'Data Analytics' },
  { value: 'cybersecurity',       label: 'Cybersecurity' },
  { value: 'consulting',          label: 'IT Consulting' },
  { value: 'maintenance',         label: 'Maintenance & Support' },
];

const getCategoryLabel = (value) =>
  CATEGORIES.find(c => c.value === value)?.label || (value || '').replace(/_/g, ' ').toUpperCase();

const EMPTY_FORM = {
  poNumber: '',
  clientId: '',
  clientName: '',
  category: 'mobile_app',
  items: '',
  quantity: 1,
  unitPrice: '',
  totalAmount: '',
  status: 'pending',
  orderDate: '',
  expectedDelivery: '',
  description: '',
};

const generatePONumber = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const r = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PO-${y}${m}${d}-${r}`;
};

const Procurement = () => {
  const [procurements, setProcurements] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedProcurement, setSelectedProcurement] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM, poNumber: generatePONumber() });

  useEffect(() => {
    loadClients();
    loadProcurements();
  }, []);

  const loadClients = async () => {
    try {
      const res = await api.get('/clients', { params: { limit: 200 } });
      setClients(res.data?.data?.clients || []);
    } catch { setClients([]); }
  };

  const loadProcurements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/procurement');
      setProcurements(res.data?.data?.procurements || []);
    } catch { setProcurements([]); }
    finally { setLoading(false); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'quantity' || name === 'unitPrice') {
        const qty = name === 'quantity' ? parseFloat(value) || 0 : parseFloat(prev.quantity) || 0;
        const price = name === 'unitPrice' ? parseFloat(value) || 0 : parseFloat(prev.unitPrice) || 0;
        next.totalAmount = (qty * price).toString();
      }
      if (name === 'clientId') {
        const c = clients.find(c => c._id === value);
        next.clientName = c ? (c.company || c.name) : '';
      }
      return next;
    });
  };

  const resetForm = () => {
    setFormData({ ...EMPTY_FORM, poNumber: generatePONumber() });
    setSelectedProcurement(null);
  };

  const openModal = () => { resetForm(); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: formData.items,                    // service description → title (required)
        poNumber: formData.poNumber,
        clientId: formData.clientId,
        clientName: formData.clientName,
        category: formData.category,
        description: formData.description,
        quantity: formData.quantity,
        unitPrice: formData.unitPrice,
        totalAmount: formData.totalAmount,
        status: formData.status,
        orderDate: formData.orderDate,
        expectedDelivery: formData.expectedDelivery,
        notes: formData.description,
      };
      if (selectedProcurement) {
        await api.put(`/procurement/${selectedProcurement._id}`, payload);
        toast.success('Purchase order updated');
      } else {
        await api.post('/procurement', payload);
        toast.success('Purchase order created');
      }
      setShowModal(false);
      resetForm();
      loadProcurements();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  const getStatusIcon = (s) => {
    if (s === 'delivered' || s === 'completed') return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (s === 'in_progress' || s === 'in_transit') return <Clock className="h-5 w-5 text-blue-500" />;
    if (s === 'cancelled') return <XCircle className="h-5 w-5 text-red-500" />;
    if (s === 'delayed') return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    return <Clock className="h-5 w-5 text-yellow-500" />;
  };

  const getStatusColor = (s) => {
    if (s === 'delivered' || s === 'completed') return 'bg-green-100 text-green-800';
    if (s === 'in_progress' || s === 'in_transit') return 'bg-blue-100 text-blue-800';
    if (s === 'cancelled') return 'bg-red-100 text-red-800';
    if (s === 'delayed') return 'bg-orange-100 text-orange-800';
    if (s === 'pending') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const filtered = procurements.filter(p => {
    const term = searchTerm.toLowerCase();
    const match =
      (p.poNumber || '').toLowerCase().includes(term) ||
      (p.clientName || p.client?.name || '').toLowerCase().includes(term) ||
      (p.title || '').toLowerCase().includes(term);
    return match && (statusFilter === '' || p.status === statusFilter);
  });

  const totalValue    = procurements.reduce((s, p) => s + (p.totalAmount || 0), 0);
  const completedCnt  = procurements.filter(p => p.status === 'delivered' || p.status === 'completed').length;
  const inProgressCnt = procurements.filter(p => p.status === 'in_progress' || p.status === 'in_transit').length;
  const pendingCnt    = procurements.filter(p => p.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-orange-500 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Procurement Management</h1>
            <p className="text-blue-100">Manage purchase orders</p>
          </div>
          <button onClick={openModal} className="btn-primary bg-white/20 hover:bg-white/30 border border-white/30 flex items-center gap-2">
            <Plus className="h-5 w-5" /> Add Purchase Order
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Value',  value: formatINR(totalValue),  icon: ShoppingCart, color: 'text-blue-600',   iconColor: 'text-blue-500' },
          { label: 'Completed',    value: completedCnt,           icon: CheckCircle,  color: 'text-green-600',  iconColor: 'text-green-500' },
          { label: 'In Progress',  value: inProgressCnt,          icon: Clock,        color: 'text-blue-600',   iconColor: 'text-blue-500' },
          { label: 'Pending',      value: pendingCnt,             icon: Clock,        color: 'text-yellow-600', iconColor: 'text-yellow-500' },
        ].map(({ label, value, icon: Icon, color, iconColor }) => (
          <div key={label} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
              <Icon className={`h-8 w-8 ${iconColor}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search purchase orders..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)} className="input-field pl-10" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="delayed">Delayed</option>
          </select>
          <button className="btn-secondary flex items-center space-x-2">
            <Download className="h-4 w-4" /><span>Export</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading purchase orders...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['PO Number', 'Client & Category', 'Service/Items', 'Amount', 'Status', 'Expected Delivery', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No purchase orders found</td></tr>
                ) : filtered.map(p => (
                  <tr key={p._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{p.poNumber}</div>
                          <div className="text-xs text-gray-500">{getCategoryLabel(p.category)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {p.clientName || p.client?.company || p.client?.name || '—'}
                      </div>
                      <span className="inline-flex px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded mt-0.5">
                        {getCategoryLabel(p.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{p.title || '—'}</div>
                      <div className="text-xs text-gray-500">Qty: {p.quantity || 1}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatINR(p.totalAmount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(p.status)}
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(p.status)}`}>
                          {(p.status || '').replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {p.expectedDelivery ? new Date(p.expectedDelivery).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-900"><Eye className="h-4 w-4" /></button>
                        <button className="text-green-600 hover:text-green-900"><Edit className="h-4 w-4" /></button>
                        <button className="text-red-600 hover:text-red-900"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-orange-500 text-white p-6 rounded-t-lg">
              <h2 className="text-xl font-bold">
                {selectedProcurement ? 'Edit Purchase Order' : 'Create New Purchase Order'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">

              {/* PO Info */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-4">Purchase Order Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* PO Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PO Number *</label>
                    <div className="flex gap-2">
                      <input type="text" name="poNumber" value={formData.poNumber}
                        onChange={handleChange} className="input-field flex-1" readOnly required />
                      <button type="button"
                        onClick={() => setFormData(p => ({ ...p, poNumber: generatePONumber() }))}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors">
                        Generate
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Auto-generated PO number</p>
                  </div>

                  {/* Select Client */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Client *</label>
                    <select name="clientId" value={formData.clientId} onChange={handleChange}
                      className="input-field" required>
                      <option value="">Choose a client...</option>
                      {clients.map(c => (
                        <option key={c._id} value={c._id}>
                          {c.company ? `${c.name} — ${c.company}` : c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Service Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Service Category *</label>
                    <select name="category" value={formData.category} onChange={handleChange}
                      className="input-field" required>
                      {CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                    <select name="status" value={formData.status} onChange={handleChange}
                      className="input-field" required>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="delayed">Delayed</option>
                    </select>
                  </div>

                  {/* Order Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Order Date *</label>
                    <input type="date" name="orderDate" value={formData.orderDate}
                      onChange={handleChange} className="input-field" required />
                  </div>

                  {/* Expected Delivery */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery *</label>
                    <input type="date" name="expectedDelivery" value={formData.expectedDelivery}
                      onChange={handleChange} className="input-field" required />
                  </div>
                </div>
              </div>

              {/* Service Details */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-3">Service Details</h3>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service / Items Description *</label>
                <textarea name="items" value={formData.items} onChange={handleChange}
                  className="input-field" rows={3}
                  placeholder="Describe the service or items being procured..." required />
              </div>

              {/* Pricing */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calculator className="h-5 w-5" /> Pricing Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                    <input type="number" name="quantity" value={formData.quantity}
                      onChange={handleChange} className="input-field" min="1" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹) *</label>
                    <input type="number" name="unitPrice" value={formData.unitPrice}
                      onChange={handleChange} className="input-field" min="0" step="any"
                      placeholder="0" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₹)</label>
                    <input type="number" name="totalAmount" value={formData.totalAmount}
                      className="input-field bg-gray-50" readOnly />
                    <p className="text-xs text-gray-400 mt-1">Qty × Unit Price</p>
                  </div>
                </div>

                {formData.quantity && formData.unitPrice && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                    <span className="font-medium">Total: </span>
                    {formatINR(parseFloat(formData.totalAmount || 0))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                <textarea name="description" value={formData.description} onChange={handleChange}
                  className="input-field" rows={3} placeholder="Any additional notes or requirements..." />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
                  className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">
                  {selectedProcurement ? 'Update' : 'Create'} Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Procurement;
