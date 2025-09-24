const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Homework = require('../models/Homework');
const Grade = require('../models/Grade');
const User = require('../models/User');
const StudyProgress = require('../models/StudyProgress');
const Exam = require('../models/Exam');
const Class = require('../models/Class');
const { checkJwt, extractUser, requireStudent } = require('../middleware/auth');

// GET /api/student-dashboard/overview - Get student dashboard overview
router.get('/overview', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Get student's enrolled courses
    const courses = await Course.find({ 
      students: studentId, 
      is_active: true 
    })
    .populate('lecturer_id', 'name email full_name')
    .populate('homework')
    .populate('classes')
    .populate('exams');
    
    // Get homework for enrolled courses
    const courseIds = courses.map(course => course._id);
    const homework = await Homework.find({ 
      course_id: { $in: courseIds }, 
      is_active: true 
    })
    .populate('course_id', 'course_name course_code')
    .sort({ due_date: 1 });
    
    // Get student's grades
    const grades = await Grade.find({ student_id: studentId })
      .populate('homework_id', 'title due_date points_possible')
      .populate('exam_id', 'exam_title due_date points_possible');
    
    // Get exams for enrolled courses
    const exams = await Exam.find({ 
      course_id: { $in: courseIds }, 
      is_active: true 
    })
    .populate('course_id', 'course_name course_code')
    .sort({ due_date: 1 });

    // Get study progress for the last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const studyProgress = await StudyProgress.find({ 
      student_id: studentId,
      date: { $gte: startDate, $lte: endDate }
    })
    .sort({ date: 1 }); // Sort by date ascending for weekly chart
    
    // Calculate statistics
    const totalCourses = courses.length;
    const totalHomework = homework.length;
    const totalExams = exams.length;
    const completedHomework = grades.filter(grade => grade.homework_id).length;
    const upcomingHomework = homework.filter(hw => new Date(hw.due_date) > new Date()).length;
    const overdueHomework = homework.filter(hw => new Date(hw.due_date) < new Date() && 
      !grades.some(grade => grade.homework_id && grade.homework_id._id.equals(hw._id))).length;
    
    // Calculate exam statistics
    const upcomingExams = exams.filter(exam => new Date(exam.due_date) > new Date());
    const overdueExams = exams.filter(exam => new Date(exam.due_date) < new Date() && 
      !grades.some(grade => grade.exam_id && grade.exam_id.equals(exam._id)));
    
    // Calculate average grade
    const averageGrade = grades.length > 0 
      ? grades.reduce((sum, grade) => sum + grade.grade, 0) / grades.length 
      : 0;
    
    // Calculate study hours for the week
    const weeklyStudyHours = studyProgress.reduce((sum, progress) => sum + progress.hours_studied, 0);
    
    const overview = {
      courses: {
        total: totalCourses,
        list: courses.map(course => ({
          _id: course._id,
          course_name: course.course_name,
          course_code: course.course_code,
          lecturer: course.lecturer_id ? {
            name: course.lecturer_id.name || course.lecturer_id.full_name,
            email: course.lecturer_id.email
          } : null,
          homework_count: course.homework ? course.homework.length : 0
        }))
      },
      homework: {
        total: totalHomework,
        completed: completedHomework,
        upcoming: upcomingHomework,
        overdue: overdueHomework,
        average_grade: Math.round(averageGrade * 100) / 100
      },
      exams: {
        total: totalExams,
        upcoming: upcomingExams.length,
        overdue: overdueExams.length,
        upcoming_list: upcomingExams.slice(0, 3).map(exam => ({
          _id: exam._id,
          exam_title: exam.exam_title,
          due_date: exam.due_date,
          exam_type: exam.exam_type,
          course: {
            name: exam.course_id.course_name,
            code: exam.course_id.course_code
          },
          days_until_due: Math.ceil((new Date(exam.due_date) - new Date()) / (1000 * 60 * 60 * 24))
        }))
      },
      study_progress: {
        weekly_hours: weeklyStudyHours,
        daily_average: studyProgress.length > 0 ? Math.round((weeklyStudyHours / studyProgress.length) * 10) / 10 : 0,
        goal_achieved_days: studyProgress.filter(progress => progress.goal_achieved).length,
        weekly_breakdown: (() => {
          // Create array for last 7 days with study hours
          const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          const weeklyData = [];
          
          for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i)); // Start from 7 days ago
            
            const dayProgress = studyProgress.find(progress => 
              new Date(progress.date).toDateString() === date.toDateString()
            );
            
            weeklyData.push(dayProgress ? dayProgress.hours_studied : 0);
          }
          
          return weeklyData;
        })()
      },
      recent_activity: {
        recent_grades: grades.slice(0, 5).map(grade => ({
          _id: grade._id,
          grade: grade.grade,
          type: grade.homework_id ? 'homework' : 'exam',
          title: grade.homework_id ? grade.homework_id.title : grade.exam_id.exam_title,
          date: grade.graded_at
        })),
        recent_study_sessions: studyProgress.slice(0, 3).map(progress => ({
          date: progress.date,
          hours: progress.hours_studied,
          tasks: progress.tasks_completed
        }))
      }
    };
    
    res.json(overview);
  } catch (error) {
    console.error('Error fetching student dashboard overview:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard overview' });
  }
});

