const { ManagementClient } = require('auth0');
const axios = require('axios');

// Validate Auth0 configuration
if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_M2M_CLIENT_ID || !process.env.AUTH0_M2M_CLIENT_SECRET) {
  console.error('❌ Auth0 Management API configuration missing. Please check your .env file.');
  console.error('Required variables: AUTH0_DOMAIN, AUTH0_M2M_CLIENT_ID, AUTH0_M2M_CLIENT_SECRET');
}

if (process.env.AUTH0_M2M_CLIENT_SECRET === 'YOUR_ACTUAL_CLIENT_SECRET_HERE') {
  console.error('❌ Auth0 M2M Client Secret is still a placeholder. Please update it with the actual secret from Auth0 Dashboard.');
}

// Initialize Auth0 Management API client
const management = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_M2M_CLIENT_ID,
  clientSecret: process.env.AUTH0_M2M_CLIENT_SECRET,
  scope: 'read:users update:users delete:users read:roles read:role_members create:role_members delete:role_members update:users_app_metadata'
});

const getMgmtToken = async () => {
  try {
    // The ManagementClient automatically handles token management
    // We need to get a token manually using the M2M credentials
    const response = await axios.post(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
      client_id: process.env.AUTH0_M2M_CLIENT_ID,
      client_secret: process.env.AUTH0_M2M_CLIENT_SECRET,
      audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
      grant_type: 'client_credentials',
      scope: 'read:users update:users delete:users read:roles read:role_members create:role_members delete:role_members update:users_app_metadata'
    });
    
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting management token:', error);
    throw error;
  }
};

const deleteAuth0User = async (auth0UserId) => {
  if (!auth0UserId) throw new Error('Missing Auth0 user ID');
  try {
    await management.users.delete({ id: auth0UserId });
    console.log(`✅ Successfully deleted Auth0 user: ${auth0UserId}`);
  } catch (error) {
    console.error(`❌ Failed to delete Auth0 user: ${auth0UserId}`, error.message);
    throw new Error('Failed to delete user in Auth0');
  }
};

/**
 * Get user's roles using the user's own access token (with permissions)
 * This uses the permissions you added to your admin user
 */
async function getUserRolesWithUserToken(auth0UserId, userAccessToken) {
  try {
    console.log(`Fetching roles for ${auth0UserId} using user's token with permissions`);
    
    // Use the Auth0 SDK by creating a temporary client authenticated with the user's token.
    // This is cleaner than using axios and removes an unnecessary dependency.
    const userManagementClient = new ManagementClient({
      domain: process.env.AUTH0_DOMAIN,
      token: userAccessToken,
    });
    
    const roles = await userManagementClient.users.getRoles({ id: auth0UserId });
    const roleNames = roles.data.map(role => role.name);
    console.log(`Roles from Auth0 API for ${auth0UserId}:`, roleNames);
    return roleNames;
  } catch (error) {
    console.error('Error fetching user roles with user token:', error.message);
    return null;
  }
}

/**
 * Get user's roles from Auth0 Management API
 * This is the authoritative source for current roles
 */
async function getUserRoles(auth0UserId) {
  try {
    console.log(`Fetching roles for Auth0 user: ${auth0UserId}`);
    
    // The response from `getRoles` is an object with a `data` property containing the array of roles.
    const response = await management.users.getRoles({ id: auth0UserId });
    const roleNames = response.data.map(role => role.name);
    
    console.log(`Auth0 Management API roles for ${auth0UserId}:`, roleNames);
    return roleNames;
  } catch (error) {
    console.error('Error fetching user roles from Auth0:', error.message);
    
    // If Management API fails, fall back to token roles (if available)
    console.log('Falling back to token-based roles...');
    return null;
  }
}

/**
 * Get user details from Auth0 Management API
 */
async function getAuth0User(auth0UserId) {
  try {
    // The response from `get` is an object with a `data` property containing the user object.
    const response = await management.users.get({ id: auth0UserId });
    return response.data;
  } catch (error) {
    console.error('Error fetching user from Auth0:', error.message);
    return null;
  }
}

/**
 * Get all roles from Auth0 to map names to IDs.
 * Caches the result to avoid repeated API calls.
 */
let rolesCache = null;
async function getRolesMap() {
  if (rolesCache) {
    return rolesCache;
  }
  try {
    console.log('Fetching all roles from Auth0 to create a name-to-ID map...');
    const roles = await management.roles.getAll();
    const map = roles.data.reduce((acc, role) => {
      acc[role.name] = role.id;
      return acc;
    }, {});
    rolesCache = map;
    console.log('Roles map created:', rolesCache);
    return rolesCache;
  } catch (error) {
    console.error('Error fetching roles map from Auth0:', error.message);
    rolesCache = null; // Invalidate cache on error
    throw error;
  }
}

