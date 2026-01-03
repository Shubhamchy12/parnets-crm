import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Receipt,
  Calendar,
  CreditCard
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    clientId: '',
    projectId: '',
    amount: '',
    paymentType: 'full', // full or installment
    installmentDetails: {
      totalInstallments: 1,
      currentInstallment: 1,
      installmentAmount: '',
      remainingAmount: ''
    },
    paymentMethod: 'bank_transfer',
    status: 'pending',
    dueDate: '',
    paidDate: '',
    description: '',
    reference: ''
  });

  // Mock clients data
  const mockClients = [
    { _id: '1', name: 'TechCorp Solutions', company: 'TechCorp Solutions' },
    { _id: '2', name: 'Digital Solutions Inc', company: 'Digital Solutions Inc' },
    { _id: '3', name: 'StartupXYZ', company: 'StartupXYZ' },
    { _id: '4', name: 'InnovateSoft Pvt Ltd', company: 'InnovateSoft Pvt Ltd' }
  ];

  // Mock projects data
  const mockProjects = [
    { _id: '1', name: 'E-commerce Website', client: { _id: '1', company: 'TechCorp Solutions' }, budget: { estimated: 500000 } },
    { _id: '2', name: 'Mobile App Development', client: { _id: '2', company: 'Digital Solutions Inc' }, budget: { estimated: 750000 } },
    { _id: '3', name: 'Website Maintenance', client: { _id: '3', company: 'StartupXYZ' }, budget: { estimated: 250000 } },
    { _id: '4', name: 'CRM System', client: { _id: '4', company: 'InnovateSoft Pvt Ltd' }, budget: { estimated: 600000 } }
  ];

  // Mock payment data with installments
  const mockPayments = [
    {
      _id: '1',
      invoiceNumber: 'INV-2024-001',
      client: { _id: '1', name: 'TechCorp Solutions', company: 'TechCorp Solutions' },
      project: { _id: '1', name: 'E-commerce Website' },
      amount: 500000,
      paymentType: 'full',
      paymentMethod: 'bank_transfer',
      status: 'paid',
      dueDate: '2024-01-15',
      paidDate: '2024-01-14',
      description: 'E-commerce Website Development - Full Payment',
      reference: 'TXN123456789',
      createdAt: '2024-01-01'
    },
    {
      _id: '2',
      invoiceNumber: 'INV-2024-002',
      client: { _id: '2', name: 'Digital Solutions Inc', company: 'Digital Solutions Inc' },
      project: { _id: '2', name: 'Mobile App Development' },
      amount: 250000,
      paymentType: 'installment',
      installmentDetails: {
        totalInstallments: 3,
        currentInstallment: 1,
        installmentAmount: 250000,
        remainingAmount: 500000
      },
      paymentMethod: 'credit_card',
      status: 'pending',
      dueDate: '2024-01-20',
      paidDate: null,
      description: 'Mobile App Development - Installment 1 of 3',
      reference: '',
      createdAt: '2024-01-05'
    },
    {
      _id: '3',
      invoiceNumber: 'INV-2024-003',
      client: { _id: '2', name: 'Digital Solutions Inc', company: 'Digital Solutions Inc' },
      project: { _id: '2', name: 'Mobile App Development' },
      amount: 250000,
      paymentType: 'installment',
      installmentDetails: {
        totalInstallments: 3,
        currentInstallment: 2,
        installmentAmount: 250000,
        remainingAmount: 250000
      },
      paymentMethod: 'credit_card',
      status: 'paid',
      dueDate: '2024-02-20',
      paidDate: '2024-02-18',
      description: 'Mobile App Development - Installment 2 of 3',
      reference: 'TXN987654321',
      createdAt: '2024-02-05'
    },
    {
      _id: '4',
      invoiceNumber: 'INV-2024-004',
      client: { _id: '3', name: 'StartupXYZ', company: 'StartupXYZ' },
      project: { _id: '3', name: 'Website Maintenance' },
      amount: 125000,
      paymentType: 'installment',
      installmentDetails: {
        totalInstallments: 2,
        currentInstallment: 1,
        installmentAmount: 125000,
        remainingAmount: 125000
      },
      paymentMethod: 'upi',
      status: 'overdue',
      dueDate: '2023-12-30',
      paidDate: null,
      description: 'Website Maintenance - Installment 1 of 2',
      reference: '',
      createdAt: '2023-12-15'
    }
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      // Load clients, projects, and payments
      await Promise.all([
        loadClients(),
        loadProjects(),
        loadPayments()
      ]);
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await api.get('/clients');
      if (response.success) {
        setClients(response.data.clients);
      }
    } catch (err) {
      setClients(mockClients);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await api.get('/projects');
      if (response.success) {
        setProjects(response.data.projects);
      }
    } catch (err) {
      setProjects(mockProjects);
    }
  };

  const loadPayments = async () => {
    try {
      const response = await api.get('/payments');
      if (response.success) {
        setPayments(response.data.payments);
      }
    } catch (err) {
      setPayments(mockPayments);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNestedInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  // Auto-generate invoice number
  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}${day}-${random}`;
  };

  // Handle client selection and auto-populate amount
  const handleClientChange = (clientId) => {
    setFormData(prev => ({
      ...prev,
      clientId: clientId,
      projectId: '', // Reset project when client changes
      amount: ''
    }));
  };

  // Handle project selection and auto-populate amount
  const handleProjectChange = (projectId) => {
    const selectedProject = projects.find(p => p._id === projectId);
    if (selectedProject) {
      const projectAmount = selectedProject.budget?.estimated || 0;
      setFormData(prev => ({
        ...prev,
        projectId: projectId,
        amount: projectAmount.toString()
      }));
    }
  };

  // Handle payment type change
  const handlePaymentTypeChange = (paymentType) => {
    setFormData(prev => ({
      ...prev,
      paymentType: paymentType,
      installmentDetails: {
        totalInstallments: paymentType === 'installment' ? 2 : 1,
        currentInstallment: 1,
        installmentAmount: paymentType === 'installment' ? Math.floor(prev.amount / 2).toString() : prev.amount,
        remainingAmount: paymentType === 'installment' ? (prev.amount - Math.floor(prev.amount / 2)).toString() : '0'
      }
    }));
  };

  // Calculate installment amounts
  const calculateInstallments = (totalAmount, totalInstallments, currentInstallment) => {
    const amount = parseFloat(totalAmount) || 0;
    const installmentAmount = Math.floor(amount / totalInstallments);
    const remainingAmount = amount - (installmentAmount * currentInstallment);
    
    setFormData(prev => ({
      ...prev,
      installmentDetails: {
        ...prev.installmentDetails,
        installmentAmount: installmentAmount.toString(),
        remainingAmount: remainingAmount.toString()
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedPayment) {
        // Update payment
        console.log('Updating payment:', formData);
      } else {
        // Create new payment
        console.log('Creating payment:', formData);
      }
      setShowModal(false);
      resetForm();
      loadPayments();
    } catch (err) {
      console.error('Error saving payment:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      invoiceNumber: generateInvoiceNumber(),
      clientId: '',
      projectId: '',
      amount: '',
      paymentType: 'full',
      installmentDetails: {
        totalInstallments: 1,
        currentInstallment: 1,
        installmentAmount: '',
        remainingAmount: ''
      },
      paymentMethod: 'bank_transfer',
      status: 'pending',
      dueDate: '',
      paidDate: '',
      description: '',
      reference: ''
    });
    setSelectedPayment(null);
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'overdue': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (payment.client?.company || payment.clientName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const paidAmount = payments.filter(p => p.status === 'paid').reduce((sum, payment) => sum + payment.amount, 0);
  const pendingAmount = payments.filter(p => p.status === 'pending').reduce((sum, payment) => sum + payment.amount, 0);
  const overdueAmount = payments.filter(p => p.status === 'overdue').reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
        <button 
          onClick={openModal}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Payment</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-blue-600">₹{totalAmount.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Paid</p>
              <p className="text-2xl font-bold text-green-600">₹{paidAmount.toLocaleString()}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">₹{pendingAmount.toLocaleString()}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-red-600">₹{overdueAmount.toLocaleString()}</p>
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
              placeholder="Search payments..."
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
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
          <button className="btn-secondary flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Payments List */}
      <div className="card">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading payments...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client & Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount & Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Receipt className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{payment.invoiceNumber}</div>
                          <div className="text-sm text-gray-500">{payment.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {payment.client?.company || payment.clientName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {payment.project?.name || 'No project'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          ₹{payment.amount.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {payment.paymentType === 'installment' ? (
                            <span className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                              Installment {payment.installmentDetails?.currentInstallment}/{payment.installmentDetails?.totalInstallments}
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                              Full Payment
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.paymentMethod.replace('_', ' ').toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(payment.status)}
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(payment.dueDate).toLocaleDateString()}
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

      {/* Add/Edit Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {selectedPayment ? 'Edit Payment' : 'Create New Payment'}
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

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Invoice Number *
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        name="invoiceNumber"
                        value={formData.invoiceNumber}
                        onChange={handleInputChange}
                        className="input-field flex-1"
                        required
                        readOnly
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({...prev, invoiceNumber: generateInvoiceNumber()}))}
                        className="ml-2 px-3 py-2 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
                      >
                        Generate
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Auto-generated invoice number</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Type *
                    </label>
                    <select
                      value={formData.paymentType}
                      onChange={(e) => handlePaymentTypeChange(e.target.value)}
                      className="input-field"
                      required
                    >
                      <option value="full">Full Payment</option>
                      <option value="installment">Installment Payment</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Client *
                    </label>
                    <select
                      value={formData.clientId}
                      onChange={(e) => handleClientChange(e.target.value)}
                      className="input-field"
                      required
                    >
                      <option value="">Choose a client</option>
                      {clients.map(client => (
                        <option key={client._id} value={client._id}>
                          {client.company || client.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Project
                    </label>
                    <select
                      value={formData.projectId}
                      onChange={(e) => handleProjectChange(e.target.value)}
                      className="input-field"
                      disabled={!formData.clientId}
                    >
                      <option value="">Choose a project</option>
                      {projects
                        .filter(project => project.client?._id === formData.clientId)
                        .map(project => (
                          <option key={project._id} value={project._id}>
                            {project.name} - ₹{project.budget?.estimated?.toLocaleString() || 0}
                          </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Amount will auto-populate from project budget</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Amount *
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={(e) => {
                        handleInputChange(e);
                        if (formData.paymentType === 'installment') {
                          calculateInstallments(e.target.value, formData.installmentDetails.totalInstallments, formData.installmentDetails.currentInstallment);
                        }
                      }}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      name="dueDate"
                      value={formData.dueDate}
                      onChange={handleInputChange}
                      className="input-field"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Installment Details */}
              {formData.paymentType === 'installment' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Installment Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Installments *
                      </label>
                      <select
                        value={formData.installmentDetails.totalInstallments}
                        onChange={(e) => {
                          const totalInstallments = parseInt(e.target.value);
                          handleNestedInputChange('installmentDetails', 'totalInstallments', totalInstallments);
                          calculateInstallments(formData.amount, totalInstallments, formData.installmentDetails.currentInstallment);
                        }}
                        className="input-field"
                      >
                        <option value={2}>2 Installments</option>
                        <option value={3}>3 Installments</option>
                        <option value={4}>4 Installments</option>
                        <option value={6}>6 Installments</option>
                        <option value={12}>12 Installments</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Installment *
                      </label>
                      <select
                        value={formData.installmentDetails.currentInstallment}
                        onChange={(e) => {
                          const currentInstallment = parseInt(e.target.value);
                          handleNestedInputChange('installmentDetails', 'currentInstallment', currentInstallment);
                          calculateInstallments(formData.amount, formData.installmentDetails.totalInstallments, currentInstallment);
                        }}
                        className="input-field"
                      >
                        {Array.from({length: formData.installmentDetails.totalInstallments}, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            Installment {i + 1}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        This Installment Amount
                      </label>
                      <input
                        type="number"
                        value={formData.installmentDetails.installmentAmount}
                        onChange={(e) => handleNestedInputChange('installmentDetails', 'installmentAmount', e.target.value)}
                        className="input-field"
                        readOnly
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Remaining Amount
                      </label>
                      <input
                        type="number"
                        value={formData.installmentDetails.remainingAmount}
                        className="input-field bg-gray-50"
                        readOnly
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Installment Summary</h4>
                    <div className="text-sm text-blue-800">
                      <p>Total Project Amount: ₹{parseFloat(formData.amount || 0).toLocaleString()}</p>
                      <p>Installment {formData.installmentDetails.currentInstallment} of {formData.installmentDetails.totalInstallments}: ₹{parseFloat(formData.installmentDetails.installmentAmount || 0).toLocaleString()}</p>
                      <p>Remaining after this payment: ₹{parseFloat(formData.installmentDetails.remainingAmount || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method *
                    </label>
                    <select
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handleInputChange}
                      className="input-field"
                      required
                    >
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="debit_card">Debit Card</option>
                      <option value="upi">UPI</option>
                      <option value="cash">Cash</option>
                      <option value="cheque">Cheque</option>
                    </select>
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
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Paid Date
                    </label>
                    <input
                      type="date"
                      name="paidDate"
                      value={formData.paidDate}
                      onChange={handleInputChange}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reference Number
                    </label>
                    <input
                      type="text"
                      name="reference"
                      value={formData.reference}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="Transaction reference"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="input-field"
                    rows="3"
                    placeholder="Payment description..."
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
                  {selectedPayment ? 'Update' : 'Create'} Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;