// GET /api/student-dashboard/homework-planner - Get homework planner data
router.get('/homework-planner', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { status = 'all', course_id, upcoming_days = 7 } = req.query;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Get student's enrolled courses
    const courses = await Course.find({ 
      students: studentId, 
      is_active: true 
    });
    const courseIds = courses.map(course => course._id);
    
    // Build filter for homework
    let filter = { 
      course_id: { $in: courseIds }, 
      is_active: true 
    };
    
    if (course_id) {
      filter.course_id = course_id;
    }
    
    // Get homework with submission status
    const homework = await Homework.find(filter)
      .populate('course_id', 'course_name course_code')
      .sort({ due_date: 1 });
    
    // Get student's grades for these homework
    const homeworkIds = homework.map(hw => hw._id);
    const grades = await Grade.find({ 
      student_id: studentId,
      homework_id: { $in: homeworkIds }
    });
    
    // Process homework with submission status
    const processedHomework = homework.map(hw => {
      const grade = grades.find(g => g.homework_id && g.homework_id.equals(hw._id));
      const isSubmitted = !!grade;
      const isGraded = isSubmitted && grade.grade !== null;
      const isOverdue = new Date() > hw.due_date && !isSubmitted;
      
      let status = 'pending';
      if (isGraded) {
        status = 'graded';
      } else if (isSubmitted) {
        status = 'submitted';
      } else if (isOverdue) {
        status = 'overdue';
      }
      
      return {
        _id: hw._id,
        title: hw.title,
        description: hw.description,
        due_date: hw.due_date,
        assigned_date: hw.assigned_date,
        points_possible: hw.points_possible,
        course: {
          _id: hw.course_id._id,
          name: hw.course_id.course_name,
          code: hw.course_id.course_code
        },
        status: status,
        is_submitted: isSubmitted,
        is_graded: isGraded,
        is_overdue: isOverdue,
        grade: isGraded ? grade.grade : null,
        days_until_due: Math.ceil((new Date(hw.due_date) - new Date()) / (1000 * 60 * 60 * 24))
      };
    });
    
    // Filter based on status
    let filteredHomework = processedHomework;
    if (status === 'pending') {
      filteredHomework = processedHomework.filter(hw => hw.status === 'pending');
    } else if (status === 'overdue') {
      filteredHomework = processedHomework.filter(hw => hw.status === 'overdue');
    } else if (status === 'upcoming') {
      const days = parseInt(upcoming_days);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      filteredHomework = processedHomework.filter(hw => 
        new Date(hw.due_date) <= futureDate && hw.status !== 'graded'
      );
    }
    
    // Get summary statistics
    const totalHomework = processedHomework.length;
    const completedHomework = processedHomework.filter(hw => hw.status === 'graded').length;
    const pendingHomework = processedHomework.filter(hw => hw.status === 'pending').length;
    const overdueHomework = processedHomework.filter(hw => hw.status === 'overdue').length;
    
    const homeworkSummary = {
      total: totalHomework,
      completed: completedHomework,
      pending: pendingHomework,
      overdue: overdueHomework,
      completion_rate: totalHomework > 0 ? Math.round((completedHomework / totalHomework) * 100) : 0
    };
    
    res.json({
      homework: filteredHomework,
      summary: homeworkSummary,
      courses: courses.map(course => ({
        _id: course._id,
        name: course.course_name,
        code: course.course_code
      }))
    });
  } catch (error) {
    console.error('Error fetching homework planner data:', error);
    res.status(500).json({ error: 'Failed to fetch homework planner data' });
  }
});

// GET /api/student-dashboard/courses-info - Get student's course information
router.get('/courses-info', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Get student's enrolled courses with all related data
    const courses = await Course.find({ 
      students: studentId, 
      is_active: true 
    })
    .populate('lecturer_id', 'name email full_name')
    .populate({
      path: 'homework',
      match: { is_active: true },
      populate: {
        path: 'grades',
        match: { student_id: studentId }
      }
    })
    .populate({
      path: 'classes',
      match: { is_active: true }
    })
    .populate({
      path: 'exams',
      match: { is_active: true }
    });
    
    const coursesInfo = courses.map(course => {
      const totalHomework = course.homework ? course.homework.length : 0;
      const totalClasses = course.classes ? course.classes.length : 0;
      const totalExams = course.exams ? course.exams.length : 0;
      
      // Calculate student's average grade for this course
      let totalGrade = 0;
      let gradeCount = 0;
      if (course.homework) {
        course.homework.forEach(hw => {
          if (hw.grades && hw.grades.length > 0) {
            hw.grades.forEach(grade => {
              totalGrade += grade.grade;
              gradeCount++;
            });
          }
        });
      }
      const averageGrade = gradeCount > 0 ? totalGrade / gradeCount : 0;
      
      return {
        _id: course._id,
        course_name: course.course_name,
        course_code: course.course_code,
        description: course.description,
        credits: course.credits,
        semester: course.semester,
        year: course.year,
        lecturer: course.lecturer_id ? {
          _id: course.lecturer_id._id,
          name: course.lecturer_id.name || course.lecturer_id.full_name,
          email: course.lecturer_id.email
        } : null,
        statistics: {
          homework_count: totalHomework,
          class_count: totalClasses,
          exam_count: totalExams,
          average_grade: Math.round(averageGrade * 100) / 100,
          letter_grade: getLetterGrade(averageGrade)
        },
        recent_homework: course.homework ? course.homework
          .sort((a, b) => new Date(b.due_date) - new Date(a.due_date))
          .slice(0, 5)
          .map(hw => ({
            _id: hw._id,
            title: hw.title,
            due_date: hw.due_date,
            is_submitted: hw.grades && hw.grades.length > 0,
            grade: hw.grades && hw.grades.length > 0 ? hw.grades[0].grade : null
          })) : []
      };
    });
    
    res.json(coursesInfo);
  } catch (error) {
    console.error('Error fetching courses info:', error);
    res.status(500).json({ error: 'Failed to fetch courses info' });
  }
});

