import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true
  },
  scopeOfWork: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client is required']
  },
  projectManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  teamMembers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['developer', 'designer', 'tester', 'analyst', 'other'],
      default: 'developer'
    },
    assignedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['planning', 'in_progress', 'testing', 'completed', 'on_hold', 'cancelled'],
    default: 'planning'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  actualEndDate: {
    type: Date
  },
  budget: {
    estimated: {
      type: Number,
      min: 0
    },
    actual: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  projectType: {
    type: String,
    enum: ['web_development', 'mobile_app', 'design', 'consulting', 'maintenance', 'other'],
    default: 'other',
  },
  technology: [String],
  agreements: [{
    title: { type: String, required: true },
    url: { type: String, required: true },
    version: { type: Number, default: 1 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
  }],
  milestones: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    dueDate: Date,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending'
    },
    completedAt: Date
  }],
  documents: [{
    name: String,
    url: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  // Technical solution / approach written by admin
  technicalSolution: {
    type: String,
    trim: true,
  },
  // Uploaded project documents (disk paths)
  projectDocs: {
    agreement:    { filename: String, path: String, originalName: String },
    scopeOfWork:  { filename: String, path: String, originalName: String },
    otherDoc:     { filename: String, path: String, originalName: String },
  },
  // Terms & Conditions
  termsAndConditions: {
    type: String,
    trim: true,
    default: `These Terms and Conditions ("Agreement") govern the use of services provided by ParNetsSoftware PVT LTD to the Client. By engaging our services, you agree to abide by this Agreement.

1. Services Offered
We provide web and mobile app development services, including but not limited to:
• Website design and development
• Mobile application design and development
• Maintenance and support services
• Integration of third-party APIs
• UI/UX design services

2. Engagement and Deliverables
2.1 Scope of Work
The scope of the project, deliverables, timeline, and pricing will be outlined in a separate agreement or proposal, which forms part of this Agreement.

2.2 Client Responsibilities
The Client must provide all necessary materials, content, and approvals in a timely manner to avoid project delays.

2.3 Changes in Scope
Any requests for changes outside the agreed scope of work will be subject to additional costs and an extended timeline.

3. Payment Terms
3.1 Payment Structure
Payments will be divided into milestones as agreed in the project proposal.

3.2 Non-refundable Deposits
Once the Payment is done no refund.

4. Intellectual Property
4.1 Ownership
Upon full payment, the Client owns the final deliverables.

4.2 Third-party Materials
Any third-party assets used will remain subject to their respective licensing agreements.

4.3 Portfolio Usage
The Company reserves the right to display the project as part of its portfolio unless otherwise agreed in writing.

5. Confidentiality
Both parties agree to keep confidential any proprietary or sensitive information shared during the project.

6. Warranty and Support
6.1 Warranty Period
We offer a warranty for 30 days post-project completion to address any bugs or issues related to the agreed scope.

6.2 Ongoing Support
Support and maintenance beyond the warranty period will be subject to additional fees.

7. Termination
7.1 By the Client
The Client may terminate the project by providing written notice. Any work completed up to the termination date will be billed accordingly.

7.2 By the Company
We may terminate the project for non-payment or breach of terms.

8. Liability
The Company is not liable for indirect or consequential damages, including loss of profits, data, or revenue, arising from the use of our services.

9. Governing Law
This Agreement is governed by the laws of Bengaluru City, Karnataka, and any disputes will be resolved under this jurisdiction.

10. Miscellaneous
10.1 Force Majeure
We are not responsible for delays caused by factors beyond our control, such as natural disasters or third-party service failures.

10.2 Entire Agreement
This document, along with the project proposal, constitutes the entire agreement between the parties.

Contact Information
For any questions or concerns about this Agreement, contact us at:
Email: hello@parnetsgroup.com
Phone: +91 9740016068`
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true
});

// Index for search
projectSchema.index({ name: 'text', description: 'text' });

export default mongoose.model('Project', projectSchema);