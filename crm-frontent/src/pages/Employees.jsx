import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  DollarSign, 
  AlertTriangle, 
  X, 
  Upload, 
  FileText, 
  MapPin, 
  Phone 
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const Employees = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    designation: '',
    salary: {
      total: '',
      type: 'monthly', // monthly or yearly
      breakdown: {
        basic: '',
        hra: '',
        allowances: '',
        deductions: ''
      }
    },
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India'
    },
    joiningDate: '',
    documents: {
      aadhaar: null, // mandatory
      pan: null,
      photo: null,
      other: []
    }
  });

  const mockEmployees = [
    {
      _id: '1',
      name: 'John Doe',
      email: 'john@company.com',
      role: 'Senior Developer',
      department: 'Development',
      salary: 75000,
      joiningDate: '2023-01-15',
      isActive: true,
      attendance: { percentage: 91.7 },
      timeline: { delayedTasks: 1 }
    },
    {
      _id: '2',
      name: 'Sarah Wilson',
      email: 'sarah@company.com',
      role: 'Project Manager',
      department: 'Management',
      salary: 85000,
      joiningDate: '2022-08-20',
      isActive: true,
      attendance: { percentage: 100 },
      timeline: { delayedTasks: 0 }
    }
  ];

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.getEmployees();
      if (response && response.success && response.data && response.data.employees) {
        setEmployees(response.data.employees);
      } else {
        setEmployees(mockEmployees);
      }
    } catch (err) {
      console.error('Error loading employees:', err);
      setEmployees(mockEmployees);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      setFormData(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          other: [...prev.documents.other, newOtherDoc]
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [documentType]: {
            name: file.name,
            file: file,
            type: file.type,
            size: file.size
          }
        }
      }));
    }
    toast.success('Document uploaded successfully');
  };

  const removeDocument = (documentType, docId = null) => {
    if (documentType === 'other' && docId) {
      setFormData(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          other: prev.documents.other.filter(doc => doc.id !== docId)
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [documentType]: null
        }
      }));
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

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: '',
      department: '',
      designation: '',
      salary: {
        total: '',
        type: 'monthly',
        breakdown: {
          basic: '',
          hra: '',
          allowances: '',
          deductions: ''
        }
      },
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'India'
      },
      joiningDate: '',
      documents: {
        aadhaar: null,
        pan: null,
        photo: null,
        other: []
      }
    });
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    
    // Validate mandatory Aadhaar document
    if (!formData.documents.aadhaar) {
      toast.error('Aadhaar document is mandatory');
      return;
    }

    // Validate total salary is required
    if (!formData.salary.total) {
      toast.error('Total salary is required');
      return;
    }

    try {
      const employeeData = {
        ...formData,
        salary: {
          ...formData.salary,
          total: parseFloat(formData.salary.total) || 0,
          breakdown: {
            basic: parseFloat(formData.salary.breakdown.basic) || 0,
            hra: parseFloat(formData.salary.breakdown.hra) || 0,
            allowances: parseFloat(formData.salary.breakdown.allowances) || 0,
            deductions: parseFloat(formData.salary.breakdown.deductions) || 0
          }
        },
        isActive: true
      };

      await api.post('/employees', employeeData);
      await loadEmployees();
      setShowAddModal(false);
      resetForm();
      toast.success('Employee added successfully');
    } catch (err) {
      console.error('Error adding employee:', err);
      toast.error('Failed to add employee');
    }
  };

  const displayEmployees = employees.length > 0 ? employees : mockEmployees;
  const filteredEmployees = displayEmployees.filter(employee => {
    const searchLower = searchTerm.toLowerCase();
    return (
      employee.name.toLowerCase().includes(searchLower) ||
      employee.email.toLowerCase().includes(searchLower) ||
      employee.role.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Employee</span>
        </button>
      </div>

      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employees...</p>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((employee) => (
            <div key={employee._id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{employee.name}</h3>
                  <p className="text-gray-600">{employee.role}</p>
                  <p className="text-sm text-gray-500">{employee.department}</p>
                  {employee.phone && (
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Phone className="h-3 w-3 mr-1" />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                  {employee.address?.city && (
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <MapPin className="h-3 w-3 mr-1" />
                      <span>{employee.address.city}, {employee.address.state}</span>
                    </div>
                  )}
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  employee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {employee.isActive ? 'active' : 'inactive'}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Salary:</span>
                  <span className="font-medium">
                    ₹{(typeof employee.salary === 'object' ? employee.salary?.total : employee.salary)?.toLocaleString() || 'N/A'}
                    {typeof employee.salary === 'object' && employee.salary?.type && (
                      <span className="text-xs text-gray-500 ml-1">/{employee.salary.type}</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Attendance:</span>
                  <span className={`font-medium ${
                    (employee.attendance?.percentage || 0) >= 90 ? 'text-green-600' : 
                    (employee.attendance?.percentage || 0) >= 80 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {employee.attendance?.percentage || 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Delayed Tasks:</span>
                  <span className={`font-medium ${(employee.timeline?.delayedTasks || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {employee.timeline?.delayedTasks || 0}
                    {(employee.timeline?.delayedTasks || 0) > 0 && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                  </span>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => { setSelectedEmployee(employee); setShowModal(true); }}
                  className="flex-1 btn-primary text-sm py-2"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View Details
                </button>
                <button className="btn-secondary text-sm py-2 px-3">
                  <Edit className="h-3 w-3" />
                </button>
                <button className="text-red-600 hover:bg-red-50 p-2 rounded">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Employee Details</h2>
              <button onClick={() => { setShowModal(false); setSelectedEmployee(null); }} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                <div className="space-y-3">
                  <div><label className="text-sm font-medium text-gray-600">Name</label><p className="text-gray-900">{selectedEmployee.name}</p></div>
                  <div><label className="text-sm font-medium text-gray-600">Email</label><p className="text-gray-900">{selectedEmployee.email}</p></div>
                  <div><label className="text-sm font-medium text-gray-600">Role</label><p className="text-gray-900">{selectedEmployee.role}</p></div>
                  <div><label className="text-sm font-medium text-gray-600">Department</label><p className="text-gray-900">{selectedEmployee.department}</p></div>
                </div>
              </div>
              <div className="card">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />Salary Details
                </h3>
                <div className="space-y-3">
                  <div><label className="text-sm font-medium text-gray-600">Annual Salary</label><p className="text-2xl font-bold text-green-600">₹{selectedEmployee.salary.toLocaleString()}</p></div>
                  <div><label className="text-sm font-medium text-gray-600">Monthly Salary</label><p className="text-gray-900">₹{(selectedEmployee.salary / 12).toLocaleString()}</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Add New Employee</h2>
              <button onClick={() => {
                setShowAddModal(false);
                resetForm();
              }} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleAddEmployee} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input 
                      type="text" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleInputChange} 
                      className="input-field" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                    <input 
                      type="email" 
                      name="email" 
                      value={formData.email} 
                      onChange={handleInputChange} 
                      className="input-field" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                    <input 
                      type="tel" 
                      name="phone" 
                      value={formData.phone} 
                      onChange={handleInputChange} 
                      className="input-field" 
                      placeholder="+91-9876543210"
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date *</label>
                    <input 
                      type="date" 
                      name="joiningDate" 
                      value={formData.joiningDate} 
                      onChange={handleInputChange} 
                      className="input-field" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                    <select 
                      name="role" 
                      value={formData.role} 
                      onChange={handleInputChange} 
                      className="input-field" 
                      required
                    >
                      <option value="">Select Role</option>
                      <option value="super_admin">Super Admin</option>
                      <option value="admin">Admin</option>
                      <option value="sub_admin">Sub Admin</option>
                      <option value="developer">Developer</option>
                      <option value="designer">Designer</option>
                      <option value="tester">Tester</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                    <select 
                      name="department" 
                      value={formData.department} 
                      onChange={handleInputChange} 
                      className="input-field" 
                      required
                    >
                      <option value="">Select Department</option>
                      <option value="Management">Management</option>
                      <option value="Development">Development</option>
                      <option value="Design">Design</option>
                      <option value="Testing">Testing</option>
                      <option value="Marketing">Marketing</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                    <input 
                      type="text" 
                      name="designation" 
                      value={formData.designation} 
                      onChange={handleInputChange} 
                      className="input-field" 
                      placeholder="e.g., Senior Developer, Team Lead"
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Address Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                    <input 
                      type="text" 
                      value={formData.address.street} 
                      onChange={(e) => handleNestedInputChange('address', 'street', e.target.value)}
                      className="input-field" 
                      placeholder="Enter street address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input 
                      type="text" 
                      value={formData.address.city} 
                      onChange={(e) => handleNestedInputChange('address', 'city', e.target.value)}
                      className="input-field" 
                      placeholder="Enter city"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input 
                      type="text" 
                      value={formData.address.state} 
                      onChange={(e) => handleNestedInputChange('address', 'state', e.target.value)}
                      className="input-field" 
                      placeholder="Enter state"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                    <input 
                      type="text" 
                      value={formData.address.zipCode} 
                      onChange={(e) => handleNestedInputChange('address', 'zipCode', e.target.value)}
                      className="input-field" 
                      placeholder="Enter ZIP code"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <select 
                      value={formData.address.country} 
                      onChange={(e) => handleNestedInputChange('address', 'country', e.target.value)}
                      className="input-field"
                    >
                      <option value="India">India</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Salary Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Salary Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Salary Type *</label>
                    <select 
                      value={formData.salary.type} 
                      onChange={(e) => handleNestedInputChange('salary', 'type', e.target.value)}
                      className="input-field"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Salary ({formData.salary.type}) *
                    </label>
                    <input 
                      type="number" 
                      value={formData.salary.total} 
                      onChange={(e) => handleNestedInputChange('salary', 'total', e.target.value)}
                      className="input-field" 
                      placeholder="Enter total salary"
                      required 
                    />
                  </div>
                </div>
                
                {/* Salary Breakdown (Optional) */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Salary Breakdown (Optional)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Basic Salary</label>
                      <input 
                        type="number" 
                        value={formData.salary.breakdown.basic} 
                        onChange={(e) => handleNestedInputChange('salary', 'breakdown', {
                          ...formData.salary.breakdown,
                          basic: e.target.value
                        })}
                        className="input-field text-sm" 
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">HRA</label>
                      <input 
                        type="number" 
                        value={formData.salary.breakdown.hra} 
                        onChange={(e) => handleNestedInputChange('salary', 'breakdown', {
                          ...formData.salary.breakdown,
                          hra: e.target.value
                        })}
                        className="input-field text-sm" 
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Allowances</label>
                      <input 
                        type="number" 
                        value={formData.salary.breakdown.allowances} 
                        onChange={(e) => handleNestedInputChange('salary', 'breakdown', {
                          ...formData.salary.breakdown,
                          allowances: e.target.value
                        })}
                        className="input-field text-sm" 
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Deductions</label>
                      <input 
                        type="number" 
                        value={formData.salary.breakdown.deductions} 
                        onChange={(e) => handleNestedInputChange('salary', 'breakdown', {
                          ...formData.salary.breakdown,
                          deductions: e.target.value
                        })}
                        className="input-field text-sm" 
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Document Upload */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Document Upload</h3>
                <div className="space-y-4">
                  
                  {/* Aadhaar Card - Mandatory */}
                  <div className="border-2 border-dashed border-red-300 rounded-lg p-4 bg-red-50">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-red-700">
                        Aadhaar Card * (Mandatory)
                      </label>
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
                          <Upload className="h-8 w-8 text-red-400 mb-2" />
                          <span className="text-sm text-red-600">Click to upload Aadhaar Card</span>
                          <span className="text-xs text-red-400">PDF, JPEG, PNG (Max 5MB)</span>
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

                  {/* PAN Card */}
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

                  {/* Selfie Photo */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Selfie Photo</label>
                      {formData.documents.photo && (
                        <button
                          type="button"
                          onClick={() => removeDocument('photo')}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {formData.documents.photo ? (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <FileText className="h-4 w-4" />
                        <span>{formData.documents.photo.name}</span>
                        <span className="text-gray-400">({formatFileSize(formData.documents.photo.size)})</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <label className="cursor-pointer flex flex-col items-center">
                          <Upload className="h-8 w-8 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-600">Click to upload Selfie Photo</span>
                          <span className="text-xs text-gray-400">JPEG, PNG (Max 5MB)</span>
                          <input
                            type="file"
                            className="hidden"
                            accept=".jpg,.jpeg,.png"
                            onChange={(e) => handleFileUpload('photo', e.target.files[0])}
                          />
                        </label>
                      </div>
                    )}
                  </div>

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
                    setShowAddModal(false);
                    resetForm();
                  }} 
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;