// GET /api/student-dashboard/study-progress - Get study progress data
router.get('/study-progress', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { days = 30 } = req.query;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Get study progress for the specified period
    const studyProgress = await StudyProgress.find({
      student_id: studentId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });
    
    // Calculate statistics
    const totalHours = studyProgress.reduce((sum, progress) => sum + progress.hours_studied, 0);
    const averageHoursPerDay = studyProgress.length > 0 ? totalHours / studyProgress.length : 0;
    const goalAchievedDays = studyProgress.filter(progress => progress.goal_achieved).length;
    const totalStudyDays = studyProgress.length;
    
    // Get weekly breakdown
    const weeklyData = [];
    const currentWeek = new Date(startDate);
    while (currentWeek <= endDate) {
      const weekStart = new Date(currentWeek);
      const weekEnd = new Date(currentWeek);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const weekProgress = studyProgress.filter(progress => 
        progress.date >= weekStart && progress.date <= weekEnd
      );
      
      const weekHours = weekProgress.reduce((sum, progress) => sum + progress.hours_studied, 0);
      const weekGoalDays = weekProgress.filter(progress => progress.goal_achieved).length;
      
      weeklyData.push({
        week_start: weekStart,
        week_end: weekEnd,
        total_hours: weekHours,
        goal_achieved_days: weekGoalDays,
        study_days: weekProgress.length
      });
      
      currentWeek.setDate(currentWeek.getDate() + 7);
    }
    
    // Get subject breakdown
    const subjectStats = {};
    studyProgress.forEach(progress => {
      if (progress.subjects_studied) {
        progress.subjects_studied.forEach(subject => {
          if (!subjectStats[subject.subject]) {
            subjectStats[subject.subject] = { hours: 0, sessions: 0 };
          }
          subjectStats[subject.subject].hours += subject.hours || 0;
          subjectStats[subject.subject].sessions += 1;
        });
      }
    });
    
    const studyProgressData = {
      overview: {
        total_hours: totalHours,
        average_hours_per_day: Math.round(averageHoursPerDay * 10) / 10,
        goal_achieved_days: goalAchievedDays,
        total_study_days: totalStudyDays,
        study_consistency: totalStudyDays > 0 ? Math.round((totalStudyDays / parseInt(days)) * 100) : 0
      },
      weekly_breakdown: weeklyData,
      subject_breakdown: Object.entries(subjectStats).map(([subject, stats]) => ({
        subject: subject,
        total_hours: stats.hours,
        sessions: stats.sessions,
        average_hours_per_session: stats.sessions > 0 ? Math.round((stats.hours / stats.sessions) * 10) / 10 : 0
      })),
      recent_sessions: studyProgress
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10)
        .map(progress => ({
          date: progress.date,
          hours_studied: progress.hours_studied,
          tasks_completed: progress.tasks_completed,
          goal_achieved: progress.goal_achieved,
          focus_rating: progress.focus_rating,
          difficulty_rating: progress.difficulty_rating
        }))
    };
    
    res.json(studyProgressData);
  } catch (error) {
    console.error('Error fetching study progress data:', error);
    res.status(500).json({ error: 'Failed to fetch study progress data' });
  }
});

// GET /api/student-dashboard/grades - Get student's grades
router.get('/grades', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { course_id } = req.query;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Build filter for grades
    let filter = { student_id: studentId };
    
    if (course_id) {
      // If course_id is provided, get grades for homework/exams in that course
      const homework = await Homework.find({ course_id: course_id }).select('_id');
      const exams = await Exam.find({ course_id: course_id }).select('_id');
      
      const homeworkIds = homework.map(hw => hw._id);
      const examIds = exams.map(exam => exam._id);
      
      filter.$or = [
        { homework_id: { $in: homeworkIds } },
        { exam_id: { $in: examIds } }
      ];
    }
    
    // Get grades with populated data
    const grades = await Grade.find(filter)
      .populate('homework_id', 'title due_date points_possible course_id')
      .populate('exam_id', 'exam_title due_date points_possible course_id')
      .populate({
        path: 'homework_id',
        populate: {
          path: 'course_id',
          select: 'course_name course_code'
        }
      })
      .populate({
        path: 'exam_id',
        populate: {
          path: 'course_id',
          select: 'course_name course_code'
        }
      })
      .sort({ graded_at: -1 });
    
    // Process grades
    const processedGrades = grades.map(grade => {
      const isHomework = !!grade.homework_id;
      const assignment = isHomework ? grade.homework_id : grade.exam_id;
      const course = assignment.course_id;
      
      return {
        _id: grade._id,
        type: isHomework ? 'homework' : 'exam',
        title: isHomework ? assignment.title : assignment.exam_title,
        course: {
          _id: course._id,
          name: course.course_name,
          code: course.course_code
        },
        grade: grade.grade,
        points_earned: grade.points_earned,
        points_possible: grade.points_possible || assignment.points_possible,
        letter_grade: grade.letter_grade || getLetterGrade(grade.grade),
        feedback: grade.feedback,
        graded_at: grade.graded_at,
        due_date: assignment.due_date,
        is_late: grade.is_late
      };
    });
    
    // Calculate statistics
    const totalGrades = processedGrades.length;
    const averageGrade = totalGrades > 0 
      ? processedGrades.reduce((sum, grade) => sum + grade.grade, 0) / totalGrades 
      : 0;
    
    const gradeDistribution = {
      'A+': processedGrades.filter(g => g.letter_grade === 'A+').length,
      'A': processedGrades.filter(g => g.letter_grade === 'A').length,
      'A-': processedGrades.filter(g => g.letter_grade === 'A-').length,
      'B+': processedGrades.filter(g => g.letter_grade === 'B+').length,
      'B': processedGrades.filter(g => g.letter_grade === 'B').length,
      'B-': processedGrades.filter(g => g.letter_grade === 'B-').length,
      'C+': processedGrades.filter(g => g.letter_grade === 'C+').length,
      'C': processedGrades.filter(g => g.letter_grade === 'C').length,
      'C-': processedGrades.filter(g => g.letter_grade === 'C-').length,
      'D+': processedGrades.filter(g => g.letter_grade === 'D+').length,
      'D': processedGrades.filter(g => g.letter_grade === 'D').length,
      'D-': processedGrades.filter(g => g.letter_grade === 'D-').length,
      'F': processedGrades.filter(g => g.letter_grade === 'F').length
    };
    
    const gradesData = {
      grades: processedGrades,
      statistics: {
        total_grades: totalGrades,
        average_grade: Math.round(averageGrade * 100) / 100,
        letter_grade: getLetterGrade(averageGrade),
        grade_distribution: gradeDistribution
      }
    };
    
    res.json(gradesData);
  } catch (error) {
    console.error('Error fetching grades data:', error);
    res.status(500).json({ error: 'Failed to fetch grades data' });
  }
});

