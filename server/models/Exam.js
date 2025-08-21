const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  due_date: {
    type: Date,
    required: true,
    index: true
  },
  
  // Additional useful fields
  exam_title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  instructions: {
    type: String,
    trim: true
  },
  
  // Exam timing
  start_time: {
    type: String, // Format: "HH:MM"
    required: true
  },
  duration_minutes: {
    type: Number,
    required: true,
    min: 1
  },
  
  // Exam details
  exam_type: {
    type: String,
    enum: ['midterm', 'final', 'quiz', 'practical', 'oral', 'other'],
    default: 'other'
  },
  points_possible: {
    type: Number,
    min: 0,
    default: 100
  },
  
  // Exam location
  room: {
    type: String,
    trim: true
  },
  is_online: {
    type: Boolean,
    default: false
  },
  meeting_link: {
    type: String,
    trim: true
  },
  
  // Exam rules
  open_book: {
    type: Boolean,
    default: false
  },
  calculator_allowed: {
    type: Boolean,
    default: false
  },
  notes_allowed: {
    type: Boolean,
    default: false
  },
  
  // Exam status
  is_active: {
    type: Boolean,
    default: true
  },
  is_published: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
examSchema.index({ course_id: 1 });
examSchema.index({ due_date: 1 });
examSchema.index({ exam_type: 1 });

// Compound indexes
examSchema.index({ course_id: 1, due_date: 1 });

// Virtual for grades
examSchema.virtual('grades', {
  ref: 'Grade',
  localField: '_id',
  foreignField: 'exam_id'
});

// Instance method to check if exam is overdue
examSchema.methods.isOverdue = function() {
  return new Date() > this.due_date;
};

// Instance method to get days until exam
examSchema.methods.daysUntilExam = function() {
  const now = new Date();
  const exam = new Date(this.due_date);
  const diffTime = exam - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Instance method to get end time
examSchema.methods.getEndTime = function() {
  const [hours, minutes] = this.start_time.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + this.duration_minutes;
  
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
};

// Instance method to check if exam is today
examSchema.methods.isToday = function() {
  const today = new Date();
  const examDate = new Date(this.due_date);
  return today.toDateString() === examDate.toDateString();
};

// Instance method to publish exam
examSchema.methods.publish = function() {
  this.is_published = true;
  return this.save();
};

// Static method to find by course
examSchema.statics.findByCourse = function(courseId) {
  return this.find({ course_id: courseId, is_active: true }).sort({ due_date: 1 });
};

// Static method to find upcoming exams
examSchema.statics.findUpcoming = function(days = 14) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
  
  return this.find({
    due_date: { $gte: now, $lte: futureDate },
    is_active: true,
    is_published: true
  }).sort({ due_date: 1 });
};

// Static method to find by type
examSchema.statics.findByType = function(examType) {
  return this.find({ exam_type: examType, is_active: true }).sort({ due_date: 1 });
};

// Static method to find today's exams
examSchema.statics.findToday = function() {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));
  
  return this.find({
    due_date: { $gte: startOfDay, $lte: endOfDay },
    is_active: true,
    is_published: true
  }).sort({ start_time: 1 });
};

module.exports = mongoose.model('Exam', examSchema);
