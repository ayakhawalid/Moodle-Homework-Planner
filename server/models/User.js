const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Auth0 integration
  auth0_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true
  },
  
  // Your schema fields
  birth_date: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say']
  },
  role: {
    type: String,
    enum: ['admin', 'student', 'lecturer'],
    required: true,
    default: 'student'
  },
  
  // Additional Auth0 fields
  picture: String,
  email_verified: {
    type: Boolean,
    default: false
  },
  
  // Timestamps
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  last_login: {
    type: Date,
    default: Date.now
  },
  
  // Status
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ role: 1 });
userSchema.index({ email: 1 });
userSchema.index({ auth0_id: 1 });

// Virtual for courses (populated when needed)
userSchema.virtual('courses', {
  ref: 'Course',
  localField: '_id',
  foreignField: 'lecturer_id'
});

// Virtual for enrolled courses (for students)
userSchema.virtual('enrolled_courses', {
  ref: 'Course',
  localField: '_id',
  foreignField: 'students'
});

// Update the updated_at field before saving
userSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Instance method to check if user has role
userSchema.methods.hasRole = function(role) {
  return this.role === role;
};

// Static method to find by Auth0 ID
userSchema.statics.findByAuth0Id = function(auth0Id) {
  return this.findOne({ auth0_id: auth0Id });
};

module.exports = mongoose.model('User', userSchema);
