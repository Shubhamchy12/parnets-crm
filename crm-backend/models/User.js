import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: {
      values: [
        'super_admin', 
        'admin',
        'sub_admin',
        'manager',
        'team_lead',
        'senior_developer',
        'developer',
        'junior_developer',
        'designer',
        'ui_ux_designer',
        'tester',
        'qa_engineer',
        'business_analyst',
        'project_coordinator',
        'hr_executive',
        'accountant',
        'sales_executive',
        'marketing_executive',
        'intern',
        'employee', // Keep for backward compatibility
        'sales', 
        'client'
      ],
      message: 'Invalid role specified'
    },
    default: 'employee'
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
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  otpSecret: {
    type: String,
    select: false
  },
  otpExpiry: {
    type: Date,
    select: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  profile: {
    phone: String,
    department: String,
    designation: String,
    avatar: String,
    joiningDate: Date,
    salary: mongoose.Schema.Types.Mixed,
    documents: {
      aadhaar: String,
      pan: String,
      photo: String,
      other: [String]
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'India' }
    }
  },
  // Direct fields for easier access
  phone: String,
  department: String,
  designation: String,
  salary: Number,
  joiningDate: { type: Date, default: Date.now },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ createdBy: 1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Method to set default permissions based on role
userSchema.methods.setDefaultPermissions = async function() {
  try {
    // Import RoleConfig here to avoid circular dependency
    const RoleConfig = mongoose.model('RoleConfig');
    const roleConfig = await RoleConfig.getRoleByName(this.role);
    
    if (roleConfig && roleConfig.permissions) {
      this.permissions = roleConfig.permissions;
    } else {
      // Fallback to hardcoded permissions if role config not found
      const rolePermissions = {
        super_admin: {
          modules: {
            dashboard: true, clients: true, projects: true, employees: true,
            attendance: true, payments: true, invoices: true, support: true,
            reports: true, settings: true
          },
          actions: { create: true, read: true, update: true, delete: true, export: true, import: true }
        },
        employee: {
          modules: {
            dashboard: true, clients: false, projects: false, employees: false,
            attendance: true, payments: false, invoices: false, support: false,
            reports: false, settings: false
          },
          actions: { create: false, read: true, update: false, delete: false, export: false, import: false }
        },
        sales: {
          modules: {
            dashboard: true, clients: true, projects: true, employees: false,
            attendance: false, payments: false, invoices: true, support: false,
            reports: true, settings: false
          },
          actions: { create: true, read: true, update: true, delete: false, export: true, import: false }
        },
        client: {
          modules: {
            dashboard: true, clients: false, projects: true, employees: false,
            attendance: false, payments: false, invoices: true, support: true,
            reports: false, settings: false
          },
          actions: { create: false, read: true, update: false, delete: false, export: false, import: false }
        }
      };

      if (rolePermissions[this.role]) {
        this.permissions = rolePermissions[this.role];
      }
    }
  } catch (error) {
    console.error('Error setting default permissions:', error.message);
    // Set minimal permissions as fallback
    this.permissions = {
      modules: { dashboard: true },
      actions: { read: true }
    };
  }
};

// Method to check if user has permission for a specific module and action
userSchema.methods.hasPermission = function(module, action = 'read') {
  // Super admin has all permissions
  if (this.role === 'super_admin') {
    return true;
  }
  
  // Check module access first
  if (!this.permissions.modules[module]) {
    return false;
  }
  
  // Check action permission
  return this.permissions.actions[action] || false;
};

// Method to get user's accessible modules
userSchema.methods.getAccessibleModules = function() {
  if (this.role === 'super_admin') {
    return Object.keys(this.permissions.modules);
  }
  
  return Object.keys(this.permissions.modules).filter(module => 
    this.permissions.modules[module]
  );
};

// Method to get user's allowed actions
userSchema.methods.getAllowedActions = function() {
  if (this.role === 'super_admin') {
    return Object.keys(this.permissions.actions);
  }
  
  return Object.keys(this.permissions.actions).filter(action => 
    this.permissions.actions[action]
  );
};

// Method to update user permissions
userSchema.methods.updatePermissions = function(newPermissions) {
  // Merge with existing permissions
  if (newPermissions.modules) {
    this.permissions.modules = { ...this.permissions.modules, ...newPermissions.modules };
  }
  
  if (newPermissions.actions) {
    this.permissions.actions = { ...this.permissions.actions, ...newPermissions.actions };
  }
  
  this.markModified('permissions');
};

// Static method to create super admin
userSchema.statics.createSuperAdmin = async function(userData) {
  const superAdmin = new this({
    ...userData,
    role: 'super_admin',
    status: 'active'
  });
  
  await superAdmin.setDefaultPermissions();
  return await superAdmin.save();
};

export default mongoose.model('User', userSchema);