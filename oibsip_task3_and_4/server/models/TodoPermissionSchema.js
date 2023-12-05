const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TodoPermissionSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User", // Reference to the User model
  },
  todo: {
    type: Schema.Types.ObjectId,
    ref: "Todo", // Reference to the Todo model
    required: true,
  },
  accessLevel: {
    type: String,
    required: true,
    // You can define an enum for possible values: ["read-only", "edit", "delete"]
  },
});

const TodoPermission = mongoose.model("TodoPermission", TodoPermissionSchema);

module.exports = TodoPermission;
