import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Building, 
  User,
  Mail,
  Phone,
  FileText,
  Upload,
  X
} from 'lucide-react';
import apiService from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const Clients = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    industry: '',
    website: '',
    status: 'prospect',
    source: 'other',
    clientType: 'individual',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India'
    },
    contactPerson: {
      name: '',
      designation: '',
      phone: '',
      email: ''
    },
    documents: {
      gst: null,
      pan: null,
      aadhaar: null,
      companyRegistration: null,
      other: []
    }
  });

  useEffect(() => {
    fetchClients();
  }, [searchTerm, statusFilter, clientTypeFilter]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (clientTypeFilter) params.clientType = clientTypeFilter;
      
      const response = await apiService.getClients(params);
      setClients(response.data.clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedClient) {
        await apiService.updateClient(selectedClient._id, formData);
        toast.success('Client updated successfully');
      } else {
        await apiService.createClient(formData);
        toast.success('Client created successfully');
      }
      setShowModal(false);
      setSelectedClient(null);
      resetForm();
      fetchClients();
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error('Failed to save client');
    }
  };

  const handleEdit = (client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      company: client.company || '',
      industry: client.industry || '',
      website: client.website || '',
      status: client.status || 'prospect',
      source: client.source || 'other',
      clientType: client.clientType || 'individual',
      address: {
        street: client.address?.street || '',
        city: client.address?.city || '',
        state: client.address?.state || '',
        zipCode: client.address?.zipCode || '',
        country: client.address?.country || 'India'
      },
      contactPerson: {
        name: client.contactPerson?.name || '',
        designation: client.contactPerson?.designation || '',
        phone: client.contactPerson?.phone || '',
        email: client.contactPerson?.email || ''
      },
      documents: {
        gst: client.documents?.gst || null,
        pan: client.documents?.pan || null,
        aadhaar: client.documents?.aadhaar || null,
        companyRegistration: client.documents?.companyRegistration || null,
        other: client.documents?.other || []
      }
    });
    setShowModal(true);
  };

  const handleDelete = async (clientId) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await apiService.deleteClient(clientId);
        toast.success('Client deleted successfully');
        fetchClients();
      } catch (error) {
        console.error('Error deleting client:', error);
        toast.error('Failed to delete client');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      industry: '',
      website: '',
      status: 'prospect',
      source: 'other',
      clientType: 'individual',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'India'
      },
      contactPerson: {
        name: '',
        designation: '',
        phone: '',
        email: ''
      },
      documents: {
        gst: null,
        pan: null,
        aadhaar: null,
        companyRegistration: null,
        other: []
      }
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'badge-success';
      case 'inactive': return 'badge-error';
      case 'prospect': return 'badge-warning';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleFileUpload = (documentType, file) => {
    if (file && file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('File size should be less than 5MB');
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (file && !allowedTypes.includes(file.type)) {
      toast.error('Only PDF, JPEG, PNG files are allowed');
      return;
    }

    if (documentType === 'other') {
      const newOtherDoc = {
        id: Date.now(),
        name: file.name,
        file: file,
        type: file.type,
        size: file.size
      };
      setFormData({
        ...formData,
        documents: {
          ...formData.documents,
          other: [...formData.documents.other, newOtherDoc]
        }
      });
    } else {
      setFormData({
        ...formData,
        documents: {
          ...formData.documents,
          [documentType]: {
            name: file.name,
            file: file,
            type: file.type,
            size: file.size
          }
        }
      });
    }
    toast.success('Document uploaded successfully');
  };

  const removeDocument = (documentType, docId = null) => {
    if (documentType === 'other' && docId) {
      setFormData({
        ...formData,
        documents: {
          ...formData.documents,
          other: formData.documents.other.filter(doc => doc.id !== docId)
        }
      });
    } else {
      setFormData({
        ...formData,
        documents: {
          ...formData.documents,
          [documentType]: null
        }
      });
    }
    toast.success('Document removed');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const canManageClients = ['super_admin', 'admin', 'sub_admin'].includes(user?.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-orange-500 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Clients Management</h1>
            <p className="text-blue-100">Manage your client relationships</p>
          </div>
          {canManageClients && (
            <button
              onClick={() => {
                resetForm();
                setSelectedClient(null);
                setShowModal(true);
              }}
              className="btn-primary bg-white/20 hover:bg-white/30 border border-white/30"
            >
              <Plus className="h-5 w-5" />
              Add Client
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10 w-64"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="prospect">Prospect</option>
            </select>
            <select
              value={clientTypeFilter}
              onChange={(e) => setClientTypeFilter(e.target.value)}
              className="input-field"
            >
              <option value="">All Types</option>
              <option value="individual">Individual</option>
              <option value="company">Company</option>
            </select>
          </div>
        </div>
      </div>

      {/* Clients List */}
      <div className="table-container">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading clients...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No clients found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Documents
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Industry
                  </th>
                  {canManageClients && (
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clients.map((client) => (
                  <tr key={client._id} className="table-row">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-600 rounded-lg p-2">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{client.name}</div>
                          <div className="text-sm text-gray-500">{client.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        client.clientType === 'individual' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {client.clientType === 'individual' ? 'Individual' : 'Company'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{client.company || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{client.industry || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-900">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{client.phone}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span>{client.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {client.address?.city && client.address?.state 
                          ? `${client.address.city}, ${client.address.state}` 
                          : 'No address'}
                      </div>
                      <div className="text-sm text-gray-500">{client.address?.country || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {client.documents?.gst && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            GST
                          </span>
                        )}
                        {client.documents?.pan && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            PAN
                          </span>
                        )}
                        {client.documents?.aadhaar && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                            Aadhaar
                          </span>
                        )}
                        {client.documents?.companyRegistration && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                            Reg
                          </span>
                        )}
                        {client.documents?.other && client.documents.other.length > 0 && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            +{client.documents.other.length}
                          </span>
                        )}
                        {(!client.documents || 
                          (!client.documents.gst && !client.documents.pan && !client.documents.aadhaar && 
                           !client.documents.companyRegistration && (!client.documents.other || client.documents.other.length === 0))) && (
                          <span className="text-xs text-gray-400">No docs</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${getStatusColor(client.status)}`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{client.industry || 'N/A'}</div>
                    </td>
                    {canManageClients && (
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(client)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(client._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
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
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <div className="bg-gradient-to-r from-blue-600 to-orange-500 text-white p-6 rounded-t-lg">
              <h2 className="text-xl font-bold">
                {selectedClient ? 'Edit Client' : 'Add New Client'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Client Type Radio Buttons */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Client Type *</label>
                <div className="flex space-x-6">
                  <div className="flex items-center">
                    <input
                      id="individual"
                      name="clientType"
                      type="radio"
                      value="individual"
                      checked={formData.clientType === 'individual'}
                      onChange={(e) => setFormData({...formData, clientType: e.target.value})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor="individual" className="ml-2 text-sm font-medium text-gray-700">
                      Individual
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="company"
                      name="clientType"
                      type="radio"
                      value="company"
                      checked={formData.clientType === 'company'}
                      onChange={(e) => setFormData({...formData, clientType: e.target.value})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor="company" className="ml-2 text-sm font-medium text-gray-700">
                      Company
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.clientType === 'individual' ? 'Full Name' : 'Contact Person Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="input-field"
                    placeholder={formData.clientType === 'individual' ? 'Enter full name' : 'Enter contact person name'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="input-field"
                  />
                </div>
                
                {/* Company field - only show for company type */}
                {formData.clientType === 'company' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.company}
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                      className="input-field"
                    />
                  </div>
                )}
                
                {/* Industry field - only show for company type */}
                {formData.clientType === 'company' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                    <input
                      type="text"
                      value={formData.industry}
                      onChange={(e) => setFormData({...formData, industry: e.target.value})}
                      className="input-field"
                    />
                  </div>
                )}
                
                {/* Website field - only show for company type */}
                {formData.clientType === 'company' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      className="input-field"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="input-field"
                  >
                    <option value="prospect">Prospect</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({...formData, source: e.target.value})}
                    className="input-field"
                  >
                    <option value="referral">Referral</option>
                    <option value="website">Website</option>
                    <option value="social_media">Social Media</option>
                    <option value="cold_call">Cold Call</option>
                    <option value="advertisement">Advertisement</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Address Section - Common for both Individual and Company */}
              <div className="mt-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Address Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                    <input
                      type="text"
                      value={formData.address.street}
                      onChange={(e) => setFormData({
                        ...formData, 
                        address: { ...formData.address, street: e.target.value }
                      })}
                      className="input-field"
                      placeholder="Enter street address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) => setFormData({
                        ...formData, 
                        address: { ...formData.address, city: e.target.value }
                      })}
                      className="input-field"
                      placeholder="Enter city"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={formData.address.state}
                      onChange={(e) => setFormData({
                        ...formData, 
                        address: { ...formData.address, state: e.target.value }
                      })}
                      className="input-field"
                      placeholder="Enter state"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                    <input
                      type="text"
                      value={formData.address.zipCode}
                      onChange={(e) => setFormData({
                        ...formData, 
                        address: { ...formData.address, zipCode: e.target.value }
                      })}
                      className="input-field"
                      placeholder="Enter ZIP code"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <select
                      value={formData.address.country}
                      onChange={(e) => setFormData({
                        ...formData, 
                        address: { ...formData.address, country: e.target.value }
                      })}
                      className="input-field"
                    >
                      <option value="India">India</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                      <option value="Germany">Germany</option>
                      <option value="France">France</option>
                      <option value="Japan">Japan</option>
                      <option value="Singapore">Singapore</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Document Upload Section */}
              <div className="mt-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Document Upload (Optional)</h4>
                <div className="space-y-4">
                  
                  {/* GST Certificate - Company only */}
                  {formData.clientType === 'company' && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">GST Certificate</label>
                        {formData.documents.gst && (
                          <button
                            type="button"
                            onClick={() => removeDocument('gst')}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {formData.documents.gst ? (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <FileText className="h-4 w-4" />
                          <span>{formData.documents.gst.name}</span>
                          <span className="text-gray-400">({formatFileSize(formData.documents.gst.size)})</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <label className="cursor-pointer flex flex-col items-center">
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-600">Click to upload GST Certificate</span>
                            <span className="text-xs text-gray-400">PDF, JPEG, PNG (Max 5MB)</span>
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleFileUpload('gst', e.target.files[0])}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PAN Card - Both Individual and Company */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">PAN Card</label>
                      {formData.documents.pan && (
                        <button
                          type="button"
                          onClick={() => removeDocument('pan')}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {formData.documents.pan ? (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <FileText className="h-4 w-4" />
                        <span>{formData.documents.pan.name}</span>
                        <span className="text-gray-400">({formatFileSize(formData.documents.pan.size)})</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <label className="cursor-pointer flex flex-col items-center">
                          <Upload className="h-8 w-8 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-600">Click to upload PAN Card</span>
                          <span className="text-xs text-gray-400">PDF, JPEG, PNG (Max 5MB)</span>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileUpload('pan', e.target.files[0])}
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Aadhaar Card - Individual only */}
                  {formData.clientType === 'individual' && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">Aadhaar Card</label>
                        {formData.documents.aadhaar && (
                          <button
                            type="button"
                            onClick={() => removeDocument('aadhaar')}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {formData.documents.aadhaar ? (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <FileText className="h-4 w-4" />
                          <span>{formData.documents.aadhaar.name}</span>
                          <span className="text-gray-400">({formatFileSize(formData.documents.aadhaar.size)})</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <label className="cursor-pointer flex flex-col items-center">
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-600">Click to upload Aadhaar Card</span>
                            <span className="text-xs text-gray-400">PDF, JPEG, PNG (Max 5MB)</span>
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleFileUpload('aadhaar', e.target.files[0])}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Company Registration - Company only */}
                  {formData.clientType === 'company' && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">Company Registration Certificate</label>
                        {formData.documents.companyRegistration && (
                          <button
                            type="button"
                            onClick={() => removeDocument('companyRegistration')}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {formData.documents.companyRegistration ? (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <FileText className="h-4 w-4" />
                          <span>{formData.documents.companyRegistration.name}</span>
                          <span className="text-gray-400">({formatFileSize(formData.documents.companyRegistration.size)})</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <label className="cursor-pointer flex flex-col items-center">
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-600">Click to upload Registration Certificate</span>
                            <span className="text-xs text-gray-400">PDF, JPEG, PNG (Max 5MB)</span>
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleFileUpload('companyRegistration', e.target.files[0])}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Other Documents */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Other Documents</label>
                    </div>
                    
                    {/* Display uploaded other documents */}
                    {formData.documents.other.length > 0 && (
                      <div className="mb-4 space-y-2">
                        {formData.documents.other.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <FileText className="h-4 w-4" />
                              <span>{doc.name}</span>
                              <span className="text-gray-400">({formatFileSize(doc.size)})</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeDocument('other', doc.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-center">
                      <label className="cursor-pointer flex flex-col items-center">
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600">Click to upload additional documents</span>
                        <span className="text-xs text-gray-400">PDF, JPEG, PNG (Max 5MB each)</span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload('other', e.target.files[0])}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedClient(null);
                    resetForm();
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {selectedClient ? 'Update' : 'Create'} Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;