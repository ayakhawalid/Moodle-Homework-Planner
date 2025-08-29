const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  auth0_id: { type: String, unique: true, required: true }, // Auth0 ID
  email: { type: String, required: true, unique: true }, // Email must be unique
  name: { type: String },
  full_name: { type: String }, // Full name
  username: { type: String, unique: true, sparse: true }, // Username (optional, unique when present)
  role: { type: String }, // Role from app_metadata
  picture: { type: String }, // Profile picture
  email_verified: { type: Boolean, default: false }, // Email verification status
  is_active: { type: Boolean, default: true }, // Active status
  last_login: { type: Date }, // Last login date
  metadata: { type: Object, default: {} }, // Additional metadata
  lastSynced: { type: Date }, // Last sync timestamp
}, { timestamps: true }); // Automatically add createdAt and updatedAt fields

module.exports = mongoose.model('User', userSchema);
