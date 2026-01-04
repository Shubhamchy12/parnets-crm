import RoleConfig from '../models/RoleConfig.js';
import User from '../models/User.js';

/**
 * Role Management Service
 * Handles role creation, permission management, and access control logic
 */
class RoleService {
  
  /**
   * Get all active roles with optional hierarchy filtering
   * @param {number} maxHierarchy - Maximum hierarchy level to include
   * @returns {Promise<Array>} Array of role configurations
   */
  async getAllRoles(maxHierarchy = null) {
    try {
      if (maxHierarchy !== null) {
        return await RoleConfig.getRolesByHierarchy(maxHierarchy);
      }
      return await RoleConfig.getActiveRoles();
    } catch (error) {
      throw new Error(`Failed to fetch roles: ${error.message}`);
    }
  }

  /**
   * Get role configuration by role name
   * @param {string} roleName - Name of the role
   * @returns {Promise<Object>} Role configuration object
   */
  async getRoleByName(roleName) {
    try {
      const role = await RoleConfig.getRoleByName(roleName);
      if (!role) {
        throw new Error(`Role '${roleName}' not found`);
      }
      return role;
    } catch (error) {
      throw new Error(`Failed to fetch role: ${error.message}`);
    }
  }

  /**
   * Create a new custom role
   * @param {Object} roleData - Role configuration data
   * @param {string} createdBy - User ID who is creating the role
   * @returns {Promise<Object>} Created role configuration
   */
  async createRole(roleData, createdBy) {
    try {
      // Validate required fields
      if (!roleData.roleName || !roleData.displayName || !roleData.description) {
        throw new Error('Role name, display name, and description are required');
      }

      // Check if role already exists
      const existingRole = await RoleConfig.findOne({ roleName: roleData.roleName });
      if (existingRole) {
        throw new Error(`Role '${roleData.roleName}' already exists`);
      }

      // Set default values
      const newRoleData = {
        ...roleData,
        createdBy,
        isSystemRole: false, // Custom roles are not system roles
        hierarchy: roleData.hierarchy || 50, // Default hierarchy for custom roles
        isActive: true
      };

      const newRole = await RoleConfig.create(newRoleData);
      return newRole;
    } catch (error) {
      throw new Error(`Failed to create role: ${error.message}`);
    }
  }

  /**
   * Update an existing role's permissions
   * @param {string} roleName - Name of the role to update
   * @param {Object} updateData - Data to update
   * @param {string} updatedBy - User ID who is updating the role
   * @returns {Promise<Object>} Updated role configuration
   */
  async updateRole(roleName, updateData, updatedBy) {
    try {
      const role = await RoleConfig.findOne({ roleName });
      if (!role) {
        throw new Error(`Role '${roleName}' not found`);
      }

      // Prevent modification of system roles' core properties
      if (role.isSystemRole && (updateData.roleName || updateData.hierarchy)) {
        throw new Error('Cannot modify core properties of system roles');
      }

      // Update the role
      Object.assign(role, updateData, { updatedBy, updatedAt: new Date() });
      await role.save();

      return role;
    } catch (error) {
      throw new Error(`Failed to update role: ${error.message}`);
    }
  }

  /**
   * Delete a custom role (system roles cannot be deleted)
   * @param {string} roleName - Name of the role to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteRole(roleName) {
    try {
      const role = await RoleConfig.findOne({ roleName });
      if (!role) {
        throw new Error(`Role '${roleName}' not found`);
      }

      if (role.isSystemRole) {
        throw new Error('Cannot delete system roles');
      }

      // Check if any users have this role
      const usersWithRole = await User.countDocuments({ role: roleName });
      if (usersWithRole > 0) {
        throw new Error(`Cannot delete role '${roleName}' - ${usersWithRole} users are assigned to this role`);
      }

      await RoleConfig.deleteOne({ roleName });
      return true;
    } catch (error) {
      throw new Error(`Failed to delete role: ${error.message}`);
    }
  }

  /**
   * Check if a user has permission for a specific module and action
   * @param {string} userRole - User's role name
   * @param {string} module - Module name
   * @param {string} action - Action name (optional)
   * @returns {Promise<boolean>} Permission status
   */
  async checkPermission(userRole, module, action = null) {
    try {
      const role = await this.getRoleByName(userRole);
      
      if (action) {
        return role.hasPermission(module, action);
      } else {
        return role.hasModulePermission(module);
      }
    } catch (error) {
      throw new Error(`Failed to check permission: ${error.message}`);
    }
  }

