const mongoose = require('mongoose');

const homeworkSchema = new mongoose.Schema({
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  due_date: {
    type: Date,
    required: true
  },
  
  // Additional useful fields
  assigned_date: {
    type: Date,
    default: Date.now
  },
  points_possible: {
    type: Number,
    min: 0,
    default: 100
  },
  instructions: {
    type: String,
    trim: true
  },
  submission_type: {
    type: String,
    enum: ['file', 'text', 'both'],
    default: 'both'
  },
  
  // Homework status
  is_active: {
    type: Boolean,
    default: true
  },
  allow_late_submission: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
homeworkSchema.index({ course_id: 1 });
homeworkSchema.index({ due_date: 1 });
homeworkSchema.index({ assigned_date: 1 });

// Virtual for grades
homeworkSchema.virtual('grades', {
  ref: 'Grade',
  localField: '_id',
  foreignField: 'homework_id'
});

// Virtual for files
homeworkSchema.virtual('files', {
  ref: 'File',
  localField: '_id',
  foreignField: 'homework_id'
});

// Virtual for partners
homeworkSchema.virtual('partners', {
  ref: 'Partner',
  localField: '_id',
  foreignField: 'homework_id'
});

// Instance method to check if overdue
homeworkSchema.methods.isOverdue = function() {
  return new Date() > this.due_date;
};

// Instance method to get days until due
homeworkSchema.methods.daysUntilDue = function() {
  const now = new Date();
  const due = new Date(this.due_date);
  const diffTime = due - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Static method to find upcoming homework
homeworkSchema.statics.findUpcoming = function(days = 7) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
  
  return this.find({
    due_date: { $gte: now, $lte: futureDate },
    is_active: true
  }).sort({ due_date: 1 });
};

// Static method to find by course
homeworkSchema.statics.findByCourse = function(courseId) {
  return this.find({ course_id: courseId, is_active: true }).sort({ due_date: 1 });
};

module.exports = mongoose.model('Homework', homeworkSchema);
