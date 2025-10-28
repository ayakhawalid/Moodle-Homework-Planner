# Backend Performance Optimization Guide

## Problem
Dashboard pages are slow to load because the backend endpoints execute many sequential database queries.

## Current Issues

### Student Dashboard (`/api/student-dashboard/overview`)
1. User lookup
2. Course lookup with multiple `.populate()` calls
3. Traditional homework query
4. Student homework query
5. Grade queries for all homework
6. Study progress queries
7. Multiple data transformations

### Lecturer Dashboard (`/api/lecturer-dashboard/overview`)
1. User lookup
2. Course lookup with populate
3. Traditional homework query
4. Student homework query
5. Recent activity queries (2 separate queries)
6. Multiple calculations and filters

## Optimization Strategies

### 1. Parallelize Database Queries

**Current (Sequential):**
```javascript
const user = await User.findOne(...);
const courses = await Course.find(...);
const homework = await Homework.find(...);
const studentHomework = await StudentHomework.find(...);
```

**Optimized (Parallel):**
```javascript
const [user, courses, homework, studentHomework] = await Promise.all([
  User.findOne(...),
  Course.find(...),
  Homework.find(...),
  StudentHomework.find(...)
]);
```

### 2. Use Database Indexes

Add indexes to frequently queried fields:

```javascript
// In Course model
courseSchema.index({ students: 1, is_active: 1 });
courseSchema.index({ lecturer_id: 1, is_active: 1 });

// In Homework model
homeworkSchema.index({ course_id: 1, is_active: 1 });
homeworkSchema.index({ due_date: 1 });

// In StudentHomework model
studentHomeworkSchema.index({ course_id: 1 });
studentHomeworkSchema.index({ uploaded_by: 1 });
studentHomeworkSchema.index({ course_id: 1, uploaded_by: 1 });
```

### 3. Limit `.populate()` Calls

**Current:**
```javascript
.populate('homework')
.populate('classes')
.populate('exams')
```

**Optimized:**
Only populate what you actually need, and use `.select()` to limit fields:
```javascript
.populate('homework', 'title due_date') // Only get needed fields
.populate('classes', 'date time')
.populate('exams', 'date time')
```

### 4. Use `.lean()` for Read-Only Queries

```javascript
// Current
const homework = await Homework.find(...);

// Optimized (faster, no Mongoose overhead)
const homework = await Homework.find(...).lean();
```

### 5. Reduce Data Processing

Instead of fetching all data and filtering in JavaScript, filter in the database:
```javascript
// Current: Fetch all, filter in JS
const allHomework = [...traditionalHomework, ...studentHomework];
const upcoming = allHomework.filter(hw => ...);

// Optimized: Filter in database
const upcomingHomework = await Homework.find({
  course_id: { $in: courseIds },
  due_date: { $gte: now, $lte: nextWeek },
  is_active: true
}).lean();
```

### 6. Cache Frequently Accessed Data

Consider caching dashboard data for 30-60 seconds:
```javascript
const cacheKey = `dashboard:${user._id}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const data = await fetchDashboardData();
await redis.setex(cacheKey, 60, JSON.stringify(data));
return data;
```

### 7. Paginate Large Results

If there are many courses/homework, paginate:
```javascript
const courses = await Course.find(...).limit(20).lean();
```

## Quick Wins (Easy to Implement)

### 1. Parallelize Queries (High Impact, Easy)

In `server/routes/studentDashboard.js`:
```javascript
// Replace sequential queries with parallel
const [courses, traditionalHomework, studentHomework] = await Promise.all([
  Course.find({ students: studentId, is_active: true })
    .populate('lecturer_id', 'name email full_name')
    .lean(),
  Homework.find({ course_id: { $in: courseIds }, is_active: true })
    .populate('course_id', 'course_name course_code')
    .lean(),
  StudentHomework.find({ course_id: { $in: courseIds }, ... })
    .populate('course_id', 'course_name course_code')
    .lean()
]);
```

### 2. Add `.lean()` to All Read Queries

This removes Mongoose document overhead and is faster:
```javascript
const courses = await Course.find(...).lean();
const homework = await Homework.find(...).lean();
```

### 3. Limit Populated Fields

```javascript
.populate('students', 'name email') // Only get name and email
```

### 4. Add Basic Indexes

In models, add:
```javascript
// Course.js
courseSchema.index({ students: 1 });
courseSchema.index({ lecturer_id: 1 });

// Homework.js  
homeworkSchema.index({ course_id: 1 });
```

## Expected Performance Gains

- **Parallel queries**: 2-4x faster
- **Adding indexes**: 10-100x faster queries
- **Using .lean()**: 20-30% faster
- **Combined**: 5-10x overall improvement

## Testing Performance

Add timing logs to backend routes:
```javascript
const startTime = Date.now();
// ... queries ...
const endTime = Date.now();
console.log(`Dashboard query took ${endTime - startTime}ms`);
```

## Implementation Priority

1. **High Priority:**
   - Add database indexes
   - Parallelize queries
   - Add `.lean()` to read queries

2. **Medium Priority:**
   - Limit populate fields
   - Filter in database instead of JS

3. **Low Priority (if still needed):**
   - Add caching layer
   - Paginate results

## Example Optimized Code

See `OPTIMIZED_DASHBOARD_EXAMPLE.md` for full optimized implementation examples.

