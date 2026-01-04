import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Package,
  Truck,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  ShoppingCart,
  Building,
  Calculator
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const Procurement = () => {
  const [procurements, setProcurements] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedProcurement, setSelectedProcurement] = useState(null);
  const [formData, setFormData] = useState({
    poNumber: '',
    vendorId: '',
    vendorName: '',
    category: 'mobile_app',
    items: '',
    quantity: 1,
    unitPrice: '',
    totalAmount: '',
    status: 'pending',
    orderDate: '',
    expectedDelivery: '',
    actualDelivery: '',
    description: ''
  });

  // Mock vendors data
  const mockVendors = [
    { _id: '1', name: 'TechSoft Solutions', company: 'TechSoft Solutions', category: 'software_development', contact: '+91-9876543210' },
    { _id: '2', name: 'Mobile Masters', company: 'Mobile Masters Pvt Ltd', category: 'mobile_development', contact: '+91-9876543211' },
    { _id: '3', name: 'WebCraft Studios', company: 'WebCraft Studios', category: 'web_development', contact: '+91-9876543212' },
    { _id: '4', name: 'Design Hub', company: 'Design Hub Creative', category: 'design_services', contact: '+91-9876543213' },
    { _id: '5', name: 'Cloud Services Inc', company: 'Cloud Services Inc', category: 'cloud_services', contact: '+91-9876543214' }
  ];

  // Mock procurement data with service categories
  const mockProcurements = [
    {
      _id: '1',
      poNumber: 'PO-2024-001',
      vendor: { _id: '2', name: 'Mobile Masters', company: 'Mobile Masters Pvt Ltd' },
      category: 'mobile_app',
      items: 'iOS & Android Mobile App Development',
      quantity: 1,
      unitPrice: 500000,
      totalAmount: 500000,
      status: 'in_progress',
      orderDate: '2024-01-01',
      expectedDelivery: '2024-03-01',
      actualDelivery: null,
      description: 'Complete mobile app development with backend integration',
      createdAt: '2024-01-01'
    },
    {
      _id: '2',
      poNumber: 'PO-2024-002',
      vendor: { _id: '3', name: 'WebCraft Studios', company: 'WebCraft Studios' },
      category: 'web_development',
      items: 'E-commerce Website Development',
      quantity: 1,
      unitPrice: 750000,
      totalAmount: 750000,
      status: 'delivered',
      orderDate: '2024-01-05',
      expectedDelivery: '2024-02-15',
      actualDelivery: '2024-02-14',
      description: 'Full-stack e-commerce website with payment gateway',
      createdAt: '2024-01-05'
    },
    {
      _id: '3',
      poNumber: 'PO-2024-003',
      vendor: { _id: '4', name: 'Design Hub', company: 'Design Hub Creative' },
      category: 'ui_ux_design',
      items: 'UI/UX Design for Mobile App',
      quantity: 2,
      unitPrice: 150000,
      totalAmount: 300000,
      status: 'pending',
      orderDate: '2024-01-10',
      expectedDelivery: '2024-01-25',
      actualDelivery: null,
      description: 'Complete UI/UX design for mobile and web applications',
      createdAt: '2024-01-10'
    },
    {
      _id: '4',
      poNumber: 'PO-2024-004',
      vendor: { _id: '5', name: 'Cloud Services Inc', company: 'Cloud Services Inc' },
      category: 'cloud_services',
      items: 'AWS Cloud Infrastructure Setup',
      quantity: 1,
      unitPrice: 200000,
      totalAmount: 200000,
      status: 'in_progress',
      orderDate: '2024-01-12',
      expectedDelivery: '2024-01-30',
      actualDelivery: null,
      description: 'Complete cloud infrastructure setup and configuration',
      createdAt: '2024-01-12'
    }
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadVendors(),
        loadProcurements()
      ]);
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadVendors = async () => {
    try {
      const response = await api.get('/vendors');
      if (response.success) {
        setVendors(response.data.vendors);
      }
    } catch (err) {
      setVendors(mockVendors);
    }
  };

  const loadProcurements = async () => {
    try {
      const response = await api.get('/procurement');
      if (response.success) {
        setProcurements(response.data.procurements);
      }
    } catch (err) {
      setProcurements(mockProcurements);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      };
      
      // Auto-calculate total amount when quantity or unit price changes
      if (name === 'quantity' || name === 'unitPrice') {
        const quantity = name === 'quantity' ? parseFloat(value) || 0 : parseFloat(prev.quantity) || 0;
        const unitPrice = name === 'unitPrice' ? parseFloat(value) || 0 : parseFloat(prev.unitPrice) || 0;
        updated.totalAmount = (quantity * unitPrice).toString();
      }
      
      return updated;
    });
  };

  // Auto-generate PO number
  const generatePONumber = () => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PO-${year}${month}${day}-${random}`;
  };

  // Handle vendor selection
  const handleVendorChange = (vendorId) => {
    const selectedVendor = vendors.find(v => v._id === vendorId);
    setFormData(prev => ({
      ...prev,
      vendorId: vendorId,
      vendorName: selectedVendor ? selectedVendor.company : ''
    }));
  };

  // Get category display name
  const getCategoryDisplayName = (category) => {
    const categoryMap = {
      'mobile_app': 'Mobile App Development',
      'web_development': 'Web Development',
      'ui_ux_design': 'UI/UX Design',
      'software_development': 'Software Development',
      'cloud_services': 'Cloud Services',
      'digital_marketing': 'Digital Marketing',
      'data_analytics': 'Data Analytics',
      'cybersecurity': 'Cybersecurity',
      'consulting': 'IT Consulting',
      'maintenance': 'Maintenance & Support'
    };
    return categoryMap[category] || category.replace('_', ' ').toUpperCase();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedProcurement) {
        // Update procurement
        console.log('Updating procurement:', formData);
      } else {
        // Create new procurement
        console.log('Creating procurement:', formData);
      }
      setShowModal(false);
      resetForm();
      loadProcurements();
    } catch (err) {
      console.error('Error saving procurement:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      poNumber: generatePONumber(),
      vendorId: '',
      vendorName: '',
      category: 'mobile_app',
      items: '',
      quantity: 1,
      unitPrice: '',
      totalAmount: '',
      status: 'pending',
      orderDate: '',
      expectedDelivery: '',
      actualDelivery: '',
      description: ''
    });
    setSelectedProcurement(null);
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress': return <Clock className="h-5 w-5 text-blue-500" />;
      case 'in_transit': return <Truck className="h-5 w-5 text-blue-500" />;
      case 'pending': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'cancelled': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'delayed': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default: return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'in_transit': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'delayed': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredProcurements = procurements.filter(procurement => {
    const matchesSearch = procurement.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (procurement.vendor?.company || procurement.vendor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         procurement.items.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || procurement.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = procurements.reduce((sum, procurement) => sum + procurement.totalAmount, 0);
  const completedCount = procurements.filter(p => p.status === 'delivered' || p.status === 'completed').length;
  const pendingCount = procurements.filter(p => p.status === 'pending').length;
  const inProgressCount = procurements.filter(p => p.status === 'in_progress' || p.status === 'in_transit').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-orange-500 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Procurement Management</h1>
            <p className="text-blue-100">Manage purchase orders and vendors</p>
          </div>
          <button 
            onClick={openModal}
            className="btn-primary bg-white/20 hover:bg-white/30 border border-white/30"
          >
            <Plus className="h-5 w-5" />
            Add Purchase Order
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-blue-600">₹{totalAmount.toLocaleString()}</p>
            </div>
            <ShoppingCart className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
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
              placeholder="Search purchase orders..."
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
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="delayed">Delayed</option>
          </select>
          <button className="btn-secondary flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Procurement List */}
      <div className="card">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading purchase orders...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PO Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor & Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service/Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expected Delivery
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProcurements.map((procurement) => (
                  <tr key={procurement._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{procurement.poNumber}</div>
                          <div className="text-sm text-gray-500">{getCategoryDisplayName(procurement.category)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {procurement.vendor?.company || procurement.vendor}
                        </div>
                        <div className="text-sm text-gray-500">
                          <span className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {getCategoryDisplayName(procurement.category)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{procurement.items}</div>
                      <div className="text-sm text-gray-500">Qty: {procurement.quantity}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{procurement.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(procurement.status)}
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(procurement.status)}`}>
                          {procurement.status.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(procurement.expectedDelivery).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="text-green-600 hover:text-green-900">
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

      {/* Add/Edit Procurement Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-orange-500 text-white p-6 rounded-t-lg">
              <h2 className="text-xl font-bold">
                {selectedProcurement ? 'Edit Purchase Order' : 'Create New Purchase Order'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Purchase Order Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PO Number *
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        name="poNumber"
                        value={formData.poNumber}
                        onChange={handleInputChange}
                        className="input-field flex-1"
                        required
                        readOnly
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({...prev, poNumber: generatePONumber()}))}
                        className="ml-2 px-3 py-2 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
                      >
                        Generate
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Auto-generated PO number</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Category *
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="input-field"
                      required
                    >
                      <option value="mobile_app">Mobile App Development</option>
                      <option value="web_development">Web Development</option>
                      <option value="ui_ux_design">UI/UX Design</option>
                      <option value="software_development">Software Development</option>
                      <option value="cloud_services">Cloud Services</option>
                      <option value="digital_marketing">Digital Marketing</option>
                      <option value="data_analytics">Data Analytics</option>
                      <option value="cybersecurity">Cybersecurity</option>
                      <option value="consulting">IT Consulting</option>
                      <option value="maintenance">Maintenance & Support</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Vendor *
                    </label>
                    <select
                      value={formData.vendorId}
                      onChange={(e) => handleVendorChange(e.target.value)}
                      className="input-field"
                      required
                    >
                      <option value="">Choose a vendor</option>
                      {vendors.map(vendor => (
                        <option key={vendor._id} value={vendor._id}>
                          {vendor.company} - {getCategoryDisplayName(vendor.category)}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Select vendor based on service category</p>
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
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="delayed">Delayed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Order Date *
                    </label>
                    <input
                      type="date"
                      name="orderDate"
                      value={formData.orderDate}
                      onChange={handleInputChange}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Delivery *
                    </label>
                    <input
                      type="date"
                      name="expectedDelivery"
                      value={formData.expectedDelivery}
                      onChange={handleInputChange}
                      className="input-field"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Service/Items Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Service Details</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service/Items Description *
                  </label>
                  <textarea
                    name="items"
                    value={formData.items}
                    onChange={handleInputChange}
                    className="input-field"
                    rows="3"
                    placeholder="Describe the service or items being procured..."
                    required
                  />
                </div>
              </div>

              {/* Pricing Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Calculator className="h-5 w-5 mr-2" />
                  Pricing Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      className="input-field"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Price (₹) *
                    </label>
                    <input
                      type="number"
                      name="unitPrice"
                      value={formData.unitPrice}
                      onChange={handleInputChange}
                      className="input-field"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Amount (₹)
                    </label>
                    <input
                      type="number"
                      name="totalAmount"
                      value={formData.totalAmount}
                      className="input-field bg-gray-50"
                      readOnly
                    />
                    <p className="text-xs text-gray-500 mt-1">Auto-calculated: Quantity × Unit Price</p>
                  </div>
                </div>

                {/* Pricing Summary */}
                {formData.quantity && formData.unitPrice && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Pricing Summary</h4>
                    <div className="text-sm text-blue-800">
                      <p>Quantity: {formData.quantity}</p>
                      <p>Unit Price: ₹{parseFloat(formData.unitPrice || 0).toLocaleString()}</p>
                      <p className="font-semibold">Total Amount: ₹{parseFloat(formData.totalAmount || 0).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="input-field"
                    rows="3"
                    placeholder="Any additional notes or requirements..."
                  />
                </div>
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