# Partner Filtering and Validation

## Overview

Implemented filtering and validation to ensure the partnership system respects `allow_partners` and `max_partners` settings for both traditional and student-created homework.

---

## Changes Implemented

### 1. Filter Homework in Choose Partner Dropdown ✅

**Where:** `server/routes/studentDashboard.js` - `/choose-partner` endpoint

**What:** Only show homework that allows partnerships

**Before:**
- All homework showed in dropdown
- Students could try to partner on homework that doesn't allow it
- Got error after selecting partner

**After:**
- Only homework with `allow_partners: true` appears in dropdown
- Students can't even select homework that doesn't allow partnerships
- Cleaner UX, no confusion

**Code Changes:**

```javascript
// Traditional homework - only those that allow partners
const traditionalHomework = await Homework.find({
  course_id: courseObjectId,
  is_active: true,
  allow_partners: true  // ← Added filter
})

// Student-created homework - only those that allow partners
const studentHomework = await StudentHomework.find({
  'course_id': courseObjectId,
  'completion_status': { $ne: 'completed' },
  'allow_partners': true  // ← Added filter
})
```

### 2. Include Partner Settings in Response ✅

**What:** Added `allow_partners` and `max_partners` to homework objects returned to frontend

**Code:**
```javascript
homeworkAssignments = [
  ...activeTraditionalHomework.map(hw => ({
    _id: hw._id,
    title: hw.title,
    due_date: hw.due_date,
    allow_partners: hw.allow_partners,  // ← Added
    max_partners: hw.max_partners,      // ← Added
    ...
  })),
  ...studentHomework.map(hw => ({
    ...
    allow_partners: hw.allow_partners,  // ← Added
    max_partners: hw.max_partners,      // ← Added
    ...
  }))
]
```

### 3. Validate Partnerships Are Allowed ✅

**Where:** `server/routes/studentSubmission.js` - POST `/homework/:homeworkId/partner`

**What:** Check if homework allows partnerships before creating one

**Validation:**
```javascript
const allowPartners = homework.allow_partners !== undefined ? homework.allow_partners : false;

if (!allowPartners) {
  return res.status(400).json({ 
    error: 'Partnerships are not allowed for this homework assignment',
    details: 'This homework must be completed individually'
  });
}
```

**Error Message:**
> "Partnerships are not allowed for this homework assignment. This homework must be completed individually."

### 4. Validate Max Partners Limit for Current Student ✅

**What:** Check if student has already reached max partners for this homework

**Validation:**
```javascript
const studentExistingPartnerships = await Partner.find({
  homework_id: homeworkId,
  partnership_status: { $in: ['pending', 'accepted', 'active'] },
  $or: [
    { student1_id: studentId },
    { student2_id: studentId }
  ]
});

if (studentExistingPartnerships.length >= maxPartners) {
  return res.status(400).json({ 
    error: `You have reached the maximum number of partners (${maxPartners}) for this homework`,
    current_partners: studentExistingPartnerships.length,
    max_allowed: maxPartners
  });
}
```

**Example Error:**
> "You have reached the maximum number of partners (2) for this homework"

### 5. Validate Max Partners Limit for Target Partner ✅

**What:** Check if the partner you're trying to add has already reached their max

**Validation:**
```javascript
const partnerExistingPartnerships = await Partner.find({
  homework_id: homeworkId,
  partnership_status: { $in: ['pending', 'accepted', 'active'] },
  $or: [
    { student1_id: partner_id },
    { student2_id: partner_id }
  ]
});

if (partnerExistingPartnerships.length >= maxPartners) {
  return res.status(400).json({ 
    error: `The selected student has reached the maximum number of partners (${maxPartners}) for this homework`,
    details: 'Please choose a different partner'
  });
}
```

**Example Error:**
> "The selected student has reached the maximum number of partners (2) for this homework. Please choose a different partner."

### 6. Simplified Duplicate Check ✅

**Before:** Checked if EITHER student had ANY partnership

**After:** Only checks if these TWO SPECIFIC students already have a partnership together

**Code:**
```javascript
const existingPartnershipTogether = await Partner.findOne({
  homework_id: homeworkId,
  partnership_status: { $in: ['pending', 'accepted', 'active'] },
  $or: [
    { student1_id: studentId, student2_id: partner_id },
    { student1_id: partner_id, student2_id: studentId }
  ]
});
```

This allows students to have MULTIPLE partners (up to max_partners limit) as long as they're different people!

---

## Validation Flow

When a student tries to send a partner request:

```
1. ✅ Check homework exists (both Homework and StudentHomework collections)
2. ✅ Check student enrolled in course
3. ✅ Check partner enrolled in course
4. ✅ Check homework allows partnerships (allow_partners: true)
5. ✅ Check student hasn't reached max_partners limit
6. ✅ Check partner hasn't reached max_partners limit
7. ✅ Check these two students don't already have a partnership together
8. ✅ Create partnership
```

---

## Example Scenarios

### Scenario 1: Homework Doesn't Allow Partners

**Setup:**
```javascript
{
  title: "Individual Assignment",
  allow_partners: false
}
```

**Result:**
- ❌ Homework doesn't appear in Choose Partner dropdown
- ✅ Students can't send partnership requests

### Scenario 2: Homework Allows 1 Partner

**Setup:**
```javascript
{
  title: "Pair Programming",
  allow_partners: true,
  max_partners: 1
}
```

**Flow:**
1. Student A sends request to Student B → ✅ Allowed
2. Student A tries to send request to Student C → ❌ "You have reached the maximum number of partners (1)"

### Scenario 3: Homework Allows 3 Partners

**Setup:**
```javascript
{
  title: "Team Project",
  allow_partners: true,
  max_partners: 3
}
```

**Flow:**
1. Student A → Student B → ✅ Partner 1/3
2. Student A → Student C → ✅ Partner 2/3
3. Student A → Student D → ✅ Partner 3/3
4. Student A → Student E → ❌ "You have reached the maximum number of partners (3)"

### Scenario 4: Partner Already at Limit

**Setup:**
- Homework allows 2 partners
- Student B already has 2 partners (Student C and Student D)

**Flow:**
1. Student A tries to partner with Student B → ❌ "The selected student has reached the maximum number of partners (2)"

---

## Error Messages

| Error | Trigger | Message |
|-------|---------|---------|
| No partners allowed | `allow_partners: false` | "Partnerships are not allowed for this homework assignment" |
| Student at limit | Current student has max partners | "You have reached the maximum number of partners (N)" |
| Partner at limit | Target partner has max partners | "The selected student has reached the maximum number of partners (N)" |
| Duplicate request | Already partnered with this specific student | "You already have a [status] partnership with this student" |

---

## Frontend Impact

### Choose Partner Page

**Homework Dropdown:**
- Before: Shows all homework
- After: Shows only homework with `allow_partners: true`

**No Available Homework:**
- If course has no homework with partnerships enabled
- Shows: "No available homework assignments found for this course"

**Available Partners List:**
- Automatically hides partners who have reached max_partners limit
- Shows only eligible partners

---

## Database Updates

### Homework Model

Added fields:
```javascript
allow_partners: {
  type: Boolean,
  default: false
},
max_partners: {
  type: Number,
  default: 1,
  min: 1,
  max: 5
}
```

### StudentHomework Model

Already has these fields (added previously):
```javascript
allow_partners: Boolean,
max_partners: Number
```

---

## Testing

### Test 1: Homework Without Partners

1. Create homework with `allow_partners: false`
2. Go to Choose Partner
3. Select course
4. ✅ Homework doesn't appear in dropdown

### Test 2: Max Partners = 1

1. Create homework with `max_partners: 1`
2. Send partnership request to Student A
3. Try to send another to Student B
4. ✅ Error: "You have reached the maximum number of partners (1)"

### Test 3: Max Partners = 3

1. Create homework with `max_partners: 3`
2. Send requests to Students A, B, and C
3. Try to send to Student D
4. ✅ Error: "You have reached the maximum number of partners (3)"

### Test 4: Partner at Limit

1. Homework allows 2 partners
2. Student B already has 2 partners
3. Try to send request to Student B
4. ✅ Error: "The selected student has reached the maximum number of partners (2)"

---

## Files Modified

1. **server/routes/studentDashboard.js**
   - Filter homework by `allow_partners: true`
   - Include `allow_partners` and `max_partners` in response

2. **server/routes/studentSubmission.js**
   - Validate `allow_partners` is true
   - Check student hasn't exceeded max_partners
   - Check partner hasn't exceeded max_partners
   - Simplified duplicate partnership check

3. **server/models/Homework.js**
   - Added `allow_partners` field
   - Added `max_partners` field

4. **server/routes/homework.js**
   - Accept and save new fields

5. **client/src/pages/lecturer/AddHomework.jsx**
   - Removed points_possible and allow_late_submission
   - Added partner settings UI

6. **docs/DATABASE_MAP.md**
   - Updated Homework schema documentation

---

## Benefits

✅ **Prevents confusion** - Students only see homework they can partner on  
✅ **Enforces limits** - Can't exceed max_partners  
✅ **Better UX** - Clear error messages  
✅ **Flexible system** - Supports 1-5 partners per homework  
✅ **Consistent** - Same settings for both homework types  

---

**Status:** ✅ Complete  
**Date:** October 12, 2025

