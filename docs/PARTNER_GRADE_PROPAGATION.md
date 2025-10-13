# Partner Grade Propagation

## Overview
This feature automatically propagates grades to partners when one student grades themselves in a homework assignment. Both traditional homework (created by lecturers) and student homework (created by students) support partner grade sharing.

## How It Works

### When a Student Grades Themselves
When a student completes homework and enters a grade (`claimed_grade`), the system:

1. **Checks for Active Partnerships**: Looks for any active or accepted partnership for that homework assignment
2. **Identifies the Partner**: Determines who the partner is in the partnership
3. **Propagates the Grade**: Automatically assigns the same grade to the partner's homework record
4. **Creates or Updates Records**: 
   - If the partner already has a homework record, it updates their grade
   - If not, it creates a new homework record with the shared grade

### Supported Homework Types

#### Traditional Homework (Lecturer-Created)
- When a student completes traditional homework with a partner
- The grade is propagated to create/update the partner's StudentHomework record
- Both students get the same `claimed_grade` and completion status

#### Student Homework (Student-Created)
- When a student completes student-created homework with a partner
- The grade is propagated to create/update the partner's StudentHomework record
- Both students get the same `claimed_grade` and completion status

## Implementation Details

### Modified Files

#### `server/routes/studentHomework.js`
Added partner grade propagation logic in the completion route (`PUT /api/student-homework/:id/complete`):

```javascript
// Check for active partnership
const partnership = await Partner.findOne({
  homework_id: homeworkId,
  $or: [
    { student1_id: user._id },
    { student2_id: user._id }
  ],
  partnership_status: { $in: ['accepted', 'active'] }
});

// If partnership exists and grade is provided
if (partnership && claimed_grade !== null && claimed_grade !== undefined) {
  // Get partner ID
  const partnerId = partnership.student1_id.equals(user._id) 
    ? partnership.student2_id 
    : partnership.student1_id;
  
  // Find or create partner's homework record
  // Update with same grade, completion status, and timestamp
}
```

### API Response Enhancement

When a grade is successfully propagated to a partner, the API response includes:

```json
{
  "message": "Homework marked as completed and grade shared with partner(s)",
  "homework": {
    "_id": "...",
    "title": "...",
    "completion_status": "completed",
    "completed_at": "2025-10-13T...",
    "claimed_grade": 95,
    "grade_verification_status": "unverified"
  },
  "partners_updated": [
    {
      "student_id": "partner_id_here",
      "grade": 95
    }
  ]
}
```

## Grade Verification

- Shared grades start with `grade_verification_status: 'unverified'`
- Lecturers can still verify or modify grades individually for each student
- The system logs grade propagation for debugging: `"Grade {grade} propagated to partner {partnerId} for homework {homeworkId}"`

## Partnership Requirements

For grade propagation to occur:
- Partnership must exist in the `Partner` collection
- Partnership status must be `'accepted'` or `'active'`
- The grading student must be part of the partnership
- A grade value must be provided (not null or undefined)

## Benefits

1. **Consistency**: Ensures partners receive the same grade automatically
2. **Efficiency**: Reduces duplicate data entry
3. **Fairness**: Partners working together get the same evaluation
4. **Transparency**: Clear logging of grade propagation for tracking

## Notes

- Lecturers don't grade homework in this system; only students self-report grades
- Lecturers verify student-reported grades after submission
- The propagation happens only when the initial student grades themselves
- If a partner already has a different grade, it will be overwritten with the shared grade

