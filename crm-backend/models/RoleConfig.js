import mongoose from 'mongoose';

const roleConfigSchema = new mongoose.Schema({
  roleName: {
    type: String,
    required: true,
    unique: true,
    enum: ['super_admin', 'employee', 'sales', 'client']
  },
  displayName: { 
    type: String, 
    required: true 
  },
  description: String,
  hierarchy: {
    type: Number,
    required: true,
    default: 50
  },
  isSystemRole: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: {
    modules: {
      dashboard: { type: Boolean, default: true },
      clients: { type: Boolean, default: false },
      projects: { type: Boolean, default: false },
      employees: { type: Boolean, default: false },
      attendance: { type: Boolean, default: false },
      payments: { type: Boolean, default: false },
      invoices: { type: Boolean, default: false },
      support: { type: Boolean, default: false },
      reports: { type: Boolean, default: false },
      settings: { type: Boolean, default: false }
    },
    actions: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      export: { type: Boolean, default: false },
      import: { type: Boolean, default: false }
    }
  },
  dashboardRoute: {
    type: String,
    default: '/dashboard'
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  updatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, {
  timestamps: true
});

// Indexes
roleConfigSchema.index({ roleName: 1 });
roleConfigSchema.index({ hierarchy: 1 });
roleConfigSchema.index({ isActive: 1 });
roleConfigSchema.index({ isSystemRole: 1 });

// Instance methods
roleConfigSchema.methods.hasPermission = function(module, action) {
  if (!this.permissions.modules[module]) {
    return false;
  }
  return this.permissions.actions[action] || false;
};

roleConfigSchema.methods.hasModulePermission = function(module) {
  return this.permissions.modules[module] || false;
};

roleConfigSchema.methods.getPermissionsArray = function() {
  const permissions = [];
  
  // Add module permissions
  Object.keys(this.permissions.modules).forEach(module => {
    if (this.permissions.modules[module]) {
      permissions.push(`${module}:read`);
    }
  });
  
  // Add action permissions
  Object.keys(this.permissions.actions).forEach(action => {
    if (this.permissions.actions[action]) {
      permissions.push(`*:${action}`);
    }
  });
  
  return permissions;
};

// Static methods
roleConfigSchema.statics.getActiveRoles = async function() {
  return await this.find({ isActive: true }).sort({ hierarchy: 1 });
};

roleConfigSchema.statics.getRolesByHierarchy = async function(maxHierarchy) {
  return await this.find({ 
    isActive: true, 
    hierarchy: { $lte: maxHierarchy } 
  }).sort({ hierarchy: 1 });
};

roleConfigSchema.statics.getRoleByName = async function(roleName) {
  return await this.findOne({ roleName, isActive: true });
};

roleConfigSchema.statics.canManageRole = async function(managerRole, targetRole) {
  const manager = await this.findOne({ roleName: managerRole, isActive: true });
  const target = await this.findOne({ roleName: targetRole, isActive: true });
  
  if (!manager || !target) {
    return false;
  }
  
  // Lower hierarchy number means higher priority
  return manager.hierarchy < target.hierarchy;
};

// Static method to initialize default role configurations
roleConfigSchema.statics.initializeDefaultRoles = async function() {
  const defaultRoles = [
    {
      roleName: 'super_admin',
      displayName: 'Super Administrator',
      description: 'Full system access with all permissions',
      hierarchy: 1,
      isSystemRole: true,
      permissions: {
        modules: {
          dashboard: true, clients: true, projects: true, employees: true,
          attendance: true, payments: true, invoices: true, support: true,
          reports: true, settings: true
        },
        actions: { create: true, read: true, update: true, delete: true, export: true, import: true }
      },
      dashboardRoute: '/dashboard'
    },
    {
      roleName: 'employee',
      displayName: 'Employee',
      description: 'Basic employee access with limited permissions',
      hierarchy: 40,
      isSystemRole: true,
      permissions: {
        modules: {
          dashboard: true, clients: false, projects: false, employees: false,
          attendance: true, payments: false, invoices: false, support: false,
          reports: false, settings: false
        },
        actions: { create: false, read: true, update: false, delete: false, export: false, import: false }
      },
      dashboardRoute: '/dashboard'
    },
    {
      roleName: 'sales',
      displayName: 'Sales Representative',
      description: 'Sales-focused access with client and project management',
      hierarchy: 30,
      isSystemRole: true,
      permissions: {
        modules: {
          dashboard: true, clients: true, projects: true, employees: false,
          attendance: false, payments: false, invoices: true, support: false,
          reports: true, settings: false
        },
        actions: { create: true, read: true, update: true, delete: false, export: true, import: false }
      },
      dashboardRoute: '/dashboard'
    },
    {
      roleName: 'client',
      displayName: 'Client',
      description: 'External client access with limited project visibility',
      hierarchy: 50,
      isSystemRole: true,
      permissions: {
        modules: {
          dashboard: true, clients: false, projects: true, employees: false,
          attendance: false, payments: false, invoices: true, support: true,
          reports: false, settings: false
        },
        actions: { create: false, read: true, update: false, delete: false, export: false, import: false }
      },
      dashboardRoute: '/dashboard'
    }
  ];

  for (const roleData of defaultRoles) {
    await this.findOneAndUpdate(
      { roleName: roleData.roleName },
      roleData,
      { upsert: true, new: true }
    );
  }
};

export default mongoose.model('RoleConfig', roleConfigSchema);