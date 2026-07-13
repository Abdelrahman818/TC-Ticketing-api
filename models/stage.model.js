const mongoose = require('mongoose');

const stageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    key: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
      index: true,
    },
    color: {
      type: String,
      default: '#64748b',
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isFinal: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    visibleToRoles: {
      type: [String],
      default: ['employee', 'supervisor', 'manager', 'controller', 'owner'],
      validate: {
        validator: (roles) => roles.every((role) => ['employee', 'supervisor', 'manager', 'controller', 'owner'].includes(role)),
        message: 'visibleToRoles must contain valid roles',
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Stage', stageSchema);
