const mongoose = require('mongoose');

const studyProgressSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  hours_studied: {
    type: Number,
    required: true,
    min: 0,
    max: 24
  },
  tasks_completed: {
    type: String,
    required: true,
    trim: true
  },
  
  // Additional useful fields
  subjects_studied: [{
    subject: {
      type: String,
      trim: true
    },
    hours: {
      type: Number,
      min: 0
    }
  }],
  
  // Study session details
  study_sessions: [{
    start_time: String, // Format: "HH:MM"
    end_time: String,   // Format: "HH:MM"
    subject: String,
    notes: String,
    productivity_rating: {
      type: Number,
      min: 1,
      max: 5
    }
  }],
  
  // Goals and achievements
  daily_goal_hours: {
    type: Number,
    min: 0,
    default: 0
  },
  goal_achieved: {
    type: Boolean,
    default: false
  },
  
  // Study quality metrics
  focus_rating: {
    type: Number,
    min: 1,
    max: 5
  },
  difficulty_rating: {
    type: Number,
    min: 1,
    max: 5
  },
  
  // Monthly summary (optional as per your schema)
  month_summary: {
    type: String,
    trim: true
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
studyProgressSchema.index({ student_id: 1 });
studyProgressSchema.index({ date: 1 });
studyProgressSchema.index({ student_id: 1, date: 1 }, { unique: true });

// Compound indexes for queries
studyProgressSchema.index({ student_id: 1, date: -1 });

// Update the updated_at field before saving
studyProgressSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Check if daily goal is achieved
  if (this.daily_goal_hours > 0) {
    this.goal_achieved = this.hours_studied >= this.daily_goal_hours;
  }
  
  next();
});

// Instance method to add study session
studyProgressSchema.methods.addStudySession = function(session) {
  this.study_sessions.push(session);
  
  // Recalculate total hours
  const totalMinutes = this.study_sessions.reduce((total, session) => {
    const [startHours, startMinutes] = session.start_time.split(':').map(Number);
    const [endHours, endMinutes] = session.end_time.split(':').map(Number);
    
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    return total + (endTotalMinutes - startTotalMinutes);
  }, 0);
  
  this.hours_studied = Math.round((totalMinutes / 60) * 100) / 100; // Round to 2 decimal places
  
  return this.save();
};

// Instance method to get week number
studyProgressSchema.methods.getWeekNumber = function() {
  const date = new Date(this.date);
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

// Instance method to get month/year string
studyProgressSchema.methods.getMonthYear = function() {
  const date = new Date(this.date);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
};

// Static method to find by student
studyProgressSchema.statics.findByStudent = function(studentId) {
  return this.find({ student_id: studentId }).sort({ date: -1 });
};

// Static method to find by date range
studyProgressSchema.statics.findByDateRange = function(studentId, startDate, endDate) {
  return this.find({
    student_id: studentId,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });
};

// Static method to get weekly summary
studyProgressSchema.statics.getWeeklySummary = function(studentId, weekStart) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  return this.aggregate([
    {
      $match: {
        student_id: studentId,
        date: { $gte: weekStart, $lte: weekEnd }
      }
    },
    {
      $group: {
        _id: null,
        total_hours: { $sum: '$hours_studied' },
        days_studied: { $sum: 1 },
        avg_hours_per_day: { $avg: '$hours_studied' },
        goals_achieved: { $sum: { $cond: ['$goal_achieved', 1, 0] } }
      }
    }
  ]);
};

// Static method to get monthly summary
studyProgressSchema.statics.getMonthlySummary = function(studentId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  return this.aggregate([
    {
      $match: {
        student_id: studentId,
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        total_hours: { $sum: '$hours_studied' },
        days_studied: { $sum: 1 },
        avg_hours_per_day: { $avg: '$hours_studied' },
        goals_achieved: { $sum: { $cond: ['$goal_achieved', 1, 0] } },
        avg_focus_rating: { $avg: '$focus_rating' },
        avg_difficulty_rating: { $avg: '$difficulty_rating' }
      }
    }
  ]);
};

// Static method to get study streak
studyProgressSchema.statics.getStudyStreak = function(studentId) {
  return this.find({ student_id: studentId })
    .sort({ date: -1 })
    .then(records => {
      let streak = 0;
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      
      for (const record of records) {
        const recordDate = new Date(record.date);
        recordDate.setHours(0, 0, 0, 0);
        
        if (recordDate.getTime() === currentDate.getTime()) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }
      
      return streak;
    });
};

module.exports = mongoose.model('StudyProgress', studyProgressSchema);
