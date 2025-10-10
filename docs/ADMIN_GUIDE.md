# Administrator Guide: Managing User Roles

## Overview
This guide explains how to manage user roles for your React application using the Auth0 Dashboard. All role assignments must be done manually by administrators.

## User Roles
Your application supports three user roles:

- **Student** (`student`) - Access to student dashboard and learning materials
- **Lecturer** (`lecturer`) - Access to teaching tools and course management  
- **Admin** (`admin`) - Full system access and user management

## Managing New User Signups

### When a New User Signs Up
1. New users will complete the Auth0 signup process
2. They will be redirected to a "Role Pending" page
3. They cannot access the application until you assign them a role
4. You will need to manually assign roles through the Auth0 Dashboard

### Assigning Roles to New Users

#### Step 1: Access Auth0 Dashboard
1. Log in to your Auth0 Dashboard
2. Navigate to **User Management** → **Users**

#### Step 2: Find the New User
1. Look for recently created users (sorted by creation date)
2. Click on the user's name or email to open their profile

#### Step 3: Assign Role
1. In the user profile, click on the **"Roles"** tab
2. Click **"Assign Roles"** button
3. Select the appropriate role:
   - `student` for students
   - `lecturer` for teaching staff
   - `admin` for administrators
4. Click **"Assign"** to confirm

#### Step 4: Verify Assignment
1. The role should now appear in the user's "Roles" tab
2. The user can now log in and will be redirected to their appropriate dashboard

## User Experience After Role Assignment

### Student Role
- Redirected to: `/student/dashboard`
- Access to: Student features, homework, progress tracking, study tools

### Lecturer Role  
- Redirected to: `/lecturer/dashboard`
- Access to: Course management, homework checking, student statistics

### Admin Role
- Redirected to: `/admin/dashboard`
- Access to: User management, system analytics, system settings

## Monitoring and Management

### Checking User Status
1. Go to Auth0 Dashboard → User Management → Users
2. Click on any user to see their assigned roles
3. Users without roles will show "No roles assigned"

### Modifying User Roles
1. Open the user's profile in Auth0 Dashboard
2. Go to the "Roles" tab
3. To remove a role: Click the "X" next to the role name
4. To add a role: Click "Assign Roles" and select new role

### Bulk Role Management
For multiple users:
1. Use Auth0 Management API for bulk operations
2. Or assign roles individually through the dashboard

## Troubleshooting

### User Can't Access Dashboard
**Problem:** User sees "Role Pending" page after login
**Solution:** Check if the user has been assigned a role in Auth0 Dashboard

### User Redirected to Wrong Dashboard
**Problem:** User with lecturer role goes to student dashboard
**Solution:** 
1. Check role assignment in Auth0 Dashboard
2. Verify the role name matches exactly (`student`, `lecturer`, `admin`)
3. Ask user to log out and log in again

### New User Not Appearing in Dashboard
**Problem:** Can't find new user in Auth0 Dashboard
**Solution:**
1. Check the correct Auth0 tenant
2. Verify user completed signup process
3. Check "All Users" view (not filtered)

## Best Practices

### Role Assignment Guidelines
- **Students**: Anyone taking courses or learning
- **Lecturers**: Teaching staff, course creators, instructors
- **Admins**: IT staff, system administrators, platform managers

### Security Considerations
- Only assign admin roles to trusted personnel
- Regularly review user roles and remove unnecessary access
- Monitor new signups and assign roles promptly

### Communication
- Set up email notifications for new user signups
- Inform users about the role assignment process
- Provide contact information for role assignment requests

## Contact Information
For technical issues with role assignment, contact your development team.
For user access requests, users should contact: admin@yourcompany.com