/**
 * Update a user's role in Auth0. This replaces all existing roles with the new one.
 * @param {string} auth0UserId - The Auth0 user ID (e.g., 'auth0|...')
 * @param {string} newRoleName - The name of the new role (e.g., 'student', 'lecturer')
 */
async function updateUserRoleInAuth0(auth0UserId, newRoleName) {
  try {
    console.log(`Updating role for ${auth0UserId} to '${newRoleName}' in Auth0.`);

    const rolesMap = await getRolesMap();
    const newRoleId = rolesMap[newRoleName];

    if (!newRoleId) {
      throw new Error(`Role '${newRoleName}' not found in Auth0.`);
    }

    // Get current roles
    const currentRoles = await management.users.getRoles({ id: auth0UserId });
    const currentRoleIds = currentRoles.data.map(role => role.id);

    // Remove user from all current roles using the correct method
    if (currentRoleIds.length > 0) {
      console.log(`Removing existing roles from user: ${currentRoleIds.join(', ')}`);
      
      try {
        // Correct method: management.users.deleteRoles(params, data)
        await management.users.deleteRoles(
          { id: auth0UserId },
          { roles: currentRoleIds }
        );
        console.log(`  ✓ Removed all existing roles`);
      } catch (removeError) {
        console.error(`  ✗ Failed to remove existing roles:`, removeError.message);
        // Continue anyway - try to assign the new role
      }
    }

    // Assign user to new role
    console.log(`Assigning new role to user: ${newRoleId}`);
    try {
      // Correct method: management.users.assignRoles(params, data)
      await management.users.assignRoles(
        { id: auth0UserId },
        { roles: [newRoleId] }
      );
      console.log(`  ✓ Assigned role ${newRoleId} (${newRoleName})`);
    } catch (assignError) {
      console.error(`  ✗ Failed to assign role ${newRoleId}:`, assignError.message);
      throw assignError;
    }

    console.log(`✅ Successfully updated role for ${auth0UserId} to '${newRoleName}' in Auth0.`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating user role in Auth0 for ${auth0UserId}:`, error.message);
    console.error('Full error details:', error);
    
    // Check if it's an Auth0 configuration issue
    if (error.message && error.message.includes('not a function')) {
      console.error('⚠️ SDK method error - Auth0 SDK version may be incompatible');
    }
    
    throw error;
  }
}

/**
 * Sync user role with authoritative Auth0 data using user's access token
 */
async function syncUserRoleFromAuth0(user, tokenRoles = [], userAccessToken = null) {
  try {
    let rolesFromAuth0 = []; // Initialize as empty array
    console.log(`Attempting to sync role for user: ${user.email} (Auth0 ID: ${user.auth0_id})`);

    // 1. Try to get roles using the M2M Management API (most authoritative)
    try {
      const m2mAuth0Roles = await getUserRoles(user.auth0_id); // This uses the M2M client
      if (m2mAuth0Roles && m2mAuth0Roles.length > 0) {
        rolesFromAuth0 = m2mAuth0Roles;
        console.log(`[Sync] Roles fetched via M2M API for ${user.email}:`, rolesFromAuth0);
      } else {
        console.log(`[Sync] M2M API returned no roles for ${user.email}.`);
      }
    } catch (m2mError) {
      console.warn(`[Sync] Failed to get roles via M2M API for ${user.email}:`, m2mError.message);
      // Continue to try other methods if M2M fails
    }

    // 2. If M2M failed or returned no roles, try with the user's access token (if provided)
    if (rolesFromAuth0.length === 0 && userAccessToken) {
      try {
        const userTokenAuth0Roles = await getUserRolesWithUserToken(user.auth0_id, userAccessToken);
        if (userTokenAuth0Roles && userTokenAuth0Roles.length > 0) {
          rolesFromAuth0 = userTokenAuth0Roles;
          console.log(`[Sync] Roles fetched via user token for ${user.email}:`, rolesFromAuth0);
        } else {
          console.log(`[Sync] User token API returned no roles for ${user.email}.`);
        }
      } catch (userTokenError) {
        console.warn(`[Sync] Failed to get roles via user token for ${user.email}:`, userTokenError.message);
      }
    }

    // 3. As a last resort, use roles from the initial JWT token (if provided and nothing else worked)
    if (rolesFromAuth0.length === 0 && tokenRoles.length > 0) {
      rolesFromAuth0 = tokenRoles;
      console.log(`[Sync] Falling back to JWT token roles for ${user.email}:`, rolesFromAuth0);
    }
    
    // If no roles from Auth0, user stays pending (no default to 'student').
    if (rolesFromAuth0.length === 0) {
      console.log(`[Sync] No roles found for user ${user.email} from any Auth0 source. Leaving role as-is (pending until admin assigns).`);
    }

    // Log the final determined roles from Auth0 sources
    console.log(`[Sync] Final roles retrieved from Auth0 for ${user.email}: ${JSON.stringify(rolesFromAuth0)}`);

    console.log(`Current user role: ${user.role}, Auth0 roles: ${JSON.stringify(rolesFromAuth0)}`);

    // Determine new role only from Auth0 data. No role in Auth0 = null (pending).
    let newRole = null;
    if (rolesFromAuth0.includes('admin')) {
      newRole = 'admin';
    } else if (rolesFromAuth0.includes('lecturer')) {
      newRole = 'lecturer';
    } else if (rolesFromAuth0.includes('student')) {
      newRole = 'student';
    }

    // Log the determined new role
    console.log(`[Sync] Determined new role for ${user.email}: ${newRole}`);

    // Update role when Auth0 has a role. When Auth0 returns no roles, keep existing role if user already had one (e.g. after password change — no need for role-pending again).
    if (newRole !== null) {
      if (user.role !== newRole) {
        console.log(`[Sync] ✅ Updating role for user ${user.email} from ${user.role || 'null'} to ${newRole}`);
        user.role = newRole;
        try {
          await user.save();
          console.log(`[Sync] ✅ Successfully saved new role for ${user.email}. New DB role: ${user.role}`);
        } catch (saveError) {
          console.error(`[Sync] ❌ Error saving user role for ${user.email}:`, saveError);
          throw saveError;
        }
      } else {
        console.log(`[Sync] ✅ Role for user ${user.email} is already correct: ${newRole}`);
      }
    } else if (user.role != null) {
      console.log(`[Sync] Auth0 returned no roles for ${user.email}; keeping existing role: ${user.role}`);
    }

    return newRole !== null ? newRole : user.role;
  } catch (error) {
    console.error(`[Sync] ❌ Critical error during role sync for ${user.email}:`, error);
    return user.role; // Return existing role (or 'student' if just set)
  }
}

/**
 * Update user metadata in Auth0
 * @param {string} auth0UserId - The Auth0 user ID
 * @param {object} metadata - The metadata to update
 */
async function updateAuth0UserMetadata(auth0UserId, metadata) {
  try {
    console.log(`Updating metadata for ${auth0UserId}:`, metadata);

    const response = await management.users.update({ id: auth0UserId }, {
      user_metadata: metadata
    });

    console.log(`✅ Successfully updated metadata for ${auth0UserId}`);
    return response.data;
  } catch (error) {
    console.error(`Error updating user metadata in Auth0 for ${auth0UserId}:`, error.message);
    throw error;
  }
}

/**
 * Update user profile in Auth0 (name, email, etc.)
 * @param {string} auth0UserId - The Auth0 user ID
 * @param {object} profileData - The profile data to update
 */
async function updateAuth0UserProfile(auth0UserId, profileData) {
  try {
    console.log(`Updating profile for ${auth0UserId}:`, profileData);

    const updateData = {};
    if (profileData.name) updateData.name = profileData.name;
    if (profileData.email) updateData.email = profileData.email;
    if (profileData.picture) updateData.picture = profileData.picture;
    if (profileData.nickname) updateData.nickname = profileData.nickname;
    if (profileData.given_name) updateData.given_name = profileData.given_name;

    const response = await management.users.update({ id: auth0UserId }, updateData);

    console.log(`✅ Successfully updated profile for ${auth0UserId}`);
    return response.data;
  } catch (error) {
    console.error(`Error updating user profile in Auth0 for ${auth0UserId}:`, error.message);
    throw error;
  }
}

/**
 * Set a user's password in Auth0 (admin only). Works for database connection users.
 * @param {string} auth0UserId - The Auth0 user ID
 * @param {string} newPassword - The new password (must meet Auth0 password policy)
 */
async function updateAuth0UserPassword(auth0UserId, newPassword) {
  if (!auth0UserId || !newPassword || typeof newPassword !== 'string') {
    throw new Error('Auth0 user ID and new password are required');
  }
  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  try {
    await management.users.update({ id: auth0UserId }, { password: newPassword });
    console.log(`✅ Password updated for Auth0 user ${auth0UserId}`);
  } catch (error) {
    console.error(`Error updating password in Auth0 for ${auth0UserId}:`, error.message);
    throw error;
  }
}

const getAllAuth0Users = async () => {
  const token = await getMgmtToken();
  const domain = process.env.AUTH0_DOMAIN;
  const users = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `https://${domain}/api/v2/users`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        page,
        per_page: 50, // Adjust as needed
        include_totals: true
      }
    });

    users.push(...response.data.users);
    hasMore = response.data.users.length > 0;
    page++;
  }

  return users;
};

module.exports = {
  getMgmtToken,
  deleteAuth0User,
  getUserRoles,
  getUserRolesWithUserToken,
  getAuth0User,
  syncUserRoleFromAuth0,
  updateUserRoleInAuth0,
  updateAuth0UserMetadata,
  updateAuth0UserProfile,
  updateAuth0UserPassword,
  management,
  getAllAuth0Users
};
