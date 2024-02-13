const express = require("express");
const Todo = require("../models/Todo");
const User = require("../models/User");
const TodoPermission = require("../models/TodoPermissionSchema"); // Ensure the User model is correctly defined
const router = express.Router();
const { ObjectId } = require('mongodb');
const sendEmailNotification = require("../config/emailMain");
router.get("/todos", (req, res) => {
  try {
    Todo.aggregate([
      {
        $match: {
          $or: [
            { user: new ObjectId(req.user._id) }, // Todos created by the user
            { sharedWith: new ObjectId(req.user._id) }, // Todos shared with the user
          ],
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "sharedWith",
          foreignField: "_id",
          as: "sharedUsers",
        },
      },
      {
        $project: {
          text: 1,
          complete: 1,
          priority: 1,
          dueDate: 1,
          labels: 1,
          tags: 1,
          user: 1,
          sharedUsers: { username: 1 }, // Select the username from sharedUsers
        },
      },
    ])
      .then((todos) => {
        res.json(todos);
      })
      .catch((err) => {
        console.error("Error while fetching todos:", err);
        res.status(500).json({ error: "Internal Server Error" });
      });
  } catch (err) {
    res.status(401).json({ error: "Unauthorized" });
  }
});
router.post("/todos/new", async (req, res) => {
  try {
    const { text, priority, dueDate, labels, sharedWith, tags } = req.body;
    const sharedWithUsernames = req.body.sharedWith;

    if (text === '') {
      return res.status(400).json({ error: "You Need To Enter The Task Before Saving" });
    }
    if (priority === '') {
      return res.status(400).json({ error: "You Need To Enter The Priority Before Saving" });
    }
    if (dueDate === '') {
      return res.status(400).json({ error: "You Need To Enter The DueDate Before Saving" });
    }
    try {
      const findUserByUsername = async (username) => {
        return await User.findOne({ username });
      };
      const sharedWithUserIds = await Promise.all(
        sharedWithUsernames.map(async (username) => {
          const user = await findUserByUsername(username);
          if (user) {
            return user._id; // Use the user's ID
          } else {
            res.status(404).json({ error: username + " Not Found" });
            return
          }
        })
      );
      if (sharedWithUserIds.some(id => id === undefined)) {
        return;
      }
      const newTodo = new Todo({
        text: req.body.text,
        priority: req.body.priority,
        dueDate: dueDate,
        labels: req.body.labels,
        sharedWith: sharedWithUserIds, // Pass user IDs
        tags: req.body.tags,
        user: new ObjectId(req.user._id),
      });
      const permissions = sharedWithUserIds.map((userId) => ({
        user: userId,
        todo: newTodo._id,
        accessLevel: "edit",
      }));
      permissions.push({
        user: req.user._id,
        todo: newTodo._id,
        accessLevel: "full",
      });
      const [savedTodo, savedPermissions] = await Promise.all([
        newTodo.save(),
        TodoPermission.insertMany(permissions),
      ]);

      const sharedUsers = await User.find({ _id: { $in: sharedWithUserIds } });
      const sharedUsersResponse = sharedUsers.map((user) => ({
        username: user.username,
      }));

      const responseTodo = {
        text: savedTodo.text,
        priority: savedTodo.priority,
        dueDate: savedTodo.dueDate,
        labels: savedTodo.labels,
        tags: savedTodo.tags,
        user: savedTodo.user,
        sharedUsers: sharedUsersResponse, // Use the mapped shared users' data
        _id: savedTodo._id
      }
      // sendEmailNotification(sharedWithUsernames, req.body.text);
      res.json({ message: "New To do Added successfully", todo: responseTodo });
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  } catch (err) {
    res.status(401).json({ error: "Unauthorized" });
  }
});
async function userHasDeletePermission(user, todo) {
  const userId = new ObjectId(user._id);
  const todoUserId = new ObjectId(todo.user);
  if (userId.equals(todoUserId)) {
    return true;
  }
  const permission = await TodoPermission.findOne({
    user: userId,
    todo: todo._id,
    accessLevel: "delete",
  });
  return !!permission; // Return true if permission exists
}
router.delete("/todos/delete/:id", async (req, res) => {
  try {
    try {
      const todo = await Todo.findOneAndDelete({ _id: req.params.id });

      if (!todo) {
        return res.status(404).json({ error: "Todo not found" });
      }

      const hasDeletePermission = await userHasDeletePermission(req.user, todo);

      if (hasDeletePermission) {
        res.json({ message: "Todo Deleted Successfully", todo });
      } else {
        res.status(403).json({
          error: "Forbidden: You don't have delete permission for this todo",
        });
      }
    } catch (err) {
      console.error("Error while deleting todo:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  } catch (err) {
    res.status(401).json({ error: "You cant delete this todo" });
  }
});
router.put("/todos/update/:id", async (req, res) => {
  try {
    const todoId = req.params.id;
    const userId = new Object(req.user._id);
    try {
      const todoPermission = await TodoPermission.findOne({ user: userId, todo: todoId });

      if (!todoPermission) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (todoPermission.accessLevel !== "edit" && todoPermission.accessLevel !== "full") {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const todo = await Todo.findById(todoId);
      if (!todo) {
        return res.status(404).json({ error: "Todo not found" });
      }

      // Update the 'complete' property
      todo.complete = !todo.complete;

      const updatedTodo = await todo.save();

      return res.json({ message: "Todo status has been updated", todo: updatedTodo });
    } catch (err) {
      console.error("Error while updating todo status:", err);
      return res.status(500).json({ error: "Internal Server Eror" });
    }
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
});
router.put("/todos/updatetext/:id", (req, res) => {
  try {
    const todoId = req.params.id;
    const userId = req.user._id;
    const newText = req.body.text;

    // Find the relevant TodoPermission document
    TodoPermission.findOne({ user: userId, todo: todoId })
      .then((todoPermission) => {
        if (!todoPermission) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        // Check if the user has "edit" access
        if (todoPermission.accessLevel !== "edit") {
          return res.status(401).json({ error: "Unauthorized" });
        }

        // Find and update the corresponding Todo
        return Todo.findById(todoId);
      })
      .then((todo) => {
        if (!todo) {
          return res.status(404).json({ error: "Todo not found" });
        }

        // Update the 'text' property with the new value
        todo.text = newText;

        return todo.save();
      })
      .then((updatedTodo) => {
        res.json(updatedTodo);
      })
      .catch((err) => {
        res.status(500).json({ error: "Internal Server Error" });
      });
  } catch (err) {
    res.status(401).json({ error: "Unauthorized" });
  }
});
module.exports = router;
