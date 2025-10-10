const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5001/api';
const TEST_STUDENT_AUTH0_ID = 'auth0|test-student1';

// Mock JWT token for testing (in real app, this would be a valid Auth0 token)
const mockJWT = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2V5In0.eyJpc3MiOiJodHRwczovL3Rlc3QuYXV0aDAuY29tLyIsInN1YiI6ImF1dGgwfHRlc3Qtc3R1ZGVudDEiLCJhdWQiOlsiaHR0cDovL2xvY2FsaG9zdDo1MDAxL2FwaSIsImh0dHBzOi8vdGVzdC5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNjM1NzI5NjAwLCJleHAiOjE2MzU4MTYwMCwiYXpwIjoidGVzdC1jbGllbnQiLCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwicm9sZXMiOlsic3R1ZGVudCJdfQ.test';

// Test all student dashboard APIs
async function testStudentDashboardAPIs() {
  console.log('🧪 Testing Student Dashboard APIs...\n');

  const headers = {
    'Authorization': `Bearer ${mockJWT}`,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Test Dashboard Overview
    console.log('📊 1. Testing Dashboard Overview...');
    const overviewResponse = await axios.get(`${BASE_URL}/student-dashboard/overview`, { headers });
    console.log('✅ Dashboard Overview:', {
      courses: overviewResponse.data.courses.total,
      homework: overviewResponse.data.homework.total,
      study_hours: overviewResponse.data.study_progress.weekly_hours
    });

    // 2. Test Homework Planner
    console.log('\n📚 2. Testing Homework Planner...');
    const homeworkResponse = await axios.get(`${BASE_URL}/student-dashboard/homework-planner`, { headers });
    console.log('✅ Homework Planner:', {
      total: homeworkResponse.data.summary.total,
      pending: homeworkResponse.data.summary.pending,
      completed: homeworkResponse.data.summary.completed
    });

    // 3. Test Classes Planner
    console.log('\n🏫 3. Testing Classes Planner...');
    const classesResponse = await axios.get(`${BASE_URL}/student-dashboard/classes-planner`, { headers });
    console.log('✅ Classes Planner:', {
      total_classes: classesResponse.data.statistics.total_classes,
      total_hours: classesResponse.data.statistics.total_hours,
      week_start: classesResponse.data.week_start
    });

    // 4. Test Exams
    console.log('\n📝 4. Testing Exams...');
    const examsResponse = await axios.get(`${BASE_URL}/student-dashboard/exams`, { headers });
    console.log('✅ Exams:', {
      total: examsResponse.data.summary.total,
      upcoming: examsResponse.data.summary.upcoming,
      completed: examsResponse.data.summary.completed
    });

    // 5. Test Study Timer
    console.log('\n⏱️ 5. Testing Study Timer...');
    const studyTimerResponse = await axios.get(`${BASE_URL}/student-dashboard/study-timer?days=7`, { headers });
    console.log('✅ Study Timer:', {
      total_hours: studyTimerResponse.data.overview.total_hours,
      average_hours: studyTimerResponse.data.overview.average_hours_per_day,
      study_days: studyTimerResponse.data.overview.total_study_days
    });

    // 6. Test Study Progress
    console.log('\n📈 6. Testing Study Progress...');
    const studyProgressResponse = await axios.get(`${BASE_URL}/student-dashboard/study-progress?days=30`, { headers });
    console.log('✅ Study Progress:', {
      total_hours: studyProgressResponse.data.overview.total_hours,
      goal_achieved_days: studyProgressResponse.data.overview.goal_achieved_days,
      weekly_breakdown: studyProgressResponse.data.weekly_breakdown.length
    });

    // 7. Test Grades
    console.log('\n📊 7. Testing Grades...');
    const gradesResponse = await axios.get(`${BASE_URL}/student-dashboard/grades`, { headers });
    console.log('✅ Grades:', {
      total_grades: gradesResponse.data.statistics.total_grades,
      average_grade: gradesResponse.data.statistics.average_grade,
      letter_grade: gradesResponse.data.statistics.letter_grade
    });

    // 8. Test Choose Partner
    console.log('\n👥 8. Testing Choose Partner...');
    const partnerResponse = await axios.get(`${BASE_URL}/student-dashboard/choose-partner`, { headers });
    console.log('✅ Choose Partner:', {
      courses: partnerResponse.data.courses.length,
      potential_partners: partnerResponse.data.potential_partners.length
    });

    // 9. Test Courses Info
    console.log('\n📖 9. Testing Courses Info...');
    const coursesResponse = await axios.get(`${BASE_URL}/student-dashboard/courses-info`, { headers });
    console.log('✅ Courses Info:', {
      total_courses: coursesResponse.data.length,
      course_names: coursesResponse.data.map(c => c.course_name)
    });

    // 10. Test Study Session Save
    console.log('\n💾 10. Testing Study Session Save...');
    const studySessionData = {
      date: new Date().toISOString(),
      hours_studied: 2.5,
      tasks_completed: 'Test study session',
      goal_achieved: true,
      focus_rating: 8,
      difficulty_rating: 6,
      subjects_studied: [
        { subject: 'Computer Science', hours: 2.0 },
        { subject: 'Mathematics', hours: 0.5 }
      ]
    };
    
    const sessionResponse = await axios.post(`${BASE_URL}/student-dashboard/study-timer/session`, studySessionData, { headers });
    console.log('✅ Study Session Save:', {
      message: sessionResponse.data.message,
      hours_studied: sessionResponse.data.study_progress.hours_studied
    });

    console.log('\n🎉 All Student Dashboard APIs are working correctly!');
    console.log('\n📋 Summary of Tested Endpoints:');
    console.log('1. ✅ GET /student-dashboard/overview');
    console.log('2. ✅ GET /student-dashboard/homework-planner');
    console.log('3. ✅ GET /student-dashboard/classes-planner');
    console.log('4. ✅ GET /student-dashboard/exams');
    console.log('5. ✅ GET /student-dashboard/study-timer');
    console.log('6. ✅ GET /student-dashboard/study-progress');
    console.log('7. ✅ GET /student-dashboard/grades');
    console.log('8. ✅ GET /student-dashboard/choose-partner');
    console.log('9. ✅ GET /student-dashboard/courses-info');
    console.log('10. ✅ POST /student-dashboard/study-timer/session');

  } catch (error) {
    console.error('❌ API Test Error:', error.response ? {
      status: error.response.status,
      data: error.response.data
    } : error.message);
  }
}

// Run the tests
testStudentDashboardAPIs();