// GET /api/student-dashboard/classes-planner - Get classes planner data
router.get('/classes-planner', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { week_start } = req.query;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Get student's enrolled courses
    const courses = await Course.find({ 
      students: studentId, 
      is_active: true 
    });
    const courseIds = courses.map(course => course._id);
    
    // Calculate week range
    let weekStartDate;
    if (week_start) {
      weekStartDate = new Date(week_start);
    } else {
      // Default to current week
      const now = new Date();
      const dayOfWeek = now.getDay();
      weekStartDate = new Date(now);
      weekStartDate.setDate(now.getDate() - dayOfWeek);
      weekStartDate.setHours(0, 0, 0, 0);
    }
    
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    weekEndDate.setHours(23, 59, 59, 999);
    
    // Get classes for the week
    const classes = await Class.find({
      course_id: { $in: courseIds },
      class_date: { $gte: weekStartDate, $lte: weekEndDate },
      is_active: true
    })
    .populate('course_id', 'course_name course_code')
    .sort({ class_date: 1 });
    
    // Group classes by day
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weeklySchedule = daysOfWeek.map((day, index) => {
      const dayDate = new Date(weekStartDate);
      dayDate.setDate(weekStartDate.getDate() + index);
      
      const dayClasses = classes.filter(cls => {
        const classDate = new Date(cls.class_date);
        return classDate.toDateString() === dayDate.toDateString();
      });
      
              return {
          day: day,
          date: dayDate,
          classes: dayClasses.map(cls => ({
            _id: cls._id,
            topic: cls.class_title,
            description: cls.description,
            room: cls.room,
            start_time: cls.start_time,
            end_time: cls.end_time,
            duration_minutes: cls.getDurationMinutes ? cls.getDurationMinutes() : 90,
            class_date: cls.class_date,
            course: {
              _id: cls.course_id._id,
              name: cls.course_id.course_name,
              code: cls.course_id.course_code
            }
          }))
        };
    });
    
    // Calculate statistics
    const totalClasses = classes.length;
    const totalHours = classes.reduce((sum, cls) => {
      const duration = cls.getDurationMinutes ? cls.getDurationMinutes() : 90;
      return sum + duration;
    }, 0) / 60;
    
    const classesData = {
      week_start: weekStartDate,
      week_end: weekEndDate,
      schedule: weeklySchedule,
      statistics: {
        total_classes: totalClasses,
        total_hours: Math.round(totalHours * 10) / 10,
        average_classes_per_day: totalClasses > 0 ? Math.round((totalClasses / 7) * 10) / 10 : 0
      }
    };
    
    res.json(classesData);
  } catch (error) {
    console.error('Error fetching classes planner data:', error);
    res.status(500).json({ error: 'Failed to fetch classes planner data' });
  }
});

// GET /api/student-dashboard/exams - Get exams data
router.get('/exams', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { status = 'all', course_id } = req.query;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Get student's enrolled courses
    const courses = await Course.find({ 
      students: studentId, 
      is_active: true 
    });
    const courseIds = courses.map(course => course._id);
    
    // Build filter for exams
    let filter = { 
      course_id: { $in: courseIds }, 
      is_active: true 
    };
    
    if (course_id) {
      filter.course_id = course_id;
    }
    
    // Get exams
    const exams = await Exam.find(filter)
      .populate('course_id', 'course_name course_code')
      .sort({ due_date: 1 });
    
    // Get student's grades for these exams
    const examIds = exams.map(exam => exam._id);
    const grades = await Grade.find({ 
      student_id: studentId,
      exam_id: { $in: examIds }
    });
    
    // Process exams with status
    const processedExams = exams.map(exam => {
      const grade = grades.find(g => g.exam_id && g.exam_id.equals(exam._id));
      const isCompleted = !!grade;
      const isGraded = isCompleted && grade.grade !== null;
      const isOverdue = new Date() > exam.due_date && !isCompleted;
      
      let status = 'upcoming';
      if (isGraded) {
        status = 'graded';
      } else if (isCompleted) {
        status = 'completed';
      } else if (isOverdue) {
        status = 'overdue';
      }
      
      return {
        _id: exam._id,
        exam_title: exam.exam_title,
        description: exam.description,
        due_date: exam.due_date,
        points_possible: exam.points_possible,
        exam_type: exam.exam_type,
        course: {
          _id: exam.course_id._id,
          name: exam.course_id.course_name,
          code: exam.course_id.course_code
        },
        status: status,
        is_completed: isCompleted,
        is_graded: isGraded,
        is_overdue: isOverdue,
        grade: isGraded ? grade.grade : null,
        days_until_due: Math.ceil((new Date(exam.due_date) - new Date()) / (1000 * 60 * 60 * 24))
      };
    });
    
    // Filter based on status
    let filteredExams = processedExams;
    if (status === 'upcoming') {
      filteredExams = processedExams.filter(exam => exam.status === 'upcoming');
    } else if (status === 'overdue') {
      filteredExams = processedExams.filter(exam => exam.status === 'overdue');
    } else if (status === 'completed') {
      filteredExams = processedExams.filter(exam => exam.status === 'completed' || exam.status === 'graded');
    }
    
    // Get summary statistics
    const totalExams = processedExams.length;
    const completedExams = processedExams.filter(exam => exam.status === 'graded').length;
    const upcomingExams = processedExams.filter(exam => exam.status === 'upcoming').length;
    const overdueExams = processedExams.filter(exam => exam.status === 'overdue').length;
    
    const examsSummary = {
      total: totalExams,
      completed: completedExams,
      upcoming: upcomingExams,
      overdue: overdueExams,
      completion_rate: totalExams > 0 ? Math.round((completedExams / totalExams) * 100) : 0
    };
    
    res.json({
      exams: filteredExams,
      summary: examsSummary,
      courses: courses.map(course => ({
        _id: course._id,
        name: course.course_name,
        code: course.course_code
      }))
    });
  } catch (error) {
    console.error('Error fetching exams data:', error);
    res.status(500).json({ error: 'Failed to fetch exams data' });
  }
});

