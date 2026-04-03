import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  RefreshCw,
  TrendingUp,
  ChevronDown,
  Printer
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const AMC = () => {
  const [amcContracts, setAmcContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [projects, setProjects] = useState([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [formData, setFormData] = useState({
    contractNumber: '',
    clientName: '',
    projectName: '',
    projectId: '',
    serviceType: 'website_maintenance',
    startDate: '',
    endDate: '',
    renewalDate: '',
    amount: '',
    paymentFrequency: 'monthly',
    status: 'active',
    description: '',
    services: [],
    contactPerson: '',
    contactEmail: '',
    contactPhone: ''
  });

  useEffect(() => {
    loadAMCContracts();
    loadProjects();
  }, []);

  const loadAMCContracts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/amc');
      if (response.data?.success) {
        setAmcContracts(response.data.data?.contracts || []);
      } else {
        setAmcContracts([]);
      }
    } catch (err) {
      console.error('Error loading AMC contracts:', err);
      setAmcContracts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await api.get('/projects', { params: { limit: 1000 } });
      console.log('Projects API Response:', response.data);
      if (response.data?.success) {
        const projectsList = response.data.data?.projects || [];
        console.log('Projects List:', projectsList);
        console.log('First Project Client:', projectsList[0]?.client);
        setProjects(projectsList);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
      toast.error('Failed to load projects');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProjectChange = (e) => {
    const projectId = e.target.value;
    if (!projectId) {
      setFormData(prev => ({
        ...prev,
        projectId: '',
        projectName: '',
        clientName: '',
        contactPerson: '',
        contactEmail: '',
        contactPhone: '',
        contractNumber: ''
      }));
      return;
    }

    const selectedProject = projects.find(p => p._id === projectId);
    if (selectedProject) {
      const client = selectedProject.client;
      
      console.log('Selected Project:', selectedProject);
      console.log('Client Data:', client);
      console.log('Client ContactPerson:', client?.contactPerson);
      
      // Get client name - try name first, then company
      const clientName = client?.name || client?.company || '';
      
      // Get contact person - try contactPerson.name first, then just name
      const contactPerson = client?.contactPerson?.name || client?.name || '';
      
      // Get contact email - try contactPerson.email first, then email
      const contactEmail = client?.contactPerson?.email || client?.email || '';
      
      // Get contact phone - try contactPerson.phone first, then phone
      // Ensure it's a string and has exactly 10 digits
      let contactPhone = client?.contactPerson?.phone || client?.phone || '';
      contactPhone = String(contactPhone).replace(/\D/g, ''); // Remove non-digits
      
      // Contract Number = Client's phone number (10 digits)
      const contractNumber = contactPhone;
      
      console.log('Auto-fill values:', {
        clientName,
        contactPerson,
        contactEmail,
        contactPhone,
        contractNumber
      });
      
      setFormData(prev => ({
        ...prev,
        projectId: selectedProject._id,
        projectName: selectedProject.name,
        clientName: clientName,
        contactPerson: contactPerson,
        contactEmail: contactEmail,
        contactPhone: contactPhone,
        contractNumber: contractNumber
      }));
      
      toast.success('Client details auto-filled from project');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedContract) {
        await api.put(`/amc/${selectedContract._id}`, formData);
        toast.success('Contract updated successfully');
      } else {
        await api.post('/amc', formData);
        toast.success('Contract created successfully');
      }
      setShowModal(false);
      resetForm();
      loadAMCContracts();
    } catch (err) {
      console.error('Error saving AMC contract:', err);
      toast.error(err.response?.data?.message || 'Failed to save contract');
    }
  };

  const handlePrint = (contract) => {
    setSelectedContract(contract);
    setFormData({
      contractNumber: contract.contractNumber || '',
      clientName: contract.clientName || '',
      projectName: contract.projectName || '',
      projectId: contract.projectId || '',
      serviceType: contract.serviceType || 'website_maintenance',
      startDate: contract.startDate ? contract.startDate.split('T')[0] : '',
      endDate: contract.endDate ? contract.endDate.split('T')[0] : '',
      renewalDate: contract.renewalDate ? contract.renewalDate.split('T')[0] : '',
      amount: contract.amount || '',
      paymentFrequency: contract.paymentFrequency || 'monthly',
      status: contract.status || 'active',
      description: contract.description || '',
      services: contract.services || [],
      contactPerson: contract.contactPerson || '',
      contactEmail: contract.contactEmail || '',
      contactPhone: contract.contactPhone || ''
    });
    setIsPrinting(true);
    
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const handleEdit = (contract) => {
    setSelectedContract(contract);
    setFormData({
      contractNumber: contract.contractNumber || '',
      clientName: contract.clientName || '',
      projectName: contract.projectName || '',
      projectId: contract.projectId || '',
      serviceType: contract.serviceType || 'website_maintenance',
      startDate: contract.startDate ? contract.startDate.split('T')[0] : '',
      endDate: contract.endDate ? contract.endDate.split('T')[0] : '',
      renewalDate: contract.renewalDate ? contract.renewalDate.split('T')[0] : '',
      amount: contract.amount || '',
      paymentFrequency: contract.paymentFrequency || 'monthly',
      status: contract.status || 'active',
      description: contract.description || '',
      services: contract.services || [],
      contactPerson: contract.contactPerson || '',
      contactEmail: contract.contactEmail || '',
      contactPhone: contract.contactPhone || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this contract?')) return;
    
    try {
      await api.delete(`/amc/${id}`);
      toast.success('Contract deleted successfully');
      loadAMCContracts();
    } catch (err) {
      console.error('Error deleting contract:', err);
      toast.error('Failed to delete contract');
    }
  };

  const handleRenew = async (contract) => {
    try {
      const renewalDate = new Date(contract.endDate);
      renewalDate.setFullYear(renewalDate.getFullYear() + 1);
      
      const renewedData = {
        ...contract,
        startDate: contract.endDate,
        endDate: renewalDate.toISOString().split('T')[0],
        renewalDate: renewalDate.toISOString().split('T')[0],
        status: 'active'
      };
      
      await api.post('/amc', renewedData);
      toast.success('Contract renewed successfully');
      loadAMCContracts();
    } catch (err) {
      console.error('Error renewing contract:', err);
      toast.error('Failed to renew contract');
    }
  };

  const handleView = (contract) => {
    setSelectedContract(contract);
    setFormData({
      contractNumber: contract.contractNumber || '',
      clientName: contract.clientName || '',
      projectName: contract.projectName || '',
      projectId: contract.projectId || '',
      serviceType: contract.serviceType || 'website_maintenance',
      startDate: contract.startDate ? contract.startDate.split('T')[0] : '',
      endDate: contract.endDate ? contract.endDate.split('T')[0] : '',
      renewalDate: contract.renewalDate ? contract.renewalDate.split('T')[0] : '',
      amount: contract.amount || '',
      paymentFrequency: contract.paymentFrequency || 'monthly',
      status: contract.status || 'active',
      description: contract.description || '',
      services: contract.services || [],
      contactPerson: contract.contactPerson || '',
      contactEmail: contract.contactEmail || '',
      contactPhone: contract.contactPhone || ''
    });
    // For view mode, we'll use the same modal but make fields readonly
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      contractNumber: '',
      clientName: '',
      projectName: '',
      projectId: '',
      serviceType: 'website_maintenance',
      startDate: '',
      endDate: '',
      renewalDate: '',
      amount: '',
      paymentFrequency: 'monthly',
      status: 'active',
      description: '',
      services: [],
      contactPerson: '',
      contactEmail: '',
      contactPhone: ''
    });
    setSelectedContract(null);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'expiring_soon': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'expired': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'suspended': return <Clock className="h-5 w-5 text-gray-500" />;
      default: return <Shield className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'badge-success';
      case 'expiring_soon': return 'badge-warning';
      case 'expired': return 'badge-error';
      case 'suspended': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredContracts = amcContracts.filter(contract => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (contract.contractNumber || '').toLowerCase().includes(term) ||
                         (contract.clientName || '').toLowerCase().includes(term) ||
                         (contract.projectName || '').toLowerCase().includes(term);
    const matchesStatus = statusFilter === '' || contract.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalValue = amcContracts.reduce((sum, contract) => sum + contract.amount, 0);
  const activeCount = amcContracts.filter(c => c.status === 'active').length;
  const expiringCount = amcContracts.filter(c => c.status === 'expiring_soon').length;
  const expiredCount = amcContracts.filter(c => c.status === 'expired').length;

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          
          body * { visibility: hidden; }
          #printable-contract, #printable-contract * { visibility: visible; }
          #printable-contract { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            background: white;
          }
          .no-print { display: none !important; }
          
          .print-header {
            margin-bottom: 20px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 12px;
          }
          
          .print-logo {
            max-height: 60px;
            width: auto;
          }
          
          .print-company-info {
            font-size: 10px;
            line-height: 1.6;
            color: #475569;
            text-align: right;
          }
          
          .print-title {
            font-size: 22px;
            font-weight: bold;
            color: #1e293b;
          }
          
          .print-subtitle {
            font-size: 11px;
            color: #64748b;
          }
          
          .print-section {
            margin-top: 15px;
            page-break-inside: avoid;
          }
          
          .print-section-title {
            font-size: 13px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 10px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 5px;
          }
          
          .print-field {
            margin-bottom: 8px;
            padding: 8px;
            background: #f8fafc;
          }
          
          .print-field-label {
            font-size: 9px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          
          .print-field-value {
            font-size: 12px;
            color: #1e293b;
            font-weight: 500;
          }
          
          .print-amount {
            font-size: 20px;
            font-weight: bold;
            color: #2563eb;
          }
          
          .print-footer {
            margin-top: 20px;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
            font-size: 9px;
            color: #64748b;
          }
          
          .print-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
          }
          
          .print-badge-active {
            background: #d1fae5;
            color: #065f46;
          }
          
          .print-badge-expired {
            background: #fee2e2;
            color: #991b1b;
          }
        }
      `}</style>

      {/* Hidden Print Area */}
      {isPrinting && selectedContract && (
        <div id="printable-contract" className="hidden print:block">
          {/* Header Section */}
          <div className="print-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="print-title">AMC Contract</div>
                <div className="print-subtitle">
                  Contract No: <strong>{selectedContract.contractNumber}</strong>
                </div>
                <div className="print-subtitle" style={{ marginTop: '4px' }}>
                  Generated: {format(new Date(), 'dd MMM yyyy, hh:mm a')}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <img 
                  src="/logo.jpg" 
                  alt="ParNets Logo" 
                  className="print-logo"
                  style={{ marginBottom: '10px' }}
                />
                <div className="print-company-info">
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px', lineHeight: '1.4' }}>
                    ParNets Software India Pvt Ltd
                  </div>
                  <div style={{ fontSize: '10px', lineHeight: '1.6', color: '#475569' }}>
                    <div style={{ marginBottom: '3px' }}>So104/1/50, Singapura Main Rd,</div>
                    <div style={{ marginBottom: '3px' }}>Singapura Village, Varadharaja Nagar,</div>
                    <div style={{ marginBottom: '3px' }}>Vidyaranyapura, Bengaluru,</div>
                    <div style={{ marginBottom: '8px' }}>Karnataka 560097</div>
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 'bold', color: '#2563eb', marginBottom: '4px' }}>GST: 29AANCP7155K1ZN</div>
                      <div style={{ marginBottom: '2px' }}>Contact: 095909 26068</div>
                      <div style={{ color: '#2563eb' }}>hello@parnetsgroup.com</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contract Overview */}
          <div className="print-section">
            <div className="print-section-title">Contract Overview</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="print-field">
                <div className="print-field-label">Status</div>
                <div className="print-field-value">
                  <span className={`print-badge ${selectedContract.status === 'active' ? 'print-badge-active' : 'print-badge-expired'}`}>
                    {(selectedContract.status || '').replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="print-field">
                <div className="print-field-label">Annual Amount</div>
                <div className="print-field-value print-amount">
                  ₹{(selectedContract.amount || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="print-field">
                <div className="print-field-label">Service Type</div>
                <div className="print-field-value">
                  {(selectedContract.serviceType || '').replace('_', ' ')}
                </div>
              </div>
              <div className="print-field">
                <div className="print-field-label">Payment Frequency</div>
                <div className="print-field-value">
                  {(selectedContract.paymentFrequency || '').replace('_', ' ')}
                </div>
              </div>
            </div>
          </div>

          {/* Client Details */}
          <div className="print-section">
            <div className="print-section-title">Client Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="print-field">
                <div className="print-field-label">Client Name</div>
                <div className="print-field-value">{selectedContract.clientName || '—'}</div>
              </div>
              <div className="print-field">
                <div className="print-field-label">Project Name</div>
                <div className="print-field-value">{selectedContract.projectName || '—'}</div>
              </div>
              <div className="print-field">
                <div className="print-field-label">Contact Person</div>
                <div className="print-field-value">{selectedContract.contactPerson || '—'}</div>
              </div>
              <div className="print-field">
                <div className="print-field-label">Contact Email</div>
                <div className="print-field-value">{selectedContract.contactEmail || '—'}</div>
              </div>
              <div className="print-field">
                <div className="print-field-label">Contact Phone</div>
                <div className="print-field-value">{selectedContract.contactPhone || '—'}</div>
              </div>
            </div>
          </div>

          {/* Contract Period */}
          <div className="print-section">
            <div className="print-section-title">Contract Period</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div className="print-field">
                <div className="print-field-label">Start Date</div>
                <div className="print-field-value">
                  {selectedContract.startDate ? format(new Date(selectedContract.startDate), 'dd MMM yyyy') : '—'}
                </div>
              </div>
              <div className="print-field">
                <div className="print-field-label">End Date</div>
                <div className="print-field-value">
                  {selectedContract.endDate ? format(new Date(selectedContract.endDate), 'dd MMM yyyy') : '—'}
                </div>
              </div>
              <div className="print-field">
                <div className="print-field-label">Renewal Date</div>
                <div className="print-field-value">
                  {selectedContract.renewalDate ? format(new Date(selectedContract.renewalDate), 'dd MMM yyyy') : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {selectedContract.description && (
            <div className="print-section">
              <div className="print-section-title">Description</div>
              <div className="print-field">
                <div className="print-field-value">{selectedContract.description}</div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="print-footer">
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '8px', fontWeight: '600', fontSize: '11px' }}>
                Thank you for choosing ParNets Software India Pvt Ltd
              </div>
              <div style={{ marginBottom: '5px', fontSize: '10px' }}>
                This is a computer-generated document. No physical signature is required.
              </div>
              <div style={{ fontSize: '10px', marginBottom: '8px' }}>
                For any queries, please contact us at <strong>hello@parnetsgroup.com</strong> or call <strong>095909 26068</strong>
              </div>
              <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '10px' }}>
                Document ID: AMC-{selectedContract._id?.slice(-8).toUpperCase()} | Generated on {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}
              </div>
            </div>
          </div>
        </div>
      )}

    <div className="space-y-6 no-print">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-orange-500 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AMC Management</h1>
            <p className="text-blue-100">Annual Maintenance Contracts</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            <Plus className="h-5 w-5" />
            Add Contract
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-blue-600">₹{totalValue.toLocaleString()}</p>
              <div className="flex items-center space-x-1 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">+12%</span>
              </div>
            </div>
            <div className="bg-blue-600 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">{activeCount}</p>
              <p className="text-sm text-gray-500">{activeCount} contracts</p>
            </div>
            <div className="bg-green-600 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-yellow-600">{expiringCount}</p>
              <p className="text-sm text-yellow-600">Needs attention</p>
            </div>
            <div className="bg-yellow-500 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expired</p>
              <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
              <p className="text-sm text-red-600">Renewal required</p>
            </div>
            <div className="bg-red-500 p-3 rounded-lg">
              <XCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search contracts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field min-w-[150px]"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="expiring_soon">Expiring Soon</option>
            <option value="expired">Expired</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="table-container">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading contracts...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Contract
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Client & Contact Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Service & Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Renewal Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Shield className="h-12 w-12 text-gray-300" />
                        <p className="text-gray-500 font-medium">No AMC contracts found</p>
                        <p className="text-sm text-gray-400">
                          {searchTerm || statusFilter 
                            ? 'Try adjusting your filters' 
                            : 'Click "Add Contract" to create your first AMC contract'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredContracts.map((contract) => (
                  <tr key={contract._id} className="table-row">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-600 rounded-lg p-2">
                          <Shield className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{contract.contractNumber}</div>
                          <div className="text-sm text-gray-500">{contract.projectName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{contract.clientName}</div>
                      <div className="text-sm text-gray-500">{contract.contactPerson}</div>
                      <div className="text-xs text-blue-600 mt-1">{contract.contactEmail}</div>
                      <div className="text-xs text-green-600">{contract.contactPhone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">₹{(contract.amount ?? 0).toLocaleString()}</div>
                      <div className="text-sm text-gray-500 capitalize">{(contract.serviceType || '').replace('_', ' ')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(contract.status)}
                        <span className={`badge ${getStatusColor(contract.status)}`}>
                          {(contract.status || '').replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {new Date(contract.renewalDate).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {Math.ceil((new Date(contract.renewalDate) - new Date()) / (1000 * 60 * 60 * 24))} days left
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleView(contract)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handlePrint(contract)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Print Contract"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleRenew(contract)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Renew Contract"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleEdit(contract)}
                          className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Edit Contract"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(contract._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Contract"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
                )}
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
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">
                  {selectedContract ? 'Edit AMC Contract' : 'Add New AMC Contract'}
                </h2>
                <button 
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-white hover:bg-white/20 rounded-lg p-2"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract Number (10 digits) *</label>
                  <input
                    type="tel"
                    name="contractNumber"
                    value={formData.contractNumber || ''}
                    onChange={handleInputChange}
                    className={`input-field ${formData.projectId && formData.contractNumber ? 'bg-green-50 border-green-300' : ''}`}
                    required
                    placeholder="Will auto-fill with client phone"
                    maxLength="10"
                    pattern="[0-9]{10}"
                  />
                  {formData.projectId && formData.contractNumber ? (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Auto-filled: {formData.contractNumber} ({formData.contractNumber.length} digits)
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Select a project to auto-fill</p>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name (Optional)</label>
                  <div className="relative">
                    <select
                      value={formData.projectId || ''}
                      onChange={handleProjectChange}
                      className="input-field appearance-none pr-10"
                    >
                      <option value="">Select a project...</option>
                      {projects.map((project) => (
                        <option key={project._id} value={project._id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                  <input
                    type="text"
                    name="clientName"
                    value={formData.clientName || ''}
                    onChange={handleInputChange}
                    className={`input-field ${formData.projectId && formData.clientName ? 'bg-green-50 border-green-300' : ''}`}
                    required
                    placeholder="Will auto-fill when project selected"
                  />
                  {formData.projectId && formData.clientName ? (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Auto-filled: {formData.clientName}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Select a project to auto-fill</p>
                  )}
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Type *</label>
                  <select
                    name="serviceType"
                    value={formData.serviceType}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  >
                    <option value="website_maintenance">Website Maintenance</option>
                    <option value="app_maintenance">App Maintenance</option>
                    <option value="hosting_support">Hosting Support</option>
                    <option value="software_support">Software Support</option>
                    <option value="technical_support">Technical Support</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Annual Amount *</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Frequency *</label>
                  <select
                    name="paymentFrequency"
                    value={formData.paymentFrequency}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="half_yearly">Half Yearly</option>
                    <option value="annually">Annually</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person *</label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson || ''}
                    onChange={handleInputChange}
                    className={`input-field ${formData.projectId && formData.contactPerson ? 'bg-green-50 border-green-300' : ''}`}
                    required
                    placeholder="Will auto-fill when project selected"
                  />
                  {formData.projectId && formData.contactPerson ? (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Auto-filled: {formData.contactPerson}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Select a project to auto-fill</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
                  <input
                    type="email"
                    name="contactEmail"
                    value={formData.contactEmail || ''}
                    onChange={handleInputChange}
                    className={`input-field ${formData.projectId && formData.contactEmail ? 'bg-green-50 border-green-300' : ''}`}
                    required
                    placeholder="Will auto-fill when project selected"
                  />
                  {formData.projectId && formData.contactEmail ? (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Auto-filled: {formData.contactEmail}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Select a project to auto-fill</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone (10 digits)</label>
                  <input
                    type="tel"
                    name="contactPhone"
                    value={formData.contactPhone || ''}
                    onChange={handleInputChange}
                    className={`input-field ${formData.projectId && formData.contactPhone ? 'bg-green-50 border-green-300' : ''}`}
                    placeholder="Will auto-fill when project selected"
                    maxLength="10"
                    pattern="[0-9]{10}"
                  />
                  {formData.projectId && formData.contactPhone ? (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Auto-filled: {formData.contactPhone} ({formData.contactPhone.length} digits)
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Select a project to auto-fill</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  >
                    <option value="active">Active</option>
                    <option value="expiring_soon">Expiring Soon</option>
                    <option value="expired">Expired</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="input-field"
                  rows="3"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {selectedContract ? 'Update' : 'Create'} Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default AMC;