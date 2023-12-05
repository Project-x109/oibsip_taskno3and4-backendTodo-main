const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TodoSchema = new Schema({
  text: {
    type: String,
    required: true,
  },
  complete: {
    type: Boolean,
    default: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  priority: {
    type: String, // Add a field for priority (e.g., high, medium, low)
    required: true,
  },
  dueDate: {
    type: Date, // Add a field for due date
  },
  labels: {
    type: [String], // Add an array field for labels or categories
  },
  sharedWith: {
    type: [Schema.Types.ObjectId], // Add a field for shared users
    ref: "User",
  },
  tags: {
    type: [String], // Add an array field for tags or keywords
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const Todo = mongoose.model("Todo", TodoSchema);

module.exports = Todo;
