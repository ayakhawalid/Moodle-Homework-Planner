import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Grid
} from '@mui/material';
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import DashboardLayout from '../../Components/DashboardLayout';

// Mock user data
const mockUsers = [
  { id: 1, name: 'John Doe', email: 'john@email.com', role: 'student', status: 'active', joinDate: '2024-01-15' },
  { id: 2, name: 'Jane Smith', email: 'jane@email.com', role: 'lecturer', status: 'active', joinDate: '2024-01-10' },
  { id: 3, name: 'Bob Johnson', email: 'bob@email.com', role: 'student', status: 'inactive', joinDate: '2024-01-20' },
  { id: 4, name: 'Alice Brown', email: 'alice@email.com', role: 'lecturer', status: 'active', joinDate: '2024-01-05' },
  { id: 5, name: 'Charlie Wilson', email: 'charlie@email.com', role: 'admin', status: 'active', joinDate: '2024-01-01' },
];

const UserManagement = () => {
  const [users, setUsers] = useState(mockUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return '#f44336';
      case 'lecturer': return '#ff9800';
      case 'student': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  const getStatusColor = (status) => {
    return status === 'active' ? '#4caf50' : '#f44336';
  };

  return (
    <DashboardLayout userRole="admin">
      <Box p={3}>
        <Box mb={3}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#333' }}>
            User Management
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Manage all users in the system
          </Typography>
        </Box>

        {/* Controls */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              select
              label="Filter by Role"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              SelectProps={{
                native: true,
              }}
            >
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="lecturer">Lecturers</option>
              <option value="admin">Admins</option>
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddIcon />}
              sx={{ height: '56px', backgroundColor: '#1976d2' }}
            >
              Add User
            </Button>
          </Grid>
        </Grid>

        {/* Users Table */}
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 3 }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Join Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Typography variant="body1" fontWeight="medium">
                      {user.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      sx={{
                        backgroundColor: getRoleColor(user.role),
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      sx={{
                        backgroundColor: getStatusColor(user.status),
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{user.joinDate}</TableCell>
                  <TableCell>
                    <IconButton size="small" sx={{ color: '#1976d2', mr: 1 }}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" sx={{ color: '#f44336' }}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredUsers.length === 0 && (
          <Box textAlign="center" py={4}>
            <Typography variant="h6" color="textSecondary">
              No users found matching your criteria
            </Typography>
          </Box>
        )}
      </Box>
    </DashboardLayout>
  );
};

export default UserManagement;
