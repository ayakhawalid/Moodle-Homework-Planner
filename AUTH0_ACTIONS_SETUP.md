# Auth0 Actions Setup Guide

## Overview
Auth0 Actions are required to add user roles to the JWT token so that the frontend can access them. This guide shows how to set up the necessary Action.

## Step 1: Create an Action in Auth0 Dashboard

1. Go to Auth0 Dashboard > Actions > Flows
2. Click on "Login" flow
3. Click "+" to add a new Action
4. Choose "Build from scratch"
5. Name: "Add Roles to Token"
6. Trigger: "Login / Post Login"
7. Runtime: "Node.js 18"

## Step 2: Action Code

Replace the default code with the following:

```javascript
/**
 * Handler that will be called during the execution of a PostLogin flow.
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://my-app.com/';
  
  try {
    // Get user roles from Auth0
    const ManagementClient = require('auth0').ManagementClient;
    
    const management = new ManagementClient({
      domain: event.secrets.AUTH0_DOMAIN,
      clientId: event.secrets.AUTH0_M2M_CLIENT_ID,
      clientSecret: event.secrets.AUTH0_M2M_CLIENT_SECRET,
      scope: 'read:users read:roles read:role_members'
    });

    // Get user's roles
    const userRoles = await management.getUserRoles({ id: event.user.user_id });
    const roleNames = userRoles.data.map(role => role.name);
    
    console.log(`User ${event.user.email} has roles:`, roleNames);
    
    // Add roles to the token
    api.idToken.setCustomClaim(`${namespace}roles`, roleNames);
    api.accessToken.setCustomClaim(`${namespace}roles`, roleNames);
    
    // Add primary role (first role or 'student' as default)
    const primaryRole = roleNames.length > 0 ? roleNames[0] : 'student';
    api.idToken.setCustomClaim(`${namespace}primary_role`, primaryRole);
    api.accessToken.setCustomClaim(`${namespace}primary_role`, primaryRole);
    
  } catch (error) {
    console.error('Error fetching user roles:', error);
    
    // Fallback: assign 'student' role if there's an error
    api.idToken.setCustomClaim(`${namespace}roles`, ['student']);
    api.accessToken.setCustomClaim(`${namespace}roles`, ['student']);
    api.idToken.setCustomClaim(`${namespace}primary_role`, 'student');
    api.accessToken.setCustomClaim(`${namespace}primary_role`, 'student');
  }
};
```

## Step 3: Add Secrets to the Action

1. In the Action editor, go to the "Secrets" tab
2. Add the following secrets:
   - `AUTH0_DOMAIN`: Your Auth0 domain (e.g., `dev-a82hpy3yh6az7pc7.us.auth0.com`)
   - `AUTH0_M2M_CLIENT_ID`: Your Machine-to-Machine Client ID
   - `AUTH0_M2M_CLIENT_SECRET`: Your Machine-to-Machine Client Secret

## Step 4: Add Dependencies

1. In the Action editor, go to the "Dependencies" tab
2. Add the following dependency:
   - Package: `auth0`
   - Version: `^4.0.0` (or latest)

## Step 5: Deploy and Add to Flow

1. Click "Deploy" to save the Action
2. Go back to the Login flow
3. Drag the "Add Roles to Token" Action from the right panel to the flow
4. Place it between "Start" and "Complete"
5. Click "Apply" to save the flow

## Alternative: Simple Action (Without Management API)

If you prefer a simpler approach that doesn't use the Management API in the Action:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://my-app.com/';
  
  // Simple role assignment based on email or app_metadata
  let roles = ['student']; // Default role
  
  // Check if user has roles in app_metadata
  if (event.user.app_metadata && event.user.app_metadata.roles) {
    roles = event.user.app_metadata.roles;
  }
  // Or assign roles based on email domain
  else if (event.user.email && event.user.email.endsWith('@admin.com')) {
    roles = ['admin'];
  }
  else if (event.user.email && event.user.email.endsWith('@lecturer.com')) {
    roles = ['lecturer'];
  }
  
  // Add roles to token
  api.idToken.setCustomClaim(`${namespace}roles`, roles);
  api.accessToken.setCustomClaim(`${namespace}roles`, roles);
  api.idToken.setCustomClaim(`${namespace}primary_role`, roles[0]);
  api.accessToken.setCustomClaim(`${namespace}primary_role`, roles[0]);
};
```

## Step 6: Test the Action

1. Try logging in to your application
2. Check the browser's developer tools > Network tab
3. Look for the token in the Auth0 callback
4. Decode the JWT token to verify roles are included
5. Or use the Auth0 debugger at https://jwt.io/

## Troubleshooting

### Common Issues:

1. **Action not triggering**: Make sure it's added to the Login flow and deployed
2. **Secrets not working**: Verify the secret names match exactly
3. **Management API errors**: Check that the M2M app has the correct scopes
4. **Roles not appearing**: Verify users have roles assigned in Auth0 Dashboard

### Testing the Action:

You can test the Action by adding console.log statements and checking the Auth0 Dashboard > Monitoring > Logs for the output.

## Next Steps

After setting up the Action:
1. Test login to verify roles appear in the token
2. Check that the frontend receives the roles correctly
3. Verify role-based access control works in your application