// GET /api/student-dashboard/study-timer - Get study timer data
router.get('/study-timer', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { days = 7 } = req.query;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Get study progress for the specified period
    const studyProgress = await StudyProgress.find({
      student_id: studentId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 });
    
    // Calculate statistics
    const totalHours = studyProgress.reduce((sum, progress) => sum + progress.hours_studied, 0);
    const averageHoursPerDay = studyProgress.length > 0 ? totalHours / studyProgress.length : 0;
    const goalAchievedDays = studyProgress.filter(progress => progress.goal_achieved).length;
    const totalStudyDays = studyProgress.length;
    
    // Get daily breakdown
    const dailyData = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayProgress = studyProgress.find(progress => 
        new Date(progress.date).toDateString() === currentDate.toDateString()
      );
      
      dailyData.push({
        date: new Date(currentDate),
        hours_studied: dayProgress ? dayProgress.hours_studied : 0,
        goal_achieved: dayProgress ? dayProgress.goal_achieved : false,
        tasks_completed: dayProgress ? dayProgress.tasks_completed : '',
        focus_rating: dayProgress ? dayProgress.focus_rating : null,
        difficulty_rating: dayProgress ? dayProgress.difficulty_rating : null
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Calculate today's specific data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const todayProgress = studyProgress.find(progress => {
      const progressDate = new Date(progress.date);
      return progressDate >= today && progressDate <= todayEnd;
    });
    
    const todayHours = todayProgress ? todayProgress.hours_studied : 0;
    const sessionsToday = studyProgress.filter(progress => {
      const progressDate = new Date(progress.date);
      return progressDate >= today && progressDate <= todayEnd;
    }).length;

    const studyTimerData = {
      today_hours: todayHours,
      sessions_today: sessionsToday,
      total_hours: totalHours,
      average_hours_per_day: Math.round(averageHoursPerDay * 10) / 10,
      goal_achieved_days: goalAchievedDays,
      total_study_days: totalStudyDays,
      study_consistency: totalStudyDays > 0 ? Math.round((totalStudyDays / parseInt(days)) * 100) : 0,
      daily_breakdown: dailyData,
      recent_sessions: studyProgress.slice(0, 5).map(progress => ({
        duration: Math.round(progress.hours_studied * 60), // Convert hours to minutes
        completed_at: progress.date,
        tasks_completed: progress.tasks_completed,
        goal_achieved: progress.goal_achieved,
        focus_rating: progress.focus_rating,
        difficulty_rating: progress.difficulty_rating
      }))
    };
    
    res.json(studyTimerData);
  } catch (error) {
    console.error('Error fetching study timer data:', error);
    res.status(500).json({ error: 'Failed to fetch study timer data' });
  }
});

// POST /api/student-dashboard/study-timer/session - Save study session
router.post('/study-timer/session', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { date, hours_studied, tasks_completed, goal_achieved, focus_rating, difficulty_rating, subjects_studied } = req.body;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Check if study progress already exists for this date
    const existingProgress = await StudyProgress.findOne({
      student_id: studentId,
      date: new Date(date)
    });
    
    let studyProgress;
    if (existingProgress) {
      // Update existing progress
      studyProgress = await StudyProgress.findByIdAndUpdate(
        existingProgress._id,
        {
          hours_studied: hours_studied,
          tasks_completed: tasks_completed,
          goal_achieved: goal_achieved,
          focus_rating: focus_rating,
          difficulty_rating: difficulty_rating,
          subjects_studied: subjects_studied
        },
        { new: true }
      );
    } else {
      // Create new study progress
      studyProgress = new StudyProgress({
        student_id: studentId,
        date: new Date(date),
        hours_studied: hours_studied,
        tasks_completed: tasks_completed,
        goal_achieved: goal_achieved,
        focus_rating: focus_rating,
        difficulty_rating: difficulty_rating,
        subjects_studied: subjects_studied
      });
      
      await studyProgress.save();
    }
    
    res.status(201).json({
      message: 'Study session saved successfully',
      study_progress: studyProgress
    });
  } catch (error) {
    console.error('Error saving study session:', error);
    res.status(500).json({ error: 'Failed to save study session' });
  }
});

