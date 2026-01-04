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
  TrendingUp
} from 'lucide-react';
import api from '../services/api';

const AMC = () => {
  const [amcContracts, setAmcContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [formData, setFormData] = useState({
    contractNumber: '',
    clientName: '',
    projectName: '',
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
  }, []);

  const loadAMCContracts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/amc');
      if (response.success) {
        setAmcContracts(response.data.contracts || []);
      } else {
        setAmcContracts([]);
      }
    } catch (err) {
      console.error('Error loading AMC contracts:', err);
      toast.error('Failed to load AMC contracts');
      setAmcContracts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedContract) {
        // Update contract
        console.log('Updating AMC contract:', formData);
      } else {
        // Create new contract
        console.log('Creating AMC contract:', formData);
      }
      setShowModal(false);
      resetForm();
      loadAMCContracts();
    } catch (err) {
      console.error('Error saving AMC contract:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      contractNumber: '',
      clientName: '',
      projectName: '',
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
    const matchesSearch = contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.projectName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || contract.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalValue = amcContracts.reduce((sum, contract) => sum + contract.amount, 0);
  const activeCount = amcContracts.filter(c => c.status === 'active').length;
  const expiringCount = amcContracts.filter(c => c.status === 'expiring_soon').length;
  const expiredCount = amcContracts.filter(c => c.status === 'expired').length;

  return (
    <div className="space-y-6">
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
                    Client
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
                {filteredContracts.map((contract) => (
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
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">₹{contract.amount.toLocaleString()}</div>
                      <div className="text-sm text-gray-500 capitalize">{contract.serviceType.replace('_', ' ')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(contract.status)}
                        <span className={`badge ${getStatusColor(contract.status)}`}>
                          {contract.status.replace('_', ' ')}
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
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="h-4 w-4" />
                        </button>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract Number *</label>
                  <input
                    type="text"
                    name="contractNumber"
                    value={formData.contractNumber}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                  <input
                    type="text"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                  <input
                    type="text"
                    name="projectName"
                    value={formData.projectName}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
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
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
                  <input
                    type="email"
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    className="input-field"
                  />
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
  );
};

export default AMC;