  /**
   * Get user's permissions as an array
   * @param {string} userRole - User's role name
   * @returns {Promise<Array>} Array of permissions
   */
  async getUserPermissions(userRole) {
    try {
      const role = await this.getRoleByName(userRole);
      return role.getPermissionsArray();
    } catch (error) {
      throw new Error(`Failed to get user permissions: ${error.message}`);
    }
  }

  /**
   * Get dashboard route for a specific role
   * @param {string} userRole - User's role name
   * @returns {Promise<string>} Dashboard route
   */
  async getDashboardRoute(userRole) {
    try {
      const role = await this.getRoleByName(userRole);
      return role.dashboardRoute || '/dashboard';
    } catch (error) {
      throw new Error(`Failed to get dashboard route: ${error.message}`);
    }
  }

  /**
   * Check if a user can manage another user's role
   * @param {string} managerRole - Role of the user trying to manage
   * @param {string} targetRole - Role being managed
   * @returns {Promise<boolean>} Management permission status
   */
  async canManageRole(managerRole, targetRole) {
    try {
      return await RoleConfig.canManageRole(managerRole, targetRole);
    } catch (error) {
      throw new Error(`Failed to check role management permission: ${error.message}`);
    }
  }

  /**
   * Get roles that a user can manage (based on hierarchy)
   * @param {string} userRole - User's role name
   * @returns {Promise<Array>} Array of manageable roles
   */
  async getManageableRoles(userRole) {
    try {
      const userRoleConfig = await this.getRoleByName(userRole);
      
      // Get all roles with higher hierarchy number (lower priority)
      const manageableRoles = await RoleConfig.find({
        isActive: true,
        hierarchy: { $gt: userRoleConfig.hierarchy }
      }).sort({ hierarchy: 1 });

      return manageableRoles;
    } catch (error) {
      throw new Error(`Failed to get manageable roles: ${error.message}`);
    }
  }

  /**
   * Initialize default roles (called during system setup)
   * @returns {Promise<void>}
   */
  async initializeDefaultRoles() {
    try {
      await RoleConfig.initializeDefaultRoles();
    } catch (error) {
      throw new Error(`Failed to initialize default roles: ${error.message}`);
    }
  }

  /**
   * Get role statistics
   * @returns {Promise<Object>} Role statistics
   */
  async getRoleStatistics() {
    try {
      const totalRoles = await RoleConfig.countDocuments({ isActive: true });
      const systemRoles = await RoleConfig.countDocuments({ isActive: true, isSystemRole: true });
      const customRoles = await RoleConfig.countDocuments({ isActive: true, isSystemRole: false });
      
      // Get user count per role
      const userCounts = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]);

      return {
        totalRoles,
        systemRoles,
        customRoles,
        userDistribution: userCounts
      };
    } catch (error) {
      throw new Error(`Failed to get role statistics: ${error.message}`);
    }
  }

  /**
   * Validate role permissions structure
   * @param {Object} permissions - Permissions object to validate
   * @returns {boolean} Validation result
   */
  validatePermissions(permissions) {
    if (!permissions || typeof permissions !== 'object') {
      return false;
    }

    // Check modules structure
    if (permissions.modules && typeof permissions.modules === 'object') {
      const validModules = [
        'dashboard', 'clients', 'projects', 'employees', 'attendance',
        'payments', 'procurement', 'invoices', 'amc', 'support',
        'accounting', 'activity_logs', 'user_management', 'system_settings', 'reports'
      ];
      
      for (const module of Object.keys(permissions.modules)) {
        if (!validModules.includes(module)) {
          return false;
        }
      }
    }

    // Check actions structure
    if (permissions.actions && typeof permissions.actions === 'object') {
      const validActions = [
        'create', 'read', 'update', 'delete', 'export', 'import', 'approve', 'reject'
      ];
      
      for (const action of Object.keys(permissions.actions)) {
        if (!validActions.includes(action)) {
          return false;
        }
      }
    }

    return true;
  }
}

export default new RoleService();