import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
  message: { type: String, required: true },
  author: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    role: String,
  },
}, { timestamps: true });

const ticketSchema = new mongoose.Schema({
  ticketNumber: { type: String, unique: true },
  subject:      { type: String, required: true, trim: true },
  description:  { type: String, required: true, trim: true },
  priority:     { type: String, enum: ['low','medium','high','urgent'], default: 'medium' },
  category:     { type: String, trim: true },
  status:       { type: String, enum: ['open','in_progress','resolved','closed'], default: 'open' },
  client:       { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  clientName:   { type: String },
  replies:      [replySchema],
  raisedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  raisedByName: { type: String },
}, { timestamps: true });

ticketSchema.pre('save', async function (next) {
  if (!this.ticketNumber) {
    const count = await mongoose.model('Ticket').countDocuments();
    this.ticketNumber = `TKT-${String(count + 1001).padStart(4, '0')}`;
  }
  next();
});

export default mongoose.model('Ticket', ticketSchema);
