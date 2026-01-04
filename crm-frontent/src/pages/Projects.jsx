import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Users, 
  Calendar,
  Clock,
  User,
  FolderOpen
} from 'lucide-react';
import apiService from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const Projects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client: '',
    projectManager: '',
    developers: [],
    status: 'planning',
    priority: 'medium',
    startDate: '',
    endDate: '',
    budget: { estimated: 0 },
    progress: 0,
    technology: []
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [searchTerm, statusFilter]);

  const fetchInitialData = async () => {
    try {
      const [clientsRes, employeesRes] = await Promise.all([
        apiService.getClients({ limit: 100 }).catch(() => ({ data: { clients: [] } })),
        apiService.getEmployees({ limit: 100 }).catch(() => ({ data: { employees: [] } }))
      ]);
      setClients(clientsRes.data.clients);
      setEmployees(employeesRes.data.employees);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      
      const response = await apiService.getProjects(params);
      setProjects(response.data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedProject) {
        await apiService.updateProject(selectedProject._id, formData);
        toast.success('Project updated successfully');
      } else {
        await apiService.createProject(formData);
        toast.success('Project created successfully');
      }
      setShowModal(false);
      setSelectedProject(null);
      resetForm();
      fetchProjects();
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Failed to save project');
    }
  };

  const handleEdit = (project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name || '',
      description: project.description || '',
      client: project.client?._id || '',
      projectManager: project.projectManager?._id || '',
      developers: project.developers?.map(dev => dev._id) || [],
      status: project.status || 'planning',
      priority: project.priority || 'medium',
      startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
      endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
      budget: { estimated: project.budget?.estimated || 0 },
      progress: project.progress || 0,
      technology: project.technology || []
    });
    setShowModal(true);
  };

  const handleDelete = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await apiService.deleteProject(projectId);
        toast.success('Project deleted successfully');
        fetchProjects();
      } catch (error) {
        console.error('Error deleting project:', error);
        toast.error('Failed to delete project');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      client: '',
      projectManager: '',
      developers: [],
      status: 'planning',
      priority: 'medium',
      startDate: '',
      endDate: '',
      budget: { estimated: 0 },
      progress: 0,
      technology: []
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'badge-success';
      case 'in_progress': return 'badge-primary';
      case 'on_hold': return 'badge-warning';
      case 'cancelled': return 'badge-error';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canManageProjects = ['super_admin', 'admin', 'sub_admin'].includes(user?.role);

  // Helper function to get developer names
  const getDeveloperNames = (developers) => {
    if (!developers || developers.length === 0) return 'No developers assigned';
    return developers.map(dev => dev.name || 'Unknown').join(', ');
  };

  // Helper function to handle developer selection
  const handleDeveloperChange = (developerId) => {
    const currentDevelopers = formData.developers || [];
    if (currentDevelopers.includes(developerId)) {
      setFormData({
        ...formData,
        developers: currentDevelopers.filter(id => id !== developerId)
      });
    } else {
      setFormData({
        ...formData,
        developers: [...currentDevelopers, developerId]
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-orange-500 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Projects Management</h1>
            <p className="text-blue-100">Track and manage your projects</p>
          </div>
          {canManageProjects && (
            <button
              onClick={() => {
                resetForm();
                setSelectedProject(null);
                setShowModal(true);
              }}
              className="btn-primary bg-white/20 hover:bg-white/30 border border-white/30"
            >
              <Plus className="h-5 w-5" />
              Add Project
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
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
            <option value="planning">Planning</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No projects found</p>
          </div>
        ) : (
          projects.map((project) => (
            <div key={project._id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{project.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{project.description}</p>
                </div>
                {canManageProjects && (
                  <div className="flex items-center space-x-2 ml-2">
                    <button
                      onClick={() => handleEdit(project)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(project._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`badge ${getStatusColor(project.status)}`}>
                    {project.status.replace('_', ' ')}
                  </span>
                  <span className={`badge ${getPriorityColor(project.priority)}`}>
                    {project.priority}
                  </span>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <User className="h-4 w-4 mr-2" />
                  <span>{project.client?.company || 'No client'}</span>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-2" />
                  <span>{project.projectManager?.name || 'No manager'}</span>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>{project.startDate ? new Date(project.startDate).toLocaleDateString() : 'No start date'}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>{project.endDate ? new Date(project.endDate).toLocaleDateString() : 'No end date'}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>

                {project.budget > 0 && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Budget: </span>
                    ₹{project.budget.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="bg-gradient-to-r from-blue-600 to-orange-500 text-white p-6 rounded-t-lg">
              <h2 className="text-xl font-bold">
                {selectedProject ? 'Edit Project' : 'Add New Project'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                  <select
                    required
                    value={formData.client}
                    onChange={(e) => setFormData({...formData, client: e.target.value})}
                    className="input-field"
                  >
                    <option value="">Select Client</option>
                    {clients.map(client => (
                      <option key={client._id} value={client._id}>{client.company || client.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Manager *</label>
                  <select
                    required
                    value={formData.projectManager}
                    onChange={(e) => setFormData({...formData, projectManager: e.target.value})}
                    className="input-field"
                  >
                    <option value="">Select Manager</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="input-field"
                  >
                    <option value="planning">Planning</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="input-field"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.budget}
                    onChange={(e) => setFormData({...formData, budget: parseInt(e.target.value) || 0})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Progress (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(e) => setFormData({...formData, progress: parseInt(e.target.value) || 0})}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedProject(null);
                    resetForm();
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {selectedProject ? 'Update' : 'Create'} Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;