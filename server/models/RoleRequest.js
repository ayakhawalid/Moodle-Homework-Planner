const mongoose = require('mongoose');

const roleRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  desired_role: {
    type: String,
    enum: ['student', 'lecturer', 'admin'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  note: {
    type: String,
    default: ''
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Update the updated_at field before saving
roleRequestSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('RoleRequest', roleRequestSchema);
