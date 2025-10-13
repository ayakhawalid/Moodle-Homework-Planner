# File Table Removal

## Overview
The File table has been completely removed from the database as the system only requires students to submit grades, not files.

## Changes Made

### 1. Database Model Deleted
- **Deleted**: `server/models/File.js`
- The File model is no longer part of the database schema

### 2. Model Updates

#### `server/models/Homework.js`
- Removed `files` virtual that referenced File model

#### `server/models/Class.js`
- Removed `files` virtual that referenced File model

### 3. Route Updates

#### `server/routes/homework.js`
- Removed `File` model import
- Removed `.populate('files')` calls from GET / and GET /:id endpoints
- Removed file query from homework submission information
- Updated response to exclude `files` property from submission data
- Now returns only: `_id`, `submitted_at`, `comments`, `grade`

#### `server/routes/studentSubmission.js`
- Removed unused `File` model import

#### `server/routes/courses.js`
- Already removed File deletion from cascade delete (no longer needed)

#### `server/routes/users.js`
- Already removed File deletion from cascade delete (no longer needed)

### 4. Seed Script Updates

#### `server/scripts/seeds/seed-student-dashboard.js`
- Removed `File` model import
- Removed file creation code
- Updated summary statistics to exclude file count

### 5. Documentation Updates

#### `docs/DATABASE_MAP.md`
- Removed File from Table of Contents
- Removed File from Collections Overview table
- Updated Entity Relationship Diagram (removed File nodes)
- Removed File from User relationships
- Removed File from Class relationships
- Removed File from Homework relationships
- Removed entire File section (schema, indexes, methods)
- Removed File from Relationship Summary tables
- Removed File from Polymorphic Relationships
- Removed File Collection from Indexes section
- Removed File from Database Statistics table
- Updated Notes to reflect grade-only submission workflow
- Updated last modified date to October 13, 2025

#### `docs/CASCADE_DELETE.md`
- Already updated to remove File references
- Cascade deletes no longer include File deletion

## What Was Removed

### File Schema (for reference)
The removed File collection had:
- `filename`, `original_name`, `file_path` - File storage info
- `file_size`, `mime_type` - File metadata
- `homework_id`, `class_id` - Associations
- `uploaded_by` - User reference
- `file_type`, `description` - Classification
- `is_active` - Soft delete flag

### File Relationships (removed)
- User → File (uploaded_by)
- Homework → File (homework_id)
- Class → File (class_id)

## System Behavior After Changes

### Grade Submission
Students now submit only:
- Claimed grade (numeric value)
- Grade screenshot (OCR processed, stored as path in StudentHomework)
- No file attachments

### Homework Display
Homework submission information now shows:
```json
{
  "_id": "submission_id",
  "submitted_at": "2025-10-13T...",
  "comments": "submission comments",
  "grade": 95
}
```

**No longer includes**: `files` array

### Cascade Deletion
When courses or lecturers are deleted:
- ✅ Courses, Homework, StudentHomework, Partnerships, Grades, Exams, Classes deleted
- ❌ No File records to delete (collection doesn't exist)

## Database Cleanup

If you have existing File records in your database, you can clean them up with:
```javascript
// MongoDB shell or script
db.files.drop()
```

Or if you want to keep the data temporarily:
```javascript
// Rename for backup
db.files.renameCollection('files_backup_2025_10_13')
```

## Benefits

1. **Simplified Data Model**: Fewer collections to manage
2. **Reduced Storage**: No file metadata storage needed
3. **Cleaner API Responses**: No file data in responses
4. **Faster Queries**: No need to join/query File collection
5. **Simplified Cascade Deletes**: One less collection to clean up

## Migration Notes

If migrating from an existing system with Files:
1. Backup any important files from the filesystem
2. Drop or rename the `files` collection
3. Update any custom code that references files
4. Clear any client-side caches that expect file data

## Recent Fixes (October 13, 2025)

### Issue Resolved
Fixed `MissingSchemaError: Schema hasn't been registered for model "File"` error that occurred when fetching homework.

### Root Cause
Although the File model was deleted, references to it remained in:
1. Virtual fields in Homework and Class models
2. Populate operations in homework routes
3. Seed scripts

### Changes Applied
1. ✅ Removed `files` virtual from `server/models/Homework.js`
2. ✅ Removed `files` virtual from `server/models/Class.js`
3. ✅ Removed `.populate('files')` from `server/routes/homework.js` (2 locations)
4. ✅ Removed File import and file creation from `server/scripts/seeds/seed-student-dashboard.js`

### Verification
All File model references have been completely removed from the codebase.

---

*Removed: October 13, 2025*
*Fixes Applied: October 13, 2025*

