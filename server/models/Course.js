const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  course_name: {
    type: String,
    required: true,
    trim: true
  },
  lecturer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  syllabus: {
    type: String,
    trim: true
  },
  
  // Additional useful fields
  course_code: {
    type: String,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    trim: true
  },
  credits: {
    type: Number,
    min: 1,
    max: 10
  },
  semester: {
    type: String,
    enum: ['fall', 'spring', 'summer', 'winter']
  },
  year: {
    type: Number,
    min: 2020,
    max: 2030
  },
  
  // Students enrolled in the course
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Course status
  is_active: {
    type: Boolean,
    default: true
  },
  
  // Timestamps
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
courseSchema.index({ lecturer_id: 1 });
courseSchema.index({ course_name: 1 });
courseSchema.index({ course_code: 1 });
courseSchema.index({ students: 1 });

// Virtual for homework
courseSchema.virtual('homework', {
  ref: 'Homework',
  localField: '_id',
  foreignField: 'course_id'
});

// Virtual for classes
courseSchema.virtual('classes', {
  ref: 'Class',
  localField: '_id',
  foreignField: 'course_id'
});

// Virtual for exams
courseSchema.virtual('exams', {
  ref: 'Exam',
  localField: '_id',
  foreignField: 'course_id'
});

// Update the updated_at field before saving
courseSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Instance method to add student
courseSchema.methods.addStudent = function(studentId) {
  if (!this.students.includes(studentId)) {
    this.students.push(studentId);
  }
  return this.save();
};

// Instance method to remove student
courseSchema.methods.removeStudent = function(studentId) {
  this.students = this.students.filter(id => !id.equals(studentId));
  return this.save();
};

// Static method to find by lecturer
courseSchema.statics.findByLecturer = function(lecturerId) {
  return this.find({ lecturer_id: lecturerId, is_active: true });
};

// Static method to find by student
courseSchema.statics.findByStudent = function(studentId) {
  return this.find({ students: studentId, is_active: true });
};

module.exports = mongoose.model('Course', courseSchema);
