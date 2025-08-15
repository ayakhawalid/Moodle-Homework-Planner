const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Either homework_id or exam_id should be present (nullable as per your schema)
  homework_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Homework',
    default: null,
    index: true
  },
  exam_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    default: null,
    index: true
  },
  
  grade: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  
  // Additional useful fields
  points_earned: {
    type: Number,
    min: 0
  },
  points_possible: {
    type: Number,
    min: 0
  },
  letter_grade: {
    type: String,
    enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F']
  },
  
  // Grading details
  graded_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  feedback: {
    type: String,
    trim: true
  },
  
  // Submission details
  submission_date: {
    type: Date
  },
  is_late: {
    type: Boolean,
    default: false
  },
  
  // Grade status
  is_final: {
    type: Boolean,
    default: true
  },
  
  // Timestamps
  graded_at: {
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
gradeSchema.index({ student_id: 1 });
gradeSchema.index({ homework_id: 1 });
gradeSchema.index({ exam_id: 1 });
gradeSchema.index({ graded_by: 1 });
gradeSchema.index({ graded_at: -1 });

// Compound indexes
gradeSchema.index({ student_id: 1, homework_id: 1 });
gradeSchema.index({ student_id: 1, exam_id: 1 });

// Validation: Either homework_id or exam_id must be present
gradeSchema.pre('save', function(next) {
  if (!this.homework_id && !this.exam_id) {
    next(new Error('Either homework_id or exam_id must be provided'));
  } else if (this.homework_id && this.exam_id) {
    next(new Error('Cannot have both homework_id and exam_id'));
  } else {
    this.updated_at = Date.now();
    next();
  }
});

// Instance method to calculate letter grade
gradeSchema.methods.calculateLetterGrade = function() {
  const grade = this.grade;
  if (grade >= 97) return 'A+';
  if (grade >= 93) return 'A';
  if (grade >= 90) return 'A-';
  if (grade >= 87) return 'B+';
  if (grade >= 83) return 'B';
  if (grade >= 80) return 'B-';
  if (grade >= 77) return 'C+';
  if (grade >= 73) return 'C';
  if (grade >= 70) return 'C-';
  if (grade >= 67) return 'D+';
  if (grade >= 63) return 'D';
  if (grade >= 60) return 'D-';
  return 'F';
};

// Instance method to check if passing
gradeSchema.methods.isPassing = function() {
  return this.grade >= 60;
};

// Static method to find by student
gradeSchema.statics.findByStudent = function(studentId) {
  return this.find({ student_id: studentId }).sort({ graded_at: -1 });
};

// Static method to find by homework
gradeSchema.statics.findByHomework = function(homeworkId) {
  return this.find({ homework_id: homeworkId }).sort({ grade: -1 });
};

// Static method to find by exam
gradeSchema.statics.findByExam = function(examId) {
  return this.find({ exam_id: examId }).sort({ grade: -1 });
};

// Static method to calculate class average for homework
gradeSchema.statics.getHomeworkAverage = function(homeworkId) {
  return this.aggregate([
    { $match: { homework_id: homeworkId } },
    { $group: { _id: null, average: { $avg: '$grade' } } }
  ]);
};

module.exports = mongoose.model('Grade', gradeSchema);