// GET /api/student-dashboard/choose-partner - Get partner selection data
router.get('/choose-partner', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { course_id, homework_id } = req.query;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Get student's enrolled courses with partner settings
    const courses = await Course.find({ 
      students: studentId, 
      is_active: true 
    });
    
    // Import Partner model
    const Partner = require('../models/Partner');
    
    let potentialPartners = [];
    let selectedCourse = null;
    let selectedHomework = null;
    let currentPartners = [];
    
    if (course_id) {
      // Get potential partners for specific course
      selectedCourse = await Course.findById(course_id)
        .populate('students', 'name email full_name')
        .populate('lecturer_id', 'name email full_name');
      
      if (selectedCourse) {
        // Check if partner functionality is enabled for this course
        if (!selectedCourse.partner_settings?.enabled) {
          return res.status(403).json({ 
            error: 'Partner functionality is disabled for this course',
            partner_disabled: true 
          });
        }
        
        // Get current partners for this student in this course (exclude completed partnerships)
        const existingPartners = await Partner.find({
          $or: [
            { student1_id: studentId },
            { student2_id: studentId }
          ],
          partnership_status: { $in: ['pending', 'accepted', 'active', 'completed'] }
        })
        .populate('student1_id', 'name email full_name')
        .populate('student2_id', 'name email full_name')
        .populate('homework_id', 'title course_id')
        .populate({
          path: 'homework_id',
          populate: {
            path: 'course_id',
            select: 'course_name course_code'
          }
        });
        
        // Filter partners for the current course
        currentPartners = existingPartners.filter(partner => 
          partner.homework_id.course_id._id.toString() === course_id
        );
        
        // Get IDs of students who already have partnerships with current student
        const existingPartnerIds = new Set();
        currentPartners.forEach(partner => {
          if (partner.student1_id.equals(studentId)) {
            existingPartnerIds.add(partner.student2_id.toString());
          } else {
            existingPartnerIds.add(partner.student1_id.toString());
          }
        });
        
        // Check if student already has max partners for this course
        if (currentPartners.length >= selectedCourse.partner_settings.max_partners_per_student) {
          potentialPartners = []; // No more partners allowed
        } else {
          // Get students who don't already have max partners
          const studentsWithMaxPartners = new Set();
          
          for (const student of selectedCourse.students) {
            if (student._id.equals(studentId)) continue;
            
            const studentPartners = await Partner.find({
              $or: [
                { student1_id: student._id },
                { student2_id: student._id }
              ],
              partnership_status: { $in: ['pending', 'accepted', 'active', 'completed'] }
            }).populate('homework_id', 'course_id');
            
            const coursePartners = studentPartners.filter(partner => 
              partner.homework_id.course_id._id.toString() === course_id
            );
            
            if (coursePartners.length >= selectedCourse.partner_settings.max_partners_per_student) {
              studentsWithMaxPartners.add(student._id.toString());
            }
          }
          
          potentialPartners = selectedCourse.students.filter(student => 
            !student._id.equals(studentId) && 
            !studentsWithMaxPartners.has(student._id.toString()) &&
            !existingPartnerIds.has(student._id.toString())
          );
        }
      }
      
      if (homework_id) {
        // Get specific homework details
        selectedHomework = await Homework.findById(homework_id)
          .populate('course_id', 'course_name course_code');
      }
    } else {
      // Get all courses with potential partners (only those with partner functionality enabled)
      const coursesWithPartners = await Promise.all(
        courses.map(async (course) => {
          // Skip courses where partner functionality is disabled
          if (!course.partner_settings?.enabled) {
            return {
              _id: course._id,
              course_name: course.course_name,
              course_code: course.course_code,
              partner_enabled: false,
              potential_partners: []
            };
          }
          
          const populatedCourse = await Course.findById(course._id)
            .populate('students', 'name email full_name');
          
          // Get current partners for this student in this course (exclude completed partnerships)
          const existingPartners = await Partner.find({
            $or: [
              { student1_id: studentId },
              { student2_id: studentId }
            ],
            partnership_status: { $in: ['pending', 'accepted', 'active', 'completed'] }
          })
          .populate('student1_id', 'name email full_name')
          .populate('student2_id', 'name email full_name')
          .populate('homework_id', 'title course_id')
          .populate({
            path: 'homework_id',
            populate: {
              path: 'course_id',
              select: 'course_name course_code'
            }
          });
          
          const coursePartners = existingPartners.filter(partner => 
            partner.homework_id.course_id._id.toString() === course._id.toString()
          );
          
          // Get IDs of students who already have partnerships with current student
          const existingPartnerIds = new Set();
          coursePartners.forEach(partner => {
            if (partner.student1_id.equals(studentId)) {
              existingPartnerIds.add(partner.student2_id.toString());
            } else {
              existingPartnerIds.add(partner.student1_id.toString());
            }
          });
          
          let coursePotentialPartners = [];
          if (coursePartners.length < course.partner_settings.max_partners_per_student) {
            // Get students who don't already have max partners
            const studentsWithMaxPartners = new Set();
            
            for (const student of populatedCourse.students) {
              if (student._id.equals(studentId)) continue;
              
              const studentPartners = await Partner.find({
                $or: [
                  { student1_id: student._id },
                  { student2_id: student._id }
                ],
                partnership_status: { $in: ['pending', 'accepted', 'active', 'completed'] }
              }).populate('homework_id', 'course_id');
              
              const studentCoursePartners = studentPartners.filter(partner => 
                partner.homework_id.course_id._id.toString() === course._id.toString()
              );
              
              if (studentCoursePartners.length >= course.partner_settings.max_partners_per_student) {
                studentsWithMaxPartners.add(student._id.toString());
              }
            }
            
            coursePotentialPartners = populatedCourse.students.filter(student => 
              !student._id.equals(studentId) && 
              !studentsWithMaxPartners.has(student._id.toString()) &&
              !existingPartnerIds.has(student._id.toString())
            );
          }
          
          return {
            _id: course._id,
            course_name: course.course_name,
            course_code: course.course_code,
            partner_enabled: true,
            current_partners: coursePartners.length,
            max_partners: course.partner_settings.max_partners_per_student,
            potential_partners: coursePotentialPartners
          };
        })
      );
      
      potentialPartners = coursesWithPartners.flatMap(course => course.potential_partners);
    }
    
    // Get homework assignments for the selected course
    let homeworkAssignments = [];
    if (course_id) {
      homeworkAssignments = await Homework.find({
        course_id: course_id,
        is_active: true
      })
      .populate('course_id', 'course_name course_code')
      .sort({ due_date: 1 });
    }

    const partnerData = {
      user_id: studentId,
      courses: courses.map(course => ({
        _id: course._id,
        course_name: course.course_name,
        course_code: course.course_code,
        partner_enabled: course.partner_settings?.enabled || false,
        max_partners: course.partner_settings?.max_partners_per_student || 1
      })),
      potential_partners: potentialPartners,
      current_partners: currentPartners,
      homework_assignments: homeworkAssignments.map(hw => ({
        _id: hw._id,
        title: hw.title,
        due_date: hw.due_date,
        points_possible: hw.points_possible,
        course: {
          _id: hw.course_id._id,
          name: hw.course_id.course_name,
          code: hw.course_id.course_code
        }
      })),
      selected_course: selectedCourse ? {
        _id: selectedCourse._id,
        course_name: selectedCourse.course_name,
        course_code: selectedCourse.course_code,
        partner_enabled: selectedCourse.partner_settings?.enabled || false,
        max_partners: selectedCourse.partner_settings?.max_partners_per_student || 1,
        lecturer: selectedCourse.lecturer_id ? {
          name: selectedCourse.lecturer_id.name || selectedCourse.lecturer_id.full_name,
          email: selectedCourse.lecturer_id.email
        } : null
      } : null,
      selected_homework: selectedHomework ? {
        _id: selectedHomework._id,
        title: selectedHomework.title,
        due_date: selectedHomework.due_date,
        course: {
          _id: selectedHomework.course_id._id,
          name: selectedHomework.course_id.course_name,
          code: selectedHomework.course_id.course_code
        }
      } : null
    };
    
    res.json(partnerData);
  } catch (error) {
    console.error('Error fetching partner selection data:', error);
    res.status(500).json({ error: 'Failed to fetch partner selection data' });
  }
});

