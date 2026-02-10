# Auth0 Setup Guide

## Environment Configuration

The `.env` file has been created with your Auth0 credentials:

```
VITE_AUTH0_DOMAIN=dev-a82hpy3yh6az7pc7.us.auth0.com
VITE_AUTH0_CLIENT_ID=uPvA0sHZkfV7K74tJJYX1UJh0YVZZR6t
VITE_AUTH0_REDIRECT_URI=http://localhost:5174/callback
```

## Auth0 Dashboard Configuration

### 1. Application Settings
In your Auth0 Dashboard, configure the following for your application:

**Allowed Callback URLs:**
```
http://localhost:5174/callback
```

**Allowed Logout URLs:**
```
http://localhost:5174
```

**Allowed Web Origins:**
```
http://localhost:5174
```

### 2. User Role Management

To assign roles to users, you have several options:

#### Auth0 Post-Login Action for Role Assignment
Create a Post-Login Action in Auth0 Dashboard > Actions > Flows > Login:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  // Get roles manually assigned to the user in Auth0 Dashboard
  const assignedRoles = (event.authorization?.roles) || [];

  // Check if this is a new user signup with role selection
  const selectedRole = event.request?.query?.role;

  // If user has manually assigned roles, use those
  if (assignedRoles.length > 0) {
    api.idToken.setCustomClaim("https://my-app.com/roles", assignedRoles);
  }
  // If this is a new signup with role selection, assign the selected role
  else if (selectedRole && (selectedRole === 'student' || selectedRole === 'lecturer')) {
    // Store the role in user metadata for future reference
    api.user.setUserMetadata("selected_role", selectedRole);

    // Add the role as a custom claim
    api.idToken.setCustomClaim("https://my-app.com/roles", [selectedRole]);
  }
  // Note: If no roles are assigned and no role selected, no custom claim is added
  // This allows the app to handle users without roles appropriately
};
```

**Important:** This code handles both manually assigned roles and user-selected roles during signup. For new signups, users can select their role (student or lecturer), but admin roles must still be manually assigned.

#### Option B: Using Rules (Legacy - Not Recommended)
If you prefer to use Rules (legacy), create a rule in Auth0 Dashboard > Auth Pipeline > Rules:

```javascript
function (user, context, callback) {
  const namespace = 'https://my-app.com/';

  // Get roles from user's app_metadata or assign based on email
  let roles = user.app_metadata?.roles || [];

  if (roles.length === 0) {
    // Fallback: assign role based on email
    if (user.email && user.email.includes('admin')) {
      roles = ['admin'];
    } else if (user.email && (user.email.includes('lecturer') || user.email.includes('teacher'))) {
      roles = ['lecturer'];
    } else {
      roles = ['student'];
    }
  }

  context.idToken[namespace + 'roles'] = roles;
  context.accessToken[namespace + 'roles'] = roles;

  callback(null, user, context);
}
```

## Manual Role Assignment Process

### Step 1: Create Roles in Auth0 Dashboard
1. Go to Auth0 Dashboard > User Management > Roles
2. Create the following roles:
   - `student` - For students accessing learning materials
   - `lecturer` - For lecturers managing courses
   - `admin` - For administrators with full access

### Step 2: Assign Roles to Users (Manual Process)
**For each new user that signs up:**

1. Go to Auth0 Dashboard > User Management > Users
2. Find the new user in the list
3. Click on the user to open their profile
4. Go to the "Roles" tab
5. Click "Assign Roles"
6. Select the appropriate role (`student`, `lecturer`, or `admin`)
7. Click "Assign"

**Important:** New users will not have access to the application until an administrator manually assigns them a role through this process.

## Testing the Implementation

### 1. Available Login Methods

The application now supports both authentication methods:

- **Demo Login** (`/login`): Uses the original dummy credentials
- **Auth0 Login** (`/auth0-login`): Uses Auth0 authentication

### 2. User Flow for New Signups

**New User Experience:**
1. User signs up via Auth0
2. User is redirected to `/role-pending` page
3. User sees a message explaining that their role needs to be assigned
4. User waits for administrator to assign role
5. Once role is assigned, user can log in again and access their dashboard

**Administrator Workflow:**
1. Check Auth0 Dashboard > User Management > Users for new signups
2. Manually assign appropriate roles to new users
3. Users can then log in and access their assigned dashboards

### 3. Navigation

After successful Auth0 login:
- Users are redirected to `/callback`
- Role is determined and stored in localStorage
- Users are redirected to their appropriate dashboard

## Features Implemented

✅ **Auth0 Integration**
- Auth0Provider wrapper
- Login/Logout functionality
- Callback handling
- Protected routes

✅ **Role-Based Access Control**
- Manual role assignment through Auth0 Dashboard
- Protected routes for each user type
- Role-based dashboard redirection
- Role pending page for users without assigned roles

✅ **Backward Compatibility**
- Original demo login still works
- Existing localStorage-based authentication preserved
- Seamless integration with existing components

## Continue with Google (same email)

If a user signs up with **email/password** (Auth0 Database) and later uses **Continue with Google** with the same email, Auth0 creates a second user (e.g. `google-oauth2|...`) while your app has one account by email. The app now:

1. **Backend:** When a login matches an existing user by **email** (different Auth0 identity, e.g. Google), it treats this as account linking: it assigns the existing user’s role to the new Auth0 identity in Auth0 and keeps that role in the database. No need to request a role again.
2. **Frontend:** After sync, the redirect uses the role from the backend if the JWT has no role yet, so the user goes to the correct dashboard instead of "role pending".

**Optional (Auth0 Dashboard):** You can link identities in Auth0 so one user has both Database and Google logins:
- User Management → Users → select the Auth0 Database user → **Linked Accounts** → Link with the Google account. After that, both logins use the same Auth0 user and roles.

## Troubleshooting

### Common Issues

1. **Redirect URI Mismatch**
   - Ensure callback URL is configured in Auth0 Dashboard
   - Check that the port matches your dev server (5174)

2. **Role Not Assigned**
   - Check Auth0 Rules/Actions are properly configured
   - Verify email patterns match your logic
   - Check browser localStorage for role value

3. **Authentication Loop**
   - Clear browser localStorage
   - Check Auth0 application configuration
   - Verify environment variables are loaded correctly

### Debug Mode

To debug Auth0 authentication, check:
- Browser console for Auth0 logs
- Network tab for Auth0 API calls
- localStorage values for token and role
- Auth0 Dashboard logs section
