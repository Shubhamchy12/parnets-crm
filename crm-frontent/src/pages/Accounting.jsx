import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  FileText,
  PieChart,
  BarChart3,
  Download,
  Upload,
  Printer
} from 'lucide-react';
import api from '../services/api';
import { format } from 'date-fns';

const Accounting = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [viewMode, setViewMode] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState({
    type: 'income',
    category: 'project_payment',
    amount: '',
    description: '',
    date: '',
    reference: '',
    project: '',
    client: ''
  });

  useEffect(() => {
    loadTransactions();
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await api.get('/projects');
      if (response.data?.success) {
        setProjects(response.data.data || []);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/accounting/transactions');
      if (response.data?.success) {
        setTransactions(response.data.data?.transactions || []);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.error('Error loading transactions:', err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // If project is selected, auto-fill client name
    if (name === 'project' && value) {
      const selectedProject = projects.find(p => p._id === value);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        client: selectedProject?.client?.name || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedTransaction) {
        await api.put(`/accounting/transactions/${selectedTransaction._id}`, formData);
      } else {
        await api.post('/accounting/transactions', formData);
      }
      setShowModal(false);
      resetForm();
      loadTransactions();
    } catch (err) {
      console.error('Error saving transaction:', err);
      alert(err.response?.data?.message || 'Error saving transaction');
    }
  };

  const handleView = async (transaction) => {
    setSelectedTransaction(transaction);
    setFormData({
      type: transaction.type,
      category: transaction.category || '',
      amount: transaction.amount,
      description: transaction.description || '',
      date: transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : '',
      reference: transaction.reference || '',
      project: transaction.project?._id || '',
      client: transaction.project?.client?.name || ''
    });
    setViewMode(true);
    setShowModal(true);
  };

  const handleEdit = async (transaction) => {
    setSelectedTransaction(transaction);
    setFormData({
      type: transaction.type,
      category: transaction.category || '',
      amount: transaction.amount,
      description: transaction.description || '',
      date: transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : '',
      reference: transaction.reference || '',
      project: transaction.project?._id || '',
      client: transaction.project?.client?.name || ''
    });
    setViewMode(false);
    setShowModal(true);
  };

  const handleDelete = async (transaction) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await api.delete(`/accounting/transactions/${transaction._id}`);
      loadTransactions();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert(err.response?.data?.message || 'Error deleting transaction');
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'income',
      category: 'project_payment',
      amount: '',
      description: '',
      date: '',
      reference: '',
      project: '',
      client: ''
    });
    setSelectedTransaction(null);
    setViewMode(false);
  };

  const handlePrint = (transaction) => {
    setSelectedTransaction(transaction);
    setFormData({
      type: transaction.type,
      category: transaction.category || '',
      amount: transaction.amount,
      description: transaction.description || '',
      date: transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : '',
      reference: transaction.reference || '',
      project: transaction.project?._id || '',
      client: transaction.project?.client?.name || ''
    });
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const getTypeIcon = (type) => {
    return type === 'income' ? 
      <TrendingUp className="h-5 w-5 text-green-500" /> : 
      <TrendingDown className="h-5 w-5 text-red-500" />;
  };

  const getTypeColor = (type) => {
    return type === 'income' ? 
      'bg-green-100 text-green-800' : 
      'bg-red-100 text-red-800';
  };

  const filteredTransactions = transactions.filter(transaction => {
    const id = (transaction.transactionId || transaction._id || '').toLowerCase();
    const desc = (transaction.description || '').toLowerCase();
    const client = (transaction.clientName || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    const matchesSearch = id.includes(term) || desc.includes(term) || client.includes(term);
    const matchesType = typeFilter === '' || transaction.type === typeFilter;
    const matchesCategory = categoryFilter === '' || transaction.category === categoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  });

  // Calculate totals
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
  const netProfit = totalIncome - totalExpenses;

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
          #printable-transaction, #printable-transaction * { visibility: visible; }
          #printable-transaction { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            padding: 20px;
            background: white;
          }
          .no-print { display: none !important; }
          
          /* Print-specific styling */
          .print-header {
            border-bottom: 2px solid #2563eb;
            padding-bottom: 12px;
            margin-bottom: 18px;
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
            margin-bottom: 4px;
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
            border-bottom: 1.5px solid #e2e8f0;
            padding-bottom: 5px;
            margin-bottom: 10px;
          }
          
          .print-field {
            margin-bottom: 8px;
            padding: 8px;
            background: #f8fafc;
            border-left: 2px solid #3b82f6;
          }
          
          .print-field-label {
            font-size: 9px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.3px;
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
            color: #059669;
          }
          
          .print-expense-amount {
            color: #dc2626;
          }
          
          .print-footer {
            margin-top: 20px;
            padding-top: 12px;
            border-top: 1.5px solid #e2e8f0;
            text-align: center;
            font-size: 9px;
            color: #64748b;
          }
          
          .print-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
          }
          
          .print-badge-income {
            background: #d1fae5;
            color: #065f46;
          }
          
          .print-badge-expense {
            background: #fee2e2;
            color: #991b1b;
          }
        }
      `}</style>

      {/* Hidden Print Area */}
      {isPrinting && selectedTransaction && (
        <div id="printable-transaction" className="hidden print:block">
          {/* Header Section */}
          <div className="print-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="print-title">Transaction Receipt</div>
                <div className="print-subtitle">
                  Transaction ID: <strong>TXN-{selectedTransaction._id?.slice(-8).toUpperCase()}</strong>
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
                  style={{ marginBottom: '8px' }}
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

          {/* Transaction Overview */}
          <div className="print-section">
            <div className="print-section-title">Transaction Overview</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="print-field">
                <div className="print-field-label">Transaction Type</div>
                <div className="print-field-value">
                  <span className={`print-badge ${selectedTransaction.type === 'income' ? 'print-badge-income' : 'print-badge-expense'}`}>
                    {selectedTransaction.type === 'income' ? '↑ INCOME' : '↓ EXPENSE'}
                  </span>
                </div>
              </div>
              <div className="print-field">
                <div className="print-field-label">Amount</div>
                <div className={`print-amount ${selectedTransaction.type === 'expense' ? 'print-expense-amount' : ''}`}>
                  ₹{(selectedTransaction.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="print-field">
                <div className="print-field-label">Category</div>
                <div className="print-field-value" style={{ textTransform: 'capitalize' }}>
                  {(selectedTransaction.category || 'Uncategorized').replace(/_/g, ' ')}
                </div>
              </div>
              <div className="print-field">
                <div className="print-field-label">Transaction Date</div>
                <div className="print-field-value">
                  {selectedTransaction.date ? format(new Date(selectedTransaction.date), 'dd MMMM yyyy') : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          {(selectedTransaction.description || selectedTransaction.reference || selectedTransaction.project?.name || selectedTransaction.invoice?.invoiceNumber) && (
            <div className="print-section">
              <div className="print-section-title">Additional Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                {selectedTransaction.description && (
                  <div className="print-field">
                    <div className="print-field-label">Description</div>
                    <div className="print-field-value">{selectedTransaction.description}</div>
                  </div>
                )}
                {selectedTransaction.reference && (
                  <div className="print-field">
                    <div className="print-field-label">Reference Number</div>
                    <div className="print-field-value">{selectedTransaction.reference}</div>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {selectedTransaction.project?.name && (
                    <div className="print-field">
                      <div className="print-field-label">Associated Project</div>
                      <div className="print-field-value">{selectedTransaction.project.name}</div>
                    </div>
                  )}
                  {selectedTransaction.invoice?.invoiceNumber && (
                    <div className="print-field">
                      <div className="print-field-label">Invoice Number</div>
                      <div className="print-field-value">{selectedTransaction.invoice.invoiceNumber}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="print-footer">
            <div style={{ marginBottom: '6px', fontWeight: '600', color: '#1e293b' }}>
              This is a computer-generated receipt and does not require a signature.
            </div>
            <div>
              For queries, contact us at hello@parnetsgroup.com or call 095909 26068
            </div>
            <div style={{ marginTop: '8px', fontSize: '8px', color: '#94a3b8' }}>
              © {new Date().getFullYear()} ParNets Software India Pvt Ltd. All rights reserved.
            </div>
          </div>
        </div>
      )}

    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-orange-500 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Accounting</h1>
            <p className="text-blue-100">Manage financial transactions</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="btn-secondary bg-white/20 hover:bg-white/30 border border-white/30 text-white">
              <Download className="h-4 w-4" />
              Export
            </button>
            <button 
              onClick={() => setShowModal(true)}
              className="btn-primary bg-white/20 hover:bg-white/30 border border-white/30"
            >
              <Plus className="h-5 w-5" />
              Add Transaction
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600">₹{totalIncome.toLocaleString()}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">₹{totalExpenses.toLocaleString()}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Profit</p>
              <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{netProfit.toLocaleString()}
              </p>
            </div>
            <Calculator className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-blue-600">{transactions.length}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex items-center justify-center space-x-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <PieChart className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium">View Reports</span>
          </button>
          <button className="flex items-center justify-center space-x-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <BarChart3 className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium">Analytics</span>
          </button>
          <button className="flex items-center justify-center space-x-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Upload className="h-5 w-5 text-purple-500" />
            <span className="text-sm font-medium">Import Data</span>
          </button>
          <button className="flex items-center justify-center space-x-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Calculator className="h-5 w-5 text-orange-500" />
            <span className="text-sm font-medium">Tax Calculator</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input-field"
          >
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field"
          >
            <option value="">All Categories</option>
            <option value="project_payment">Project Payment</option>
            <option value="amc_payment">AMC Payment</option>
            <option value="software_license">Software License</option>
            <option value="office_rent">Office Rent</option>
            <option value="utilities">Utilities</option>
            <option value="marketing">Marketing</option>
            <option value="travel">Travel</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      <div className="card">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading transactions...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project/Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No transactions found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {searchTerm || typeFilter || categoryFilter 
                          ? 'Try adjusting your filters' 
                          : 'Add your first transaction to get started'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <tr key={transaction._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{transaction._id?.slice(-8)}</div>
                          <div className="text-sm text-gray-500 max-w-xs truncate">{transaction.description || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getTypeIcon(transaction.type)}
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(transaction.type)}`}>
                          {transaction.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(transaction.category || '').replace(/_/g, ' ').toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ₹{(transaction.amount || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{transaction.project?.name || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{transaction.invoice?.invoiceNumber || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.date ? new Date(transaction.date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleView(transaction)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handlePrint(transaction)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Print"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleEdit(transaction)}
                          className="text-green-600 hover:text-green-900"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(transaction)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
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

      {/* Add/Edit Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-orange-500 text-white p-6">
              <h2 className="text-xl font-bold">
                {viewMode ? 'View Transaction' : selectedTransaction ? 'Edit Transaction' : 'Add New Transaction'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                    disabled={viewMode}
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="input-field"
                    disabled={viewMode}
                  >
                    <option value="">Select Category</option>
                    <option value="project_payment">Project Payment</option>
                    <option value="amc_payment">AMC Payment</option>
                    <option value="software_license">Software License</option>
                    <option value="office_rent">Office Rent</option>
                    <option value="utilities">Utilities</option>
                    <option value="marketing">Marketing</option>
                    <option value="travel">Travel</option>
                    <option value="salary">Salary</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount *
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    className="input-field"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    required
                    disabled={viewMode}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                    disabled={viewMode}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter transaction description"
                    required
                    disabled={viewMode}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference
                  </label>
                  <input
                    type="text"
                    name="reference"
                    value={formData.reference}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Invoice number, receipt number, etc."
                    disabled={viewMode}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="btn-secondary"
                >
                  {viewMode ? 'Close' : 'Cancel'}
                </button>
                {!viewMode && (
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    {selectedTransaction ? 'Update' : 'Add'} Transaction
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default Accounting;