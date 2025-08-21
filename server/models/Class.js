const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  room: {
    type: String,
    required: true,
    trim: true
  },
  
  // Additional useful fields
  class_title: {
    type: String,
    trim: true
  },
  class_date: {
    type: Date,
    required: true,
    index: true
  },
  start_time: {
    type: String, // Format: "HH:MM"
    required: true
  },
  end_time: {
    type: String, // Format: "HH:MM"
    required: true
  },
  
  // Class details
  description: {
    type: String,
    trim: true
  },
  agenda: {
    type: String,
    trim: true
  },
  class_type: {
    type: String,
    enum: ['lecture', 'lab', 'seminar', 'workshop', 'exam', 'other'],
    default: 'lecture'
  },
  
  // Attendance tracking
  attendance_required: {
    type: Boolean,
    default: true
  },
  max_capacity: {
    type: Number,
    min: 1
  },
  
  // Class status
  is_cancelled: {
    type: Boolean,
    default: false
  },
  cancellation_reason: {
    type: String,
    trim: true
  },
  
  // Online class details
  is_online: {
    type: Boolean,
    default: false
  },
  meeting_link: {
    type: String,
    trim: true
  },
  meeting_password: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
classSchema.index({ course_id: 1 });
classSchema.index({ class_date: 1 });
classSchema.index({ room: 1 });

// Compound indexes
classSchema.index({ course_id: 1, class_date: 1 });
classSchema.index({ class_date: 1, start_time: 1 });

// Virtual for files
classSchema.virtual('files', {
  ref: 'File',
  localField: '_id',
  foreignField: 'class_id'
});

// Instance method to check if class is today
classSchema.methods.isToday = function() {
  const today = new Date();
  const classDate = new Date(this.class_date);
  return today.toDateString() === classDate.toDateString();
};

// Instance method to check if class is upcoming
classSchema.methods.isUpcoming = function() {
  const now = new Date();
  const classDateTime = new Date(this.class_date);
  const [hours, minutes] = this.start_time.split(':');
  classDateTime.setHours(parseInt(hours), parseInt(minutes));
  
  return classDateTime > now;
};

// Instance method to get duration in minutes
classSchema.methods.getDurationMinutes = function() {
  const [startHours, startMinutes] = this.start_time.split(':').map(Number);
  const [endHours, endMinutes] = this.end_time.split(':').map(Number);
  
  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;
  
  return endTotalMinutes - startTotalMinutes;
};

// Instance method to cancel class
classSchema.methods.cancel = function(reason) {
  this.is_cancelled = true;
  this.cancellation_reason = reason;
  return this.save();
};

// Static method to find by course
classSchema.statics.findByCourse = function(courseId) {
  return this.find({ course_id: courseId }).sort({ class_date: 1, start_time: 1 });
};

// Static method to find upcoming classes
classSchema.statics.findUpcoming = function(days = 7) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
  
  return this.find({
    class_date: { $gte: now, $lte: futureDate },
    is_cancelled: false
  }).sort({ class_date: 1, start_time: 1 });
};

// Static method to find by room
classSchema.statics.findByRoom = function(room) {
  return this.find({ room: room }).sort({ class_date: 1, start_time: 1 });
};

// Static method to find today's classes
classSchema.statics.findToday = function() {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));
  
  return this.find({
    class_date: { $gte: startOfDay, $lte: endOfDay },
    is_cancelled: false
  }).sort({ start_time: 1 });
};

module.exports = mongoose.model('Class', classSchema);
