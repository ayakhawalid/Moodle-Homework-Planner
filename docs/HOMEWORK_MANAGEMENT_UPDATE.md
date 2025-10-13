# Homework Management Update

## Overview
Replaced the "Add Homework" page for lecturers with a comprehensive "Homework Management" page that allows viewing, adding, and deleting homework assignments. Also added delete functionality for students to delete their own homework.

## Changes Made

### Backend Changes

#### 1. `server/routes/homework.js`
**Updated:** DELETE endpoint for traditional homework
- Added partnership deletion when homework is deleted
- Added Grade deletion when homework is deleted  
- Now performs hard delete instead of soft delete
- Returns confirmation with deleted homework details

```javascript
// DELETE /api/homework/:id
// Now deletes:
// - Partnerships for the homework
// - Grades for the homework
// - The homework itself
```

#### 2. `server/routes/studentHomework.js`
**Added:** DELETE endpoint for student homework
- Route: `DELETE /api/student-homework/:id`
- Permissions: Student who created it OR lecturer of the course
- Deletes partnerships for the homework
- Deletes the homework itself
- Returns confirmation with deleted homework details

#### 3. `client/src/services/api.js`
**Added:** Delete method to studentHomework service
```javascript
deleteHomework: (homeworkId) => api.delete(`/student-homework/${homeworkId}`)
```

### Frontend Changes

#### 1. New Lecturer Page: `client/src/pages/lecturer/HomeworkManagement.jsx`
**Created:** Complete homework management interface for lecturers
- **View:** Display all homework assignments in cards
- **Add:** Dialog to create new homework with:
  - Course selection
  - Title, description, instructions
  - Due date
  - Partner settings (allow partners, max partners)
- **Delete:** Delete button on each homework card with confirmation dialog
- **Features:**
  - Shows course information
  - Displays due date with overdue indicator
  - Shows partner settings
  - Confirmation dialog with warning about cascade deletion

#### 2. Updated Student Page: `client/src/pages/student/HomeworkManagement.jsx`
**Added:** Delete functionality for student-created homework
- Delete button appears only on homework where `uploader_role === 'student'`
- No confirmation dialog needed (students can only delete their own homework)
- Automatically deletes related partnerships
- Success/error notifications

### Routing Updates

#### 1. `client/src/App.jsx`
- **Removed:** `AddHomework` import
- **Added:** `LecturerHomeworkManagement` import
- **Changed Route:** `/lecturer/add-homework` → `/lecturer/homework`

#### 2. `client/src/Components/DashboardSidebar.jsx`
- **Updated:** Lecturer navigation
- **Changed:** "Add Homework" → "Homework Management"
- **New Path:** `/lecturer/homework`

### Deleted Files

1. **`client/src/pages/lecturer/AddHomework.jsx`** - Replaced by HomeworkManagement.jsx

## Features

### Lecturer Homework Management

**View Homework:**
- Card-based layout showing all homework assignments
- Course badge on each card
- Due date with overdue indicator
- Partner settings display
- Delete button on each card

**Create Homework:**
- Dialog-based form
- Fields:
  - Course (dropdown)
  - Title (required)
  - Description (required)
  - Detailed Instructions (optional)
  - Due Date (required, datetime picker)
  - Allow Partners (toggle)
  - Max Partners (dropdown, 1-5, shown when partners enabled)

**Delete Homework:**
- Delete button on each homework card
- Confirmation dialog with warning
- Shows what will be deleted (partnerships, grades)
- Cascade deletion of all related data

### Student Homework Management

**Delete Own Homework:**
- Delete button only shown on student-created homework
- No confirmation needed (instant delete)
- Deletes homework and all partnerships
- Cannot delete lecturer-assigned homework
- Shows success notification after deletion

## Cascade Deletion Details

### When Traditional Homework is Deleted (by Lecturer):
1. All partnerships for that homework
2. All grades for that homework
3. The homework record itself

### When Student Homework is Deleted (by Student or Lecturer):
1. All partnerships for that homework
2. The homework record itself

## API Endpoints

### Traditional Homework
```
DELETE /api/homework/:id
- Auth: Lecturer only
- Permission: Must be lecturer of the course
- Deletes: Partnerships, Grades, Homework
```

### Student Homework
```
DELETE /api/student-homework/:id
- Auth: Student or Lecturer
- Permission: Owner OR lecturer of the course
- Deletes: Partnerships, Homework
```

## User Interface

### Lecturer View
```
┌─────────────────────────────────────┐
│  Homework Management    [+ Add]     │
├─────────────────────────────────────┤
│ ┌──────────┐  ┌──────────┐         │
│ │CS101     │  │CS102     │         │
│ │Assignment│  │Quiz 1    │         │
│ │Due: ...  │  │Due: ...  │         │
│ │[Delete]  │  │[Delete]  │         │
│ └──────────┘  └──────────┘         │
└─────────────────────────────────────┘
```

### Student View
```
┌─────────────────────────────────────┐
│  Homework Management    [+ Add]     │
├─────────────────────────────────────┤
│ ┌──────────────┐  ┌──────────────┐ │
│ │CS101         │  │My Homework   │ │
│ │Lecturer Hw   │  │Student Hw    │ │
│ │[Complete]    │  │[Delete]      │ │
│ └──────────────┘  └──────────────┘ │
└─────────────────────────────────────┘
```

## Confirmation Dialogs

### Delete Homework Dialog (Lecturer Only)
- **Icon:** Warning icon (red)
- **Title:** "Delete Homework?"
- **Warning:** Alert box explaining cascade deletion
- **Message:** Confirms homework title
- **Actions:** Cancel (gray) | Delete (red)

### Student Deletion (No Dialog)
- Students can delete their own homework instantly
- No confirmation dialog needed
- Success/error notifications shown after deletion

## Benefits

1. **Unified Interface:** Lecturers can view and manage all homework in one place
2. **Better UX:** Clear visual hierarchy with cards
3. **Safety:** Confirmation dialogs for lecturers prevent accidental deletions
4. **Data Integrity:** Automatic cascade deletion prevents orphaned records
5. **Flexibility:** Students can delete their own homework quickly, lecturers can delete all homework in their courses
6. **Consistency:** Similar interface for both students and lecturers
7. **Efficiency:** Students get instant deletion for their own homework (no confirmation needed)

## Migration Notes

- Old route `/lecturer/add-homework` now redirects to `/lecturer/homework`
- Sidebar navigation updated automatically
- No database migrations needed
- Existing homework unaffected

---

*Updated: October 13, 2025*

