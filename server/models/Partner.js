const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema({
  homework_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Homework',
    required: true,
    index: true
  },
  student1_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  student2_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Additional useful fields
  partnership_status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'active', 'completed'],
    default: 'pending'
  },
  
  // Who initiated the partnership
  initiated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Partnership details
  notes: {
    type: String,
    trim: true
  },
  
  // Timestamps
  created_at: {
    type: Date,
    default: Date.now
  },
  accepted_at: {
    type: Date
  },
  completed_at: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
partnerSchema.index({ homework_id: 1 });
partnerSchema.index({ student1_id: 1 });
partnerSchema.index({ student2_id: 1 });

// Compound indexes
partnerSchema.index({ homework_id: 1, student1_id: 1, student2_id: 1 }, { unique: true });

// Validation: student1_id and student2_id should be different
partnerSchema.pre('save', function(next) {
  if (this.student1_id.equals(this.student2_id)) {
    next(new Error('Students cannot partner with themselves'));
  } else {
    next();
  }
});

// Instance method to get partner of a specific student
partnerSchema.methods.getPartnerOf = function(studentId) {
  if (this.student1_id.equals(studentId)) {
    return this.student2_id;
  } else if (this.student2_id.equals(studentId)) {
    return this.student1_id;
  }
  return null;
};

// Instance method to check if student is in this partnership
partnerSchema.methods.includesStudent = function(studentId) {
  return this.student1_id.equals(studentId) || this.student2_id.equals(studentId);
};

// Instance method to accept partnership
partnerSchema.methods.accept = function() {
  this.partnership_status = 'accepted';
  this.accepted_at = new Date();
  return this.save();
};

// Instance method to complete partnership
partnerSchema.methods.complete = function() {
  this.partnership_status = 'completed';
  this.completed_at = new Date();
  return this.save();
};

// Static method to find by homework
partnerSchema.statics.findByHomework = function(homeworkId) {
  return this.find({ homework_id: homeworkId });
};

// Static method to find by student
partnerSchema.statics.findByStudent = function(studentId) {
  return this.find({
    $or: [
      { student1_id: studentId },
      { student2_id: studentId }
    ]
  });
};

// Static method to find active partnerships for student
partnerSchema.statics.findActiveByStudent = function(studentId) {
  return this.find({
    $or: [
      { student1_id: studentId },
      { student2_id: studentId }
    ],
    partnership_status: { $in: ['accepted', 'active'] }
  });
};

// Static method to check if partnership exists
partnerSchema.statics.partnershipExists = function(homeworkId, student1Id, student2Id) {
  return this.findOne({
    homework_id: homeworkId,
    $or: [
      { student1_id: student1Id, student2_id: student2Id },
      { student1_id: student2Id, student2_id: student1Id }
    ]
  });
};

module.exports = mongoose.model('Partner', partnerSchema);
