# Cascade Delete Implementation

## Overview
MongoDB doesn't have built-in foreign key constraints or automatic cascade deletes like SQL databases. Therefore, we've implemented manual cascade delete logic in the application to ensure data integrity when lecturers or courses are deleted.

## Cascade Delete Triggers

### 1. Lecturer Deletion
When a lecturer is deleted (either by themselves or by user management), the system automatically deletes:

**Endpoints:**
- `DELETE /api/users/:id` - Admin/User Management deletion
- `DELETE /api/users/me` - Self-deletion

**Cascade deletion includes:**
1. **All Courses** taught by the lecturer
2. **Traditional Homework** (Homework model) for those courses
3. **Student Homework** (StudentHomework model) for those courses
4. **Partnerships** (Partner model) for all homework in those courses
5. **Exams** for those courses
6. **Classes** for those courses
7. **Grades** for all homework and exams in those courses
8. **The lecturer's user record** in the database
9. **The lecturer's Auth0 account**
10. **Associated role requests**

**Implementation:** `server/routes/users.js` lines 411-462 and 497-548

### 2. Course Deletion
When a course is deleted by a lecturer (in course management), the system automatically deletes:

**Endpoint:**
- `DELETE /api/courses/:id`

**Cascade deletion includes:**
1. **Traditional Homework** (Homework model) for the course
2. **Student Homework** (StudentHomework model) for the course
3. **Partnerships** (Partner model) for all homework in the course
4. **Exams** for the course
5. **Classes** for the course
6. **Grades** for all homework and exams in the course
7. **The course itself**

**Implementation:** `server/routes/courses.js` lines 436-491

## Why Manual Implementation?

MongoDB uses references (ObjectIds) instead of foreign key constraints:
```javascript
// Example reference (not a foreign key constraint)
course_id: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Course',
  required: true
}
```

These references:
- ✅ Allow populating related documents
- ✅ Provide type safety with ObjectIds
- ❌ **Do NOT enforce referential integrity**
- ❌ **Do NOT cascade deletes automatically**

Therefore, we must manually delete related documents to prevent orphaned records.

## Deletion Flow

### Lecturer Deletion Flow
```
1. Find lecturer's courses
2. Get all homework IDs (traditional + student) for those courses
3. Get all exam IDs for those courses
4. Delete in parallel:
   - Traditional homework
   - Student homework
   - Partnerships (using homework IDs)
   - Exams
   - Classes
   - Grades (using homework + exam IDs)
5. Delete all courses
6. Delete Auth0 user
7. Delete role requests
8. Delete user record
```

### Course Deletion Flow
```
1. Verify permissions (lecturer owns course or user is admin)
2. Get all homework IDs (traditional + student) for the course
3. Get all exam IDs for the course
4. Delete in parallel:
   - Traditional homework
   - Student homework
   - Partnerships (using homework IDs)
   - Exams
   - Classes
   - Grades (using homework + exam IDs)
5. Delete the course
```

## Data Relationships

```
Lecturer
  └── Course
       ├── Homework (traditional)
       │    ├── Partner
       │    └── Grade
       ├── StudentHomework
       │    ├── Partner
       │    └── Grade
       ├── Exam
       │    └── Grade
       └── Class
```

## Important Notes

### Soft Delete vs Hard Delete
- **Old behavior:** Course deletion did a soft delete (set `is_active: false`)
- **New behavior:** Course deletion now performs a hard delete with cascading
- **Reason:** Complete data removal when lecturer or course is deleted

### Performance Considerations
- Uses `Promise.all()` for parallel deletion operations
- Batch deletes using `deleteMany()` with array of IDs
- Minimal database round-trips for efficiency

### Logging
Console logs track deletion progress:
```javascript
console.log(`Deleting ${lecturerCourses.length} courses for lecturer: ${user.email}`);
console.log(`Found ${traditionalHomework.length} traditional homework...`);
console.log(`Deleted partnerships and grades for ${allHomeworkIds.length} homework assignments`);
console.log(`Successfully deleted all courses and related data...`);
```

### API Response
Course deletion now returns detailed information:
```json
{
  "message": "Course and all related data deleted successfully",
  "deleted": {
    "course": "Advanced Mathematics",
    "homework": 15,
    "exams": 3
  }
}
```

## Security

### Permission Checks
- **Lecturer deletion:** Requires admin or user management permissions
- **Course deletion:** Lecturer can only delete their own courses; admin can delete any

### Validation
- Verifies course exists before deletion
- Checks lecturer ownership before allowing deletion
- Validates user exists in database

## Testing Recommendations

When testing cascade deletes:
1. Create a test lecturer with courses
2. Add homework (both types), partnerships, exams, and grades
3. Delete the lecturer or course
4. Verify all related records are deleted:
   ```javascript
   // Should return 0 results
   await Course.find({ lecturer_id: deletedLecturerId })
   await Homework.find({ course_id: deletedCourseId })
   await Partner.find({ homework_id: { $in: deletedHomeworkIds } })
   ```

## Migration from Old System

If you have existing soft-deleted courses:
1. Identify courses with `is_active: false`
2. Optionally run cleanup to remove orphaned data
3. Consider a migration script to hard-delete old soft-deleted courses

## Future Enhancements

Potential improvements:
- Add a "restore" feature for accidental deletions (requires keeping soft deletes)
- Implement a "deleted items" archive
- Add batch course deletion for admins
- Transaction support for atomic multi-collection deletes (if using MongoDB 4.0+)