// GET /api/student-dashboard/partner-requests - Get partnership requests for student
router.get('/partner-requests', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Import Partner model
    const Partner = require('../models/Partner');
    
    // Get partnership requests where this student is the target (student2_id) and status is pending
    const pendingRequests = await Partner.find({
      student2_id: studentId,
      partnership_status: 'pending'
    })
    .populate('student1_id', 'name email full_name')
    .populate('homework_id', 'title due_date')
    .populate({
      path: 'homework_id',
      populate: {
        path: 'course_id',
        select: 'course_name course_code'
      }
    });
    
    // Get partnerships where this student initiated (student1_id) and status is pending
    const sentRequests = await Partner.find({
      student1_id: studentId,
      partnership_status: 'pending'
    })
    .populate('student2_id', 'name email full_name')
    .populate('homework_id', 'title due_date')
    .populate({
      path: 'homework_id',
      populate: {
        path: 'course_id',
        select: 'course_name course_code'
      }
    });
    
    // Get active partnerships
    const activePartnerships = await Partner.find({
      $or: [
        { student1_id: studentId },
        { student2_id: studentId }
      ],
      partnership_status: { $in: ['accepted', 'active'] }
    })
    .populate('student1_id', 'name email full_name')
    .populate('student2_id', 'name email full_name')
    .populate('homework_id', 'title due_date')
    .populate({
      path: 'homework_id',
      populate: {
        path: 'course_id',
        select: 'course_name course_code'
      }
    });
    
    // Get completed partnerships
    const completedPartnerships = await Partner.find({
      $or: [
        { student1_id: studentId },
        { student2_id: studentId }
      ],
      partnership_status: 'completed'
    })
    .populate('student1_id', 'name email full_name')
    .populate('student2_id', 'name email full_name')
    .populate('homework_id', 'title due_date')
    .populate({
      path: 'homework_id',
      populate: {
        path: 'course_id',
        select: 'course_name course_code'
      }
    });
    
    const partnerRequests = {
      pending_requests: pendingRequests.map(req => ({
        _id: req._id,
        partner: {
          _id: req.student1_id._id,
          name: req.student1_id.name || req.student1_id.full_name,
          email: req.student1_id.email
        },
        homework: {
          _id: req.homework_id._id,
          title: req.homework_id.title,
          due_date: req.homework_id.due_date,
          course: {
            _id: req.homework_id.course_id._id,
            name: req.homework_id.course_id.course_name,
            code: req.homework_id.course_id.course_code
          }
        },
        initiated_at: req.createdAt,
        notes: req.notes
      })),
      sent_requests: sentRequests.map(req => ({
        _id: req._id,
        partner: {
          _id: req.student2_id._id,
          name: req.student2_id.name || req.student2_id.full_name,
          email: req.student2_id.email
        },
        homework: {
          _id: req.homework_id._id,
          title: req.homework_id.title,
          due_date: req.homework_id.due_date,
          course: {
            _id: req.homework_id.course_id._id,
            name: req.homework_id.course_id.course_name,
            code: req.homework_id.course_id.course_code
          }
        },
        initiated_at: req.createdAt,
        notes: req.notes
      })),
      active_partnerships: activePartnerships.map(req => ({
        _id: req._id,
        partner: {
          _id: req.student1_id._id.equals(studentId) ? req.student2_id._id : req.student1_id._id,
          name: req.student1_id._id.equals(studentId) 
            ? (req.student2_id.name || req.student2_id.full_name)
            : (req.student1_id.name || req.student1_id.full_name),
          email: req.student1_id._id.equals(studentId) 
            ? req.student2_id.email 
            : req.student1_id.email
        },
        homework: {
          _id: req.homework_id._id,
          title: req.homework_id.title,
          due_date: req.homework_id.due_date,
          course: {
            _id: req.homework_id.course_id._id,
            name: req.homework_id.course_id.course_name,
            code: req.homework_id.course_id.course_code
          }
        },
        status: req.partnership_status,
        accepted_at: req.accepted_at
      })),
      completed_partnerships: completedPartnerships.map(req => ({
        _id: req._id,
        partner: {
          _id: req.student1_id._id.equals(studentId) ? req.student2_id._id : req.student1_id._id,
          name: req.student1_id._id.equals(studentId) 
            ? (req.student2_id.name || req.student2_id.full_name)
            : (req.student1_id.name || req.student1_id.full_name),
          email: req.student1_id._id.equals(studentId) 
            ? req.student2_id.email 
            : req.student1_id.email
        },
        homework: {
          _id: req.homework_id._id,
          title: req.homework_id.title,
          due_date: req.homework_id.due_date,
          course: {
            _id: req.homework_id.course_id._id,
            name: req.homework_id.course_id.course_name,
            code: req.homework_id.course_id.course_code
          }
        },
        status: req.partnership_status,
        accepted_at: req.accepted_at,
        completed_at: req.completed_at
      }))
    };
    
    res.json(partnerRequests);
  } catch (error) {
    console.error('Error fetching partner requests:', error);
    res.status(500).json({ error: 'Failed to fetch partner requests' });
  }
});

