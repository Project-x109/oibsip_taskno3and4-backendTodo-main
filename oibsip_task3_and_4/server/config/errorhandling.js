// errorHandler.js
const express = require("express");
function errorHandler(err, req, res, next) {
  console.error("Error:", err);

  // Define how to handle different types of errors
  if (err instanceof MyCustomErrorType) {
    // Handle a custom error type
    return res.status(400).json({ error: err.message });
  } else if (err.name === "ValidationError") {
    // Handle Mongoose validation errors
    return res.status(400).json({ error: err.message });
  }

  // Handle other errors with a generic response
  return res.status(500).json({ error: "Internal Server Error" });
}

module.exports = errorHandler;
