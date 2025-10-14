const mongoose = require('mongoose');

const studentHomeworkSchema = new mongoose.Schema({
  // Basic homework info
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  
  // Upload info
  uploaded_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploader_role: {
    type: String,
    enum: ['student', 'lecturer'],
    required: true
  },
  
  // Deadline info
  claimed_deadline: {
    type: Date,
    required: true
  },
  verified_deadline: {
    type: Date
  },
  deadline_verification_status: {
    type: String,
    enum: ['unverified', 'verified', 'rejected'],
    default: 'unverified'
  },
  deadline_verified_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deadline_verified_at: {
    type: Date
  },
  deadline_verification_notes: {
    type: String,
    trim: true
  },
  
  // Grade info
  claimed_grade: {
    type: Number,
    min: 0,
    max: 100
  },
  
  // Status
  completion_status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'graded'],
    default: 'not_started'
  },
  completed_at: {
    type: Date
  },
  is_late: {
    type: Boolean,
    default: false
  },
  
  // Partner settings
  allow_partners: {
    type: Boolean,
    default: false
  },
  max_partners: {
    type: Number,
    default: 1,
    min: 1,
    max: 1
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
studentHomeworkSchema.index({ course_id: 1 });
studentHomeworkSchema.index({ uploaded_by: 1 });
studentHomeworkSchema.index({ claimed_deadline: 1 });
studentHomeworkSchema.index({ completion_status: 1 });
studentHomeworkSchema.index({ deadline_verification_status: 1 });

// Virtual for days until deadline
studentHomeworkSchema.virtual('days_until_deadline').get(function() {
  const now = new Date();
  const deadline = this.claimed_deadline;
  const diffTime = deadline - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for overdue status
studentHomeworkSchema.virtual('is_overdue').get(function() {
  return new Date() > this.claimed_deadline && this.completion_status !== 'completed';
});

// Static method to find by course
studentHomeworkSchema.statics.findByCourse = function(courseId) {
  return this.find({ course_id: courseId }).populate('uploaded_by', 'name email');
};

// Static method to find pending verifications
studentHomeworkSchema.statics.findPendingVerifications = function() {
  return this.find({
    $or: [
      { deadline_verification_status: 'unverified' },
      { grade_verification_status: 'unverified' }
    ]
  }).populate('uploaded_by', 'name email').populate('course_id', 'course_name course_code');
};

module.exports = mongoose.model('StudentHomework', studentHomeworkSchema);
