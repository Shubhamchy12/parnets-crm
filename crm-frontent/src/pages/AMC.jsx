import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Shield,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Settings,
  RefreshCw
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

  // Mock AMC data
  const mockAMCContracts = [
    {
      _id: '1',
      contractNumber: 'AMC-2024-001',
      clientName: 'TechCorp Solutions',
      projectName: 'E-commerce Website',
      serviceType: 'website_maintenance',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      renewalDate: '2024-12-31',
      amount: 120000,
      paymentFrequency: 'monthly',
      status: 'active',
      description: 'Complete website maintenance and support',
      services: ['Bug fixes', 'Security updates', 'Content updates', '24/7 support'],
      contactPerson: 'Rajesh Kumar',
      contactEmail: 'rajesh@techcorp.com',
      contactPhone: '+91-9876543210',
      lastServiceDate: '2024-01-15',
      nextServiceDate: '2024-02-15'
    },
    {
      _id: '2',
      contractNumber: 'AMC-2024-002',
      clientName: 'Digital Solutions Inc',
      projectName: 'Mobile Application',
      serviceType: 'app_maintenance',
      startDate: '2024-01-15',
      endDate: '2024-01-14',
      renewalDate: '2024-01-14',
      amount: 180000,
      paymentFrequency: 'quarterly',
      status: 'expiring_soon',
      description: 'Mobile app maintenance and updates',
      services: ['App updates', 'Bug fixes', 'Performance optimization', 'Store management'],
      contactPerson: 'Priya Sharma',
      contactEmail: 'priya@digitalsolutions.com',
      contactPhone: '+91-9876543211',
      lastServiceDate: '2024-01-10',
      nextServiceDate: '2024-02-10'
    },
    {
      _id: '3',
      contractNumber: 'AMC-2023-015',
      clientName: 'StartupXYZ',
      projectName: 'Company Website',
      serviceType: 'hosting_support',
      startDate: '2023-06-01',
      endDate: '2023-12-31',
      renewalDate: '2023-12-31',
      amount: 60000,
      paymentFrequency: 'annually',
      status: 'expired',
      description: 'Hosting and basic support services',
      services: ['Hosting', 'SSL certificate', 'Basic support'],
      contactPerson: 'Amit Patel',
      contactEmail: 'amit@startupxyz.com',
      contactPhone: '+91-9876543212',
      lastServiceDate: '2023-12-15',
      nextServiceDate: null
    }
  ];

  useEffect(() => {
    loadAMCContracts();
  }, []);

  const loadAMCContracts = async () => {
    try {
      setLoading(true);
      // Try to fetch from API, fallback to mock data
      try {
        const response = await api.get('/amc');
        if (response.success) {
          setAmcContracts(response.data.contracts);
        }
      } catch (err) {
        // Use mock data if API fails
        setAmcContracts(mockAMCContracts);
      }
    } catch (err) {
      console.error('Error loading AMC contracts:', err);
      setAmcContracts(mockAMCContracts);
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
      case 'active': return 'bg-green-100 text-green-800';
      case 'expiring_soon': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">AMC Management</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add AMC Contract</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-blue-600">₹{totalValue.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-yellow-600">{expiringCount}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expired</p>
              <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search AMC contracts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="expiring_soon">Expiring Soon</option>
            <option value="expired">Expired</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* AMC Contracts List */}
      <div className="card">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading AMC contracts...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contract
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Renewal Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContracts.map((contract) => (
                  <tr key={contract._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Shield className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{contract.contractNumber}</div>
                          <div className="text-sm text-gray-500">{contract.projectName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{contract.clientName}</div>
                      <div className="text-sm text-gray-500">{contract.contactPerson}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {contract.serviceType.replace('_', ' ').toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">₹{contract.amount.toLocaleString()}</div>
                      <div className="text-sm text-gray-500">{contract.paymentFrequency}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(contract.status)}
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(contract.status)}`}>
                          {contract.status.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(contract.renewalDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="text-green-600 hover:text-green-900">
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button className="text-orange-600 hover:text-orange-900">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-900">
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

      {/* Add/Edit AMC Contract Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {selectedContract ? 'Edit AMC Contract' : 'Add New AMC Contract'}
              </h2>
              <button 
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contract Number *
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name *
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name *
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Type *
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Annual Amount *
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Frequency *
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person *
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email *
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
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
                  {selectedContract ? 'Update' : 'Add'} Contract
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