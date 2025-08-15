// Auth0 Management API service
// Note: This requires a backend API to securely call Auth0 Management API
// For now, we'll work with the user data we get from Auth0 authentication

export const auth0ManagementService = {
  // Get current user info (from Auth0 token)
  getCurrentUser: (auth0User) => {
    if (!auth0User) return null;
    
    return {
      id: auth0User.sub,
      email: auth0User.email,
      name: auth0User.name || auth0User.email?.split('@')[0] || 'User',
      nickname: auth0User.nickname,
      picture: auth0User.picture,
      email_verified: auth0User.email_verified,
      created_at: auth0User.created_at,
      updated_at: auth0User.updated_at,
      last_login: new Date().toISOString(), // Current login
      // Extract role from custom claims
      roles: auth0User['https://my-app.com/roles'] || [],
      primary_role: auth0User['https://my-app.com/roles']?.[0] || null
    };
  },

  // Get user statistics (mock data for now, would need backend for real data)
  getUserStats: () => {
    // This would normally come from Auth0 Management API via backend
    return {
      total: 0,
      active: 0,
      students: 0,
      lecturers: 0,
      admins: 0,
      verified: 0,
      last_updated: new Date().toISOString()
    };
  },

  // Format user for display
  formatUserForDisplay: (auth0User) => {
    const user = auth0ManagementService.getCurrentUser(auth0User);
    if (!user) return null;

    return {
      ...user,
      display_name: user.name || user.email,
      role_display: user.primary_role ? 
        user.primary_role.charAt(0).toUpperCase() + user.primary_role.slice(1) : 
        'No Role',
      status: user.email_verified ? 'Verified' : 'Unverified',
      last_seen: 'Just now' // Since they're currently logged in
    };
  }
};

export default auth0ManagementService;