// POST /api/student-dashboard/partner-requests/:requestId/respond - Accept or decline partnership request
router.post('/partner-requests/:requestId/respond', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const requestId = req.params.requestId;
    const { action } = req.body; // 'accept' or 'decline'
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Import Partner model
    const Partner = require('../models/Partner');
    console.log('Partner model imported successfully for respond endpoint');
    
    // Find the partnership request
    console.log('Looking for partnership with ID:', requestId);
    const partnership = await Partner.findById(requestId);
    console.log('Found partnership:', partnership ? 'Yes' : 'No');
    if (!partnership) {
      return res.status(404).json({ error: 'Partnership request not found' });
    }
    
    // Check if this student is involved in the partnership
    console.log('Checking student permissions:', {
      studentId: studentId.toString(),
      student2_id: partnership.student2_id.toString(),
      student1_id: partnership.student1_id.toString(),
      isTarget: partnership.student2_id.equals(studentId),
      isInitiator: partnership.student1_id.equals(studentId),
      action: action
    });
    
    // For accept actions, only the target student can respond
    if (action === 'accept' && !partnership.student2_id.equals(studentId)) {
      return res.status(403).json({ error: 'You can only accept requests sent to you' });
    }
    
    // For decline actions, either student in the partnership can decline
    if (action === 'decline' && !partnership.student1_id.equals(studentId) && !partnership.student2_id.equals(studentId)) {
      return res.status(403).json({ error: 'You can only decline partnerships you are part of' });
    }
    
    // For completed action, either student in the partnership can mark it complete
    if (action === 'completed' && !partnership.student1_id.equals(studentId) && !partnership.student2_id.equals(studentId)) {
      return res.status(403).json({ error: 'You can only update partnerships you are part of' });
    }
    
    // Check if request is still pending (for accept actions only)
    if (action === 'accept' && partnership.partnership_status !== 'pending') {
      return res.status(400).json({ error: 'This request has already been responded to' });
    }
    
    // For decline actions, allow declining partnerships in any status (for changing partners)
    if (action === 'decline' && partnership.partnership_status === 'declined') {
      return res.status(400).json({ error: 'This partnership has already been declined' });
    }
    
    // Check if partnership is active (for completed action)
    if (action === 'completed' && partnership.partnership_status !== 'accepted') {
      return res.status(400).json({ error: 'Can only mark active partnerships as completed' });
    }
    
    // Update partnership status
    if (action === 'accept') {
      partnership.partnership_status = 'accepted';
      partnership.accepted_at = new Date();
    } else if (action === 'decline') {
      partnership.partnership_status = 'declined';
    } else if (action === 'completed') {
      partnership.partnership_status = 'completed';
      partnership.completed_at = new Date();
    } else {
      return res.status(400).json({ error: 'Invalid action. Use "accept", "decline", or "completed"' });
    }
    
    await partnership.save();
    
    res.json({
      message: `Partnership ${action}ed successfully`,
      partnership: {
        _id: partnership._id,
        status: partnership.partnership_status,
        accepted_at: partnership.accepted_at,
        completed_at: partnership.completed_at
      }
    });
  } catch (error) {
    console.error('Error responding to partnership request:', error);
    res.status(500).json({ error: 'Failed to respond to partnership request' });
  }
});

// Helper function to get letter grade
function getLetterGrade(numericGrade) {
  if (numericGrade >= 97) return 'A+';
  if (numericGrade >= 93) return 'A';
  if (numericGrade >= 90) return 'A-';
  if (numericGrade >= 87) return 'B+';
  if (numericGrade >= 83) return 'B';
  if (numericGrade >= 80) return 'B-';
  if (numericGrade >= 77) return 'C+';
  if (numericGrade >= 73) return 'C';
  if (numericGrade >= 70) return 'C-';
  if (numericGrade >= 67) return 'D+';
  if (numericGrade >= 63) return 'D';
  if (numericGrade >= 60) return 'D-';
  return 'F';
}

module.exports = router;
