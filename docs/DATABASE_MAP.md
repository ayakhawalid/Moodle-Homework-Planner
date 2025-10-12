# Database Schema Map

## Overview

The Moodle Homework Planner uses MongoDB as its database. This document provides a comprehensive map of all collections, their schemas, and relationships.

## Table of Contents
- [Collections Overview](#collections-overview)
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Detailed Schema Documentation](#detailed-schema-documentation)
  - [User](#user)
  - [Course](#course)
  - [Class](#class)
  - [Homework](#homework)
  - [StudentHomework](#studenthomework)
  - [Grade](#grade)
  - [Exam](#exam)
  - [StudyProgress](#studyprogress)
  - [Partner](#partner)
  - [RoleRequest](#rolerequest)
  - [File](#file)
- [Relationship Summary](#relationship-summary)
- [Indexes](#indexes)

---

## Collections Overview

| Collection | Description | Key Relationships |
|------------|-------------|-------------------|
| **User** | Stores user accounts (students, lecturers, admins) | Referenced by most other collections |
| **Course** | Academic courses | Has many Classes, Homework, Exams; Belongs to Lecturer; Has many Students |
| **Class** | Individual class sessions | Belongs to Course; Has many Files |
| **Homework** | Homework assignments | Belongs to Course; Has many Grades, Files, Partners |
| **StudentHomework** | Student-uploaded homework | Belongs to Course and User |
| **Grade** | Student grades for homework/exams | Belongs to Student, Homework or Exam |
| **Exam** | Examinations | Belongs to Course; Has many Grades |
| **StudyProgress** | Student study tracking | Belongs to Student (User) |
| **Partner** | Student partnerships for homework | Belongs to Homework and two Students |
| **RoleRequest** | Role change requests | Belongs to User |
| **File** | File uploads | Belongs to Homework or Class; Uploaded by User |

---

## Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Course : "teaches (lecturer)"
    User ||--o{ Course : "enrolled in (students)"
    User ||--o{ Grade : "receives"
    User ||--o{ StudyProgress : "tracks"
    User ||--o{ RoleRequest : "submits"
    User ||--o{ File : "uploads"
    User ||--o{ StudentHomework : "uploads"
    User ||--o{ Partner : "student1"
    User ||--o{ Partner : "student2"
    
    Course ||--o{ Class : "has"
    Course ||--o{ Homework : "has"
    Course ||--o{ Exam : "has"
    Course ||--o{ StudentHomework : "belongs to"
    
    Homework ||--o{ Grade : "graded"
    Homework ||--o{ File : "attached to"
    Homework ||--o{ Partner : "allows partnerships"
    
    Exam ||--o{ Grade : "graded"
    
    Class ||--o{ File : "contains materials"
    
    Grade }o--|| User : "graded by (lecturer)"
```

---

## Detailed Schema Documentation

### User

**Collection:** `users`

**Purpose:** Stores all user accounts with Auth0 integration for authentication.

#### Schema Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Yes | MongoDB auto-generated ID |
| `auth0_id` | String | Yes | Unique Auth0 identifier |
| `email` | String | Yes | User email (unique) |
| `name` | String | No | Display name |
| `full_name` | String | No | Full legal name |
| `username` | String | No | Username (unique when present) |
| `role` | String | No | User role: 'student', 'lecturer', 'admin' |
| `picture` | String | No | Profile picture URL |
| `email_verified` | Boolean | No | Email verification status (default: false) |
| `is_active` | Boolean | No | Active status (default: true) |
| `last_login` | Date | No | Last login timestamp |
| `metadata` | Object | No | Additional metadata (default: {}) |
| `lastSynced` | Date | No | Last Auth0 sync timestamp |
| `createdAt` | Date | Auto | Creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

#### Relationships

- **One-to-Many with Course** (as lecturer): A user with role 'lecturer' can teach multiple courses
- **Many-to-Many with Course** (as student): Students can be enrolled in multiple courses
- **One-to-Many with Grade**: A user receives many grades
- **One-to-Many with StudyProgress**: A user tracks study progress over time
- **One-to-Many with RoleRequest**: A user can submit role change requests
- **One-to-Many with File**: A user uploads multiple files
- **One-to-Many with StudentHomework**: A user uploads student homework
- **One-to-Many with Partner**: A user can have multiple partnerships

#### Indexes

- `auth0_id` (unique)
- `email` (unique)
- `username` (unique, sparse)

---

### Course

**Collection:** `courses`

**Purpose:** Represents academic courses taught by lecturers and taken by students.

#### Schema Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Yes | MongoDB auto-generated ID |
| `course_name` | String | Yes | Name of the course |
| `lecturer_id` | ObjectId → User | Yes | Reference to the lecturer |
| `syllabus` | String | No | Course syllabus |
| `course_code` | String | No | Course code (uppercase) |
| `description` | String | No | Course description |
| `credits` | Number | No | Credit hours (1-10) |
| `semester` | String | No | Enum: 'fall', 'spring', 'summer', 'winter' |
| `year` | Number | No | Academic year (2020-2030) |
| `students` | [ObjectId] → User | No | Array of enrolled student IDs |
| `is_active` | Boolean | No | Course status (default: true) |
| `partner_settings.enabled` | Boolean | No | Allow partnerships (default: true) |
| `partner_settings.max_partners_per_student` | Number | No | Max partners (0-5, default: 1) |
| `createdAt` | Date | Auto | Creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

#### Relationships

- **Many-to-One with User** (lecturer): Course belongs to one lecturer
- **Many-to-Many with User** (students): Course has many enrolled students
- **One-to-Many with Class**: Course has many class sessions
- **One-to-Many with Homework**: Course has many homework assignments
- **One-to-Many with Exam**: Course has many exams
- **One-to-Many with StudentHomework**: Course has student-uploaded homework

#### Virtual Fields

- `homework`: Virtual populate to Homework collection
- `classes`: Virtual populate to Class collection
- `exams`: Virtual populate to Exam collection

#### Indexes

- `lecturer_id`
- `course_name`
- `course_code`
- `students`

#### Instance Methods

- `addStudent(studentId)`: Add student to course
- `removeStudent(studentId)`: Remove student from course

#### Static Methods

- `findByLecturer(lecturerId)`: Find active courses by lecturer
- `findByStudent(studentId)`: Find active courses for student

---

### Class

**Collection:** `classes`

**Purpose:** Represents individual class sessions within a course.

#### Schema Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Yes | MongoDB auto-generated ID |
| `course_id` | ObjectId → Course | Yes | Reference to course |
| `room` | String | Yes | Room number/location |
| `class_title` | String | No | Title of the class session |
| `class_date` | Date | Yes | Date of the class |
| `start_time` | String | Yes | Start time (HH:MM format) |
| `end_time` | String | Yes | End time (HH:MM format) |
| `description` | String | No | Class description |
| `agenda` | String | No | Class agenda |
| `class_type` | String | No | Enum: 'lecture', 'lab', 'seminar', 'workshop', 'exam', 'other' |
| `attendance_required` | Boolean | No | Attendance mandatory (default: true) |
| `max_capacity` | Number | No | Maximum class capacity |
| `is_cancelled` | Boolean | No | Cancellation status (default: false) |
| `cancellation_reason` | String | No | Reason for cancellation |
| `is_online` | Boolean | No | Online class flag (default: false) |
| `meeting_link` | String | No | Online meeting link |
| `meeting_password` | String | No | Meeting password |
| `createdAt` | Date | Auto | Creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

#### Relationships

- **Many-to-One with Course**: Class belongs to one course
- **One-to-Many with File**: Class can have multiple file attachments

#### Virtual Fields

- `files`: Virtual populate to File collection

#### Indexes

- `course_id`
- `class_date`
- `room`
- Compound: `(course_id, class_date)`
- Compound: `(class_date, start_time)`

#### Instance Methods

- `isToday()`: Check if class is today
- `isUpcoming()`: Check if class is in the future
- `getDurationMinutes()`: Calculate class duration
- `cancel(reason)`: Cancel class with reason

#### Static Methods

- `findByCourse(courseId)`: Find all classes for a course
- `findUpcoming(days)`: Find upcoming classes within N days
- `findByRoom(room)`: Find classes by room
- `findToday()`: Find today's classes

---

### Homework

**Collection:** `homeworks`

**Purpose:** Represents homework assignments created by lecturers.

#### Schema Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Yes | MongoDB auto-generated ID |
| `course_id` | ObjectId → Course | Yes | Reference to course |
| `title` | String | Yes | Homework title |
| `description` | String | Yes | Homework description |
| `due_date` | Date | Yes | Due date |
| `assigned_date` | Date | No | Assignment date (default: now) |
| `points_possible` | Number | No | Maximum points (min: 0, default: 100) |
| `instructions` | String | No | Detailed instructions |
| `submission_type` | String | No | Enum: 'file', 'text', 'both' (default: 'both') |
| `is_active` | Boolean | No | Active status (default: true) |
| `allow_late_submission` | Boolean | No | Allow late submissions (default: false) |
| `allow_partners` | Boolean | No | Allow study partnerships (default: false) |
| `max_partners` | Number | No | Max partners allowed (1-5, default: 1) |
| `createdAt` | Date | Auto | Creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

#### Relationships

- **Many-to-One with Course**: Homework belongs to one course
- **One-to-Many with Grade**: Homework has many grades
- **One-to-Many with File**: Homework can have file attachments
- **One-to-Many with Partner**: Homework can have student partnerships

#### Virtual Fields

- `grades`: Virtual populate to Grade collection
- `files`: Virtual populate to File collection
- `partners`: Virtual populate to Partner collection

#### Indexes

- `course_id`
- `due_date`
- `assigned_date`

#### Instance Methods

- `isOverdue()`: Check if homework is overdue
- `daysUntilDue()`: Calculate days until due date

#### Static Methods

- `findUpcoming(days)`: Find homework due within N days
- `findByCourse(courseId)`: Find homework by course

---

### StudentHomework

**Collection:** `studenthomeworks`

**Purpose:** Student-uploaded homework with verification system for deadlines and grades.

#### Schema Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Yes | MongoDB auto-generated ID |
| `title` | String | Yes | Homework title |
| `description` | String | No | Homework description |
| `course_id` | ObjectId → Course | Yes | Reference to course |
| `uploaded_by` | ObjectId → User | Yes | Reference to uploader |
| `uploader_role` | String | Yes | Enum: 'student', 'lecturer' |
| `claimed_deadline` | Date | Yes | Deadline claimed by student |
| `verified_deadline` | Date | No | Verified deadline |
| `deadline_verification_status` | String | No | Enum: 'unverified', 'verified', 'rejected', 'pending_review' |
| `deadline_verified_by` | ObjectId → User | No | Lecturer who verified |
| `deadline_verified_at` | Date | No | Verification timestamp |
| `deadline_verification_notes` | String | No | Verification notes |
| `claimed_grade` | Number | No | Grade claimed by student (0-100) |
| `verified_grade` | Number | No | Verified grade (0-100) |
| `grade_verification_status` | String | No | Enum: 'unverified', 'verified', 'rejected', 'pending_review' |
| `grade_verified_by` | ObjectId → User | No | Lecturer who verified grade |
| `grade_verified_at` | Date | No | Grade verification timestamp |
| `grade_screenshot_path` | String | No | Path to grade screenshot |
| `extracted_grade_data` | Object | No | OCR extracted grade data |
| `completion_status` | String | No | Enum: 'not_started', 'in_progress', 'completed', 'graded' |
| `completed_at` | Date | No | Completion timestamp |
| `tags` | [String] | No | Tags for categorization |
| `moodle_assignment_id` | String | No | Moodle assignment ID |
| `moodle_url` | String | No | Moodle URL |
| `allow_partners` | Boolean | No | Allow study partnerships (default: false) |
| `max_partners` | Number | No | Max partners allowed (1-5, default: 1) |
| `createdAt` | Date | Auto | Creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

#### Relationships

- **Many-to-One with Course**: Student homework belongs to one course
- **Many-to-One with User** (uploaded_by): Uploaded by one user
- **Many-to-One with User** (verified_by): Verified by one lecturer

#### Virtual Fields

- `days_until_deadline`: Calculated days until deadline
- `is_overdue`: Boolean indicating if overdue

#### Indexes

- `course_id`
- `uploaded_by`
- `claimed_deadline`
- `completion_status`
- `deadline_verification_status`
- `grade_verification_status`

#### Static Methods

- `findByCourse(courseId)`: Find student homework by course
- `findPendingVerifications()`: Find homework pending verification

---

### Grade

**Collection:** `grades`

**Purpose:** Stores student grades for homework and exams.

#### Schema Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Yes | MongoDB auto-generated ID |
| `student_id` | ObjectId → User | Yes | Reference to student |
| `homework_id` | ObjectId → Homework | No* | Reference to homework (nullable) |
| `exam_id` | ObjectId → Exam | No* | Reference to exam (nullable) |
| `grade` | Number | Yes | Grade value (0-100) |
| `points_earned` | Number | No | Points earned (min: 0) |
| `points_possible` | Number | No | Points possible (min: 0) |
| `letter_grade` | String | No | Letter grade: 'A+', 'A', 'A-', 'B+', etc. |
| `graded_by` | ObjectId → User | Yes | Reference to grader (lecturer) |
| `feedback` | String | No | Grading feedback |
| `submission_date` | Date | No | Submission date |
| `is_late` | Boolean | No | Late submission flag (default: false) |
| `is_final` | Boolean | No | Final grade flag (default: true) |
| `graded_at` | Date | No | Grading timestamp (default: now) |
| `createdAt` | Date | Auto | Creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

*Note: Either `homework_id` or `exam_id` must be present (not both)

#### Relationships

- **Many-to-One with User** (student): Grade belongs to one student
- **Many-to-One with Homework**: Grade may belong to one homework
- **Many-to-One with Exam**: Grade may belong to one exam
- **Many-to-One with User** (grader): Grade assigned by one lecturer

#### Validation Rules

- Pre-save validation ensures either `homework_id` or `exam_id` is present, but not both

#### Indexes

- `student_id`
- `homework_id`
- `exam_id`
- `graded_by`
- `graded_at` (descending)
- Compound: `(student_id, homework_id)`
- Compound: `(student_id, exam_id)`

#### Instance Methods

- `calculateLetterGrade()`: Calculate letter grade from numeric grade
- `isPassing()`: Check if grade is passing (≥60%)

#### Static Methods

- `findByStudent(studentId)`: Find all grades for a student
- `findByHomework(homeworkId)`: Find all grades for homework
- `findByExam(examId)`: Find all grades for exam
- `getHomeworkAverage(homeworkId)`: Calculate average grade for homework

---

### Exam

**Collection:** `exams`

**Purpose:** Represents examinations within courses.

#### Schema Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Yes | MongoDB auto-generated ID |
| `course_id` | ObjectId → Course | Yes | Reference to course |
| `exam_title` | String | Yes | Exam title |
| `due_date` | Date | Yes | Exam date |
| `description` | String | No | Exam description |
| `instructions` | String | No | Exam instructions |
| `start_time` | String | Yes | Start time (HH:MM format) |
| `duration_minutes` | Number | Yes | Exam duration in minutes (min: 1) |
| `exam_type` | String | No | Enum: 'midterm', 'final', 'quiz', 'practical', 'oral', 'other' |
| `points_possible` | Number | No | Maximum points (min: 0, default: 100) |
| `room` | String | No | Exam room |
| `is_online` | Boolean | No | Online exam flag (default: false) |
| `meeting_link` | String | No | Online meeting link |
| `open_book` | Boolean | No | Open book exam (default: false) |
| `calculator_allowed` | Boolean | No | Calculator allowed (default: false) |
| `notes_allowed` | Boolean | No | Notes allowed (default: false) |
| `is_active` | Boolean | No | Active status (default: true) |
| `is_published` | Boolean | No | Published status (default: false) |
| `createdAt` | Date | Auto | Creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

#### Relationships

- **Many-to-One with Course**: Exam belongs to one course
- **One-to-Many with Grade**: Exam has many grades

#### Virtual Fields

- `grades`: Virtual populate to Grade collection

#### Indexes

- `course_id`
- `due_date`
- `exam_type`
- Compound: `(course_id, due_date)`

#### Instance Methods

- `isOverdue()`: Check if exam is overdue
- `daysUntilExam()`: Calculate days until exam
- `getEndTime()`: Calculate exam end time
- `isToday()`: Check if exam is today
- `publish()`: Publish exam to students

#### Static Methods

- `findByCourse(courseId)`: Find exams by course
- `findUpcoming(days)`: Find upcoming exams within N days
- `findByType(examType)`: Find exams by type
- `findToday()`: Find today's exams

---

### StudyProgress

**Collection:** `studyprogresses`

**Purpose:** Tracks student study sessions and progress over time.

#### Schema Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Yes | MongoDB auto-generated ID |
| `student_id` | ObjectId → User | Yes | Reference to student |
| `date` | Date | Yes | Study date |
| `hours_studied` | Number | Yes | Total hours studied (0-24) |
| `tasks_completed` | String | Yes | Description of completed tasks |
| `subjects_studied` | [Object] | No | Array of subjects with hours |
| `subjects_studied.subject` | String | No | Subject name |
| `subjects_studied.hours` | Number | No | Hours spent on subject |
| `study_sessions` | [Object] | No | Array of study sessions |
| `study_sessions.start_time` | String | Yes | Session start (HH:MM) |
| `study_sessions.end_time` | String | Yes | Session end (HH:MM) |
| `study_sessions.subject` | String | No | Subject studied |
| `study_sessions.notes` | String | No | Session notes |
| `study_sessions.productivity_rating` | Number | No | Rating (1-5) |
| `daily_goal_hours` | Number | No | Daily goal in hours (default: 0) |
| `goal_achieved` | Boolean | No | Goal achieved flag (default: false) |
| `focus_rating` | Number | No | Focus rating (1-5) |
| `difficulty_rating` | Number | No | Difficulty rating (1-5) |
| `month_summary` | String | No | Monthly summary text |
| `createdAt` | Date | Auto | Creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

#### Relationships

- **Many-to-One with User**: Study progress belongs to one student

#### Unique Constraint

- Compound unique index on `(student_id, date)` - one record per student per day

#### Indexes

- `student_id`
- `date`
- Compound unique: `(student_id, date)`
- Compound: `(student_id, date)` descending

#### Instance Methods

- `addStudySession(session)`: Add a study session
- `getWeekNumber()`: Get ISO week number
- `getMonthYear()`: Get month/year string

#### Static Methods

- `findByStudent(studentId)`: Find all study progress for student
- `findByDateRange(studentId, startDate, endDate)`: Find by date range
- `getWeeklySummary(studentId, weekStart)`: Aggregate weekly stats
- `getMonthlySummary(studentId, year, month)`: Aggregate monthly stats
- `getStudyStreak(studentId)`: Calculate consecutive study days

---

### Partner

**Collection:** `partners`

**Purpose:** Manages student partnerships for homework assignments.

#### Schema Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Yes | MongoDB auto-generated ID |
| `homework_id` | ObjectId | Yes | Reference to homework (Homework OR StudentHomework) |
| `homework_type` | String | No | Enum: 'traditional', 'student' (default: 'traditional') |
| `student1_id` | ObjectId → User | Yes | Reference to first student |
| `student2_id` | ObjectId → User | Yes | Reference to second student |
| `partnership_status` | String | No | Enum: 'pending', 'accepted', 'declined', 'active', 'completed' |
| `initiated_by` | ObjectId → User | Yes | Who initiated partnership |
| `notes` | String | No | Partnership notes |
| `accepted_at` | Date | No | Acceptance timestamp |
| `completed_at` | Date | No | Completion timestamp |
| `createdAt` | Date | Auto | Creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

#### Relationships

- **Polymorphic with Homework/StudentHomework**: Partnership can belong to either traditional Homework or StudentHomework (determined by `homework_type` field)
- **Many-to-One with User** (student1): First partner
- **Many-to-One with User** (student2): Second partner
- **Many-to-One with User** (initiator): User who initiated

#### Notes

- The `homework_id` field can reference either `Homework` or `StudentHomework` collection
- Use `homework_type` to determine which collection to query
- Manual population required (no automatic ref) to support both types

#### Validation Rules

- Pre-save validation ensures `student1_id` and `student2_id` are different

#### Unique Constraint

- Compound unique index on `(homework_id, student1_id, student2_id)`

#### Indexes

- `homework_id`
- `student1_id`
- `student2_id`
- Compound unique: `(homework_id, student1_id, student2_id)`

#### Instance Methods

- `getPartnerOf(studentId)`: Get the partner of a specific student
- `includesStudent(studentId)`: Check if student is in partnership
- `accept()`: Accept partnership
- `complete()`: Mark partnership as completed

#### Static Methods

- `findByHomework(homeworkId)`: Find partnerships for homework
- `findByStudent(studentId)`: Find all partnerships for student
- `findActiveByStudent(studentId)`: Find active partnerships for student
- `partnershipExists(homeworkId, student1Id, student2Id)`: Check if partnership exists

---

### RoleRequest

**Collection:** `rolerequests`

**Purpose:** Manages user requests to change their role in the system.

#### Schema Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Yes | MongoDB auto-generated ID |
| `user` | ObjectId → User | Yes | Reference to user |
| `desired_role` | String | Yes | Enum: 'student', 'lecturer', 'admin' |
| `status` | String | No | Enum: 'pending', 'approved', 'rejected' (default: 'pending') |
| `note` | String | No | Request note (default: '') |
| `created_at` | Date | No | Creation date (default: now) |
| `updated_at` | Date | No | Last update date (default: now) |

#### Relationships

- **Many-to-One with User**: Role request belongs to one user

#### Pre-save Hook

- Automatically updates `updated_at` field before saving

---

### File

**Collection:** `files`

**Purpose:** Manages file uploads for homework and class materials.

#### Schema Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Yes | MongoDB auto-generated ID |
| `filename` | String | Yes | Stored filename |
| `original_name` | String | Yes | Original filename |
| `file_path` | String | Yes | File storage path |
| `file_size` | Number | Yes | File size in bytes |
| `mime_type` | String | Yes | MIME type |
| `homework_id` | ObjectId → Homework | No | Reference to homework (nullable) |
| `class_id` | ObjectId → Class | No | Reference to class (nullable) |
| `uploaded_by` | ObjectId → User | Yes | Reference to uploader |
| `description` | String | No | File description |
| `file_type` | String | No | Enum: 'assignment', 'resource', 'submission', 'other' |
| `is_active` | Boolean | No | Active status (default: true) |
| `createdAt` | Date | Auto | Creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

#### Relationships

- **Many-to-One with Homework**: File may belong to one homework
- **Many-to-One with Class**: File may belong to one class
- **Many-to-One with User**: File uploaded by one user

#### Indexes

- `homework_id`
- `class_id`
- `uploaded_by`

#### Instance Methods

- `getFileUrl()`: Get download URL
- `getFormattedSize()`: Get human-readable file size

#### Static Methods

- `findByHomework(homeworkId)`: Find files by homework
- `findByClass(classId)`: Find files by class
- `findByUser(userId)`: Find files uploaded by user

---

## Relationship Summary

### One-to-Many Relationships

| Parent | Child | Foreign Key | Description |
|--------|-------|-------------|-------------|
| User (lecturer) | Course | `lecturer_id` | Lecturer teaches courses |
| User | Grade | `student_id` | Student receives grades |
| User | StudyProgress | `student_id` | Student tracks progress |
| User | RoleRequest | `user` | User submits role requests |
| User | File | `uploaded_by` | User uploads files |
| User | StudentHomework | `uploaded_by` | User uploads homework |
| Course | Class | `course_id` | Course has class sessions |
| Course | Homework | `course_id` | Course has homework |
| Course | Exam | `course_id` | Course has exams |
| Course | StudentHomework | `course_id` | Course has student homework |
| Homework | Grade | `homework_id` | Homework receives grades |
| Homework | File | `homework_id` | Homework has attachments |
| Homework | Partner | `homework_id` | Homework allows partnerships |
| Exam | Grade | `exam_id` | Exam receives grades |
| Class | File | `class_id` | Class has materials |

### Many-to-Many Relationships

| Entity 1 | Entity 2 | Junction/Implementation | Description |
|----------|----------|-------------------------|-------------|
| User (student) | Course | `Course.students` array | Students enrolled in courses |
| User | User | Partner collection | Students partner on homework |

### Polymorphic Relationships

| Child | Parents | Implementation | Description |
|-------|---------|----------------|-------------|
| Grade | Homework OR Exam | `homework_id` XOR `exam_id` | Grade belongs to either homework or exam |
| File | Homework OR Class | `homework_id` XOR `class_id` | File attached to homework or class |

---

## Indexes

### Performance Indexes

#### User Collection
- `auth0_id` (unique)
- `email` (unique)
- `username` (unique, sparse)

#### Course Collection
- `lecturer_id`
- `course_name`
- `course_code`
- `students`

#### Class Collection
- `course_id`
- `class_date`
- `room`
- Compound: `(course_id, class_date)`
- Compound: `(class_date, start_time)`

#### Homework Collection
- `course_id`
- `due_date`
- `assigned_date`

#### StudentHomework Collection
- `course_id`
- `uploaded_by`
- `claimed_deadline`
- `completion_status`
- `deadline_verification_status`
- `grade_verification_status`

#### Grade Collection
- `student_id`
- `homework_id`
- `exam_id`
- `graded_by`
- `graded_at` (descending)
- Compound: `(student_id, homework_id)`
- Compound: `(student_id, exam_id)`

#### Exam Collection
- `course_id`
- `due_date`
- `exam_type`
- Compound: `(course_id, due_date)`

#### StudyProgress Collection
- `student_id`
- `date`
- Compound unique: `(student_id, date)`
- Compound: `(student_id, date)` descending

#### Partner Collection
- `homework_id`
- `student1_id`
- `student2_id`
- Compound unique: `(homework_id, student1_id, student2_id)`

#### File Collection
- `homework_id`
- `class_id`
- `uploaded_by`

---

## Data Integrity Rules

### Unique Constraints
1. **User**: `auth0_id`, `email`, `username` (when present)
2. **StudyProgress**: `(student_id, date)` - one record per student per day
3. **Partner**: `(homework_id, student1_id, student2_id)` - unique partnerships

### Validation Rules
1. **Grade**: Must have either `homework_id` OR `exam_id`, not both
2. **Partner**: `student1_id` must differ from `student2_id`
3. **StudyProgress**: `hours_studied` must be between 0-24

### Cascading Behaviors
- **Soft Deletes**: Most collections use `is_active` flag instead of hard deletes
- **References**: No automatic cascading - application handles related record updates

---

## Database Statistics

| Collection | Estimated Avg Size | Growth Pattern |
|------------|-------------------|----------------|
| User | 1 KB per doc | Linear with users |
| Course | 2 KB per doc | Linear with courses |
| Class | 1 KB per doc | High volume (multiple per course) |
| Homework | 2 KB per doc | Medium volume |
| StudentHomework | 3 KB per doc | High volume |
| Grade | 1 KB per doc | Very high volume |
| Exam | 2 KB per doc | Low-medium volume |
| StudyProgress | 2 KB per doc | Very high volume (daily per student) |
| Partner | 0.5 KB per doc | Low-medium volume |
| RoleRequest | 0.5 KB per doc | Low volume |
| File | 0.5 KB per doc (metadata) | Medium-high volume |

---

## Notes

1. **Timestamps**: All collections use Mongoose `timestamps: true` for automatic `createdAt` and `updatedAt` fields
2. **Virtual Fields**: Many collections define virtual fields for relationships (populated on demand)
3. **Soft Deletes**: Most collections use `is_active` boolean flag instead of hard deletion
4. **Auth0 Integration**: User collection syncs with Auth0 via `auth0_id` and `lastSynced` fields
5. **File Storage**: File collection stores metadata; actual files stored in filesystem at `file_path`
6. **OCR Integration**: StudentHomework has `extracted_grade_data` for OCR-extracted grades from screenshots

---

*Last Updated: October 12, 2025*

