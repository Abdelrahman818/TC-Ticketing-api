const mongoose = require('mongoose');

const historySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
    },
    fromStatusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stage',
      default: null,
    },
    toStatusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stage',
      default: null,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: Number,
      unique: true,
      sparse: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assignedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    assignedDepartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true,
    },
    statusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stage',
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    type: {
      type: String,
      default: 'task',
      trim: true,
    },
    dueDate: {
      type: Date,
      default: null,
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    history: [historySchema],
  },
  {
    timestamps: true,
  }
);

ticketSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Ticket', ticketSchema);
