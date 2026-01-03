import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Users, 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  User
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
    developers: [], // New field for multiple developers
    status: 'planning',
    priority: 'medium',
    startDate: '',
    endDate: '',
    budget: {
      estimated: 0
    },
    technology: [],
    progress: 0
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
        apiService.getClients({ limit: 100 }),
        apiService.getEmployees({ limit: 100 })
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
      setProjects(response.data.projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const projectData = {
        ...formData,
        technology: typeof formData.technology === 'string' 
          ? formData.technology.split(',').map(tech => tech.trim()).filter(tech => tech !== '')
          : formData.technology
      };

      if (selectedProject) {
        await apiService.updateProject(selectedProject._id, projectData);
        toast.success('Project updated successfully');
      } else {
        await apiService.createProject(projectData);
        toast.success('Project created successfully');
      }
      setShowModal(false);
      setSelectedProject(null);
      resetForm();
      fetchProjects();
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error(error.message || 'Failed to save project');
    }
  };

  const handleEdit = (project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name || '',
      description: project.description || '',
      client: project.client?._id || '',
      projectManager: project.projectManager?._id || '',
      developers: project.developers?.map(dev => dev._id || dev) || [], // Handle developer IDs
      status: project.status || 'planning',
      priority: project.priority || 'medium',
      startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
      endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
      budget: {
        estimated: project.budget?.estimated || 0
      },
      technology: project.technology || [],
      progress: project.progress || 0
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
      developers: [], // Reset developers array
      status: 'planning',
      priority: 'medium',
      startDate: '',
      endDate: '',
      budget: {
        estimated: 0
      },
      technology: [],
      progress: 0
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'testing': return 'bg-purple-100 text-purple-800';
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

  const handleDeveloperChange = (developerId) => {
    const updatedDevelopers = formData.developers.includes(developerId)
      ? formData.developers.filter(id => id !== developerId)
      : [...formData.developers, developerId];
    
    setFormData({
      ...formData,
      developers: updatedDevelopers
    });
  };

  const getDeveloperNames = (developerIds) => {
    if (!developerIds || developerIds.length === 0) return 'No developers';
    
    const names = developerIds.map(id => {
      const developer = employees.find(emp => emp._id === id);
      return developer ? developer.name : 'Unknown';
    });
    
    return names.length > 2 
      ? `${names.slice(0, 2).join(', ')} +${names.length - 2} more`
      : names.join(', ');
  };

  const canManageProjects = ['super_admin', 'admin', 'sub_admin'].includes(user?.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-600">Projects Management</h1>
        {canManageProjects && (
          <button
            onClick={() => {
              resetForm();
              setSelectedProject(null);
              setShowModal(true);
            }}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Project</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
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
              <option value="planning">Planning</option>
              <option value="in_progress">In Progress</option>
              <option value="testing">Testing</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first project.</p>
              {canManageProjects && (
                <button
                  onClick={() => {
                    resetForm();
                    setSelectedProject(null);
                    setShowModal(true);
                  }}
                  className="btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </button>
              )}
            </div>
          </div>
        ) : (
          projects.map((project) => (
            <div key={project._id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.name}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>
                </div>
                {canManageProjects && (
                  <div className="flex items-center space-x-1 ml-2">
                    <button
                      onClick={() => handleEdit(project)}
                      className="text-primary-600 hover:text-primary-900 p-1"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(project._id)}
                      className="text-red-600 hover:text-red-900 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(project.status)}`}>
                    {project.status.replace('_', ' ')}
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(project.priority)}`}>
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

                <div className="flex items-center text-sm text-gray-600">
                  <User className="h-4 w-4 mr-2" />
                  <span>{getDeveloperNames(project.developers)}</span>
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
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>

                {project.technology && project.technology.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {project.technology.slice(0, 3).map((tech, index) => (
                      <span key={index} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        {tech}
                      </span>
                    ))}
                    {project.technology.length > 3 && (
                      <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        +{project.technology.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {project.budget?.estimated > 0 && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Budget: </span>
                    ₹{project.budget.estimated.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white max-h-[80vh] overflow-y-auto">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {selectedProject ? 'Edit Project' : 'Add New Project'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="input-field"
                      placeholder="Enter project name"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      rows="3"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="input-field"
                      placeholder="Enter project description"
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
                        <option key={client._id} value={client._id}>{client.company}</option>
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
                      {employees.filter(emp => ['super_admin', 'admin', 'sub_admin', 'developer'].includes(emp.role)).map(emp => (
                        <option key={emp._id} value={emp._id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Developer Selection */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Assign Developers 
                      <span className="text-xs text-gray-500 ml-2">
                        ({employees.filter(emp => emp.role === 'developer' || emp.role === 'sub_admin').length} available)
                      </span>
                    </label>
                    
                    {/* Quick Actions */}
                    {employees.filter(emp => emp.role === 'developer' || emp.role === 'sub_admin').length > 0 && (
                      <div className="flex space-x-2 mb-3">
                        <button
                          type="button"
                          onClick={() => {
                            const allDeveloperIds = employees
                              .filter(emp => emp.role === 'developer' || emp.role === 'sub_admin')
                              .map(emp => emp._id);
                            setFormData({...formData, developers: allDeveloperIds});
                          }}
                          className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, developers: []})}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          Clear All
                        </button>
                      </div>
                    )}
                    <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto">
                      {(() => {
                        const availableDevelopers = employees.filter(emp => emp.role === 'developer' || emp.role === 'sub_admin');
                        
                        if (availableDevelopers.length === 0) {
                          return <p className="text-sm text-gray-500">No developers available. Loading employees...</p>;
                        }
                        
                        return (
                          <div className="space-y-3">
                            {availableDevelopers.map(developer => (
                              <div key={developer._id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                                <input
                                  type="checkbox"
                                  id={`developer-${developer._id}`}
                                  checked={formData.developers.includes(developer._id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleDeveloperChange(developer._id);
                                  }}
                                  className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                />
                                <label 
                                  htmlFor={`developer-${developer._id}`}
                                  className="flex-1 text-sm text-gray-700 cursor-pointer"
                                >
                                  <div className="font-medium">{developer.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {developer.department} - {developer.designation}
                                  </div>
                                </label>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    {formData.developers.length > 0 && (
                      <div className="mt-3 p-2 bg-primary-50 rounded">
                        <p className="text-sm font-medium text-primary-700 mb-2">
                          Selected: {formData.developers.length} developer{formData.developers.length !== 1 ? 's' : ''}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {formData.developers.map(devId => {
                            const dev = employees.find(emp => emp._id === devId);
                            return dev ? (
                              <span key={devId} className="inline-flex items-center px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded">
                                {dev.name}
                                <button
                                  type="button"
                                  onClick={() => handleDeveloperChange(devId)}
                                  className="ml-1 text-primary-600 hover:text-primary-800"
                                >
                                  ×
                                </button>
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
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
                      <option value="testing">Testing</option>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Budget (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.budget.estimated}
                      onChange={(e) => setFormData({
                        ...formData, 
                        budget: { ...formData.budget, estimated: parseInt(e.target.value) || 0 }
                      })}
                      className="input-field"
                      placeholder="0"
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
                      placeholder="0"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Technologies (comma separated)</label>
                    <input
                      type="text"
                      value={Array.isArray(formData.technology) ? formData.technology.join(', ') : formData.technology}
                      onChange={(e) => setFormData({
                        ...formData, 
                        technology: e.target.value.split(',').map(tech => tech.trim())
                      })}
                      className="input-field"
                      placeholder="React, Node.js, MongoDB"
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
        </div>
      )}
    </div>
  );
};

export default Projects;