const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  original_name: {
    type: String,
    required: true
  },
  file_path: {
    type: String,
    required: true
  },
  file_size: {
    type: Number,
    required: true
  },
  mime_type: {
    type: String,
    required: true
  },
  
  // File associations (nullable as per your schema)
  homework_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Homework',
    default: null
  },
  class_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: null
  },
  
  // Who uploaded the file
  uploaded_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // File metadata
  description: {
    type: String,
    trim: true
  },
  file_type: {
    type: String,
    enum: ['assignment', 'resource', 'submission', 'other'],
    default: 'other'
  },
  
  // File status
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
fileSchema.index({ homework_id: 1 });
fileSchema.index({ class_id: 1 });
fileSchema.index({ uploaded_by: 1 });

// Instance method to get file URL
fileSchema.methods.getFileUrl = function() {
  return `/api/files/${this._id}/download`;
};

// Instance method to get file size in human readable format
fileSchema.methods.getFormattedSize = function() {
  const bytes = this.file_size;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Static method to find by homework
fileSchema.statics.findByHomework = function(homeworkId) {
  return this.find({ homework_id: homeworkId, is_active: true });
};

// Static method to find by class
fileSchema.statics.findByClass = function(classId) {
  return this.find({ class_id: classId, is_active: true });
};

// Static method to find by user
fileSchema.statics.findByUser = function(userId) {
  return this.find({ uploaded_by: userId, is_active: true }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('File', fileSchema);
