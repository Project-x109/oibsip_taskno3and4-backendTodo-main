const express = require("express");
const passport = require("../config/passport-config");
require("dotenv").config({ path: "./server/config/.env" });
const User = require("../models/User");
const ResetToken = require('../models/ResetToken');
const router = express.Router();
const { logger } = require("../config/logMiddleware"); // Import the logger from your logMiddleware
const { sendForgetPasswordToken } = require("../config/emailMain");
const { emailValidator, validatePassword } = require("../config/functions");
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const secretKey = 'YourSuperSecretKeyHere1234567890';

router.post("/register", async (req, res) => {
  if (!req.csrfToken()) {
    return res.status(403).json({ error: 'CSRF token verification failed' });
  }
  try {
    const { username, password, ConfirmPassword } = req.body;
    // Backend validation: Check if username is a valid email
    if (emailValidator(username)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Backend validation: Check if password and confirmPassword match
    if (password !== ConfirmPassword) {
      return res
        .status(400)
        .json({ error: "Password and confirm password do not match" });
    }

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).json({ error: "Username already taken" });
    }

    const newUser = new User({
      username,
      password,
    });

    await newUser.save();
    logger.info(`User registered with ID: ${newUser._id}`);
    req.login(newUser, (err) => {
      if (err) return res.status(500).json({ error: "Internal Server Error" });
      // Send a success response
      return res
        .status(201)
        .json({ message: "Registration successful", user: newUser });
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
router.post('/resetpassword', async (req, res) => {
  if (!req.csrfToken()) {
    return res.status(403).json({ error: 'CSRF token verification failed' });
  }
  const { username } = req.body;
  const user = await User.findOne({ username });

  if (!user) {
    return res.status(404).json({ error: 'User Not Found' });
  }

  try {
    // Check if a reset token already exists for the user
    let resetToken = await ResetToken.findOne({ userId: user._id });
    if (!resetToken) {
      resetToken = new ResetToken();
      resetToken.userId = user._id;
    }
    resetToken.token = crypto.randomBytes(20).toString('hex');
    resetToken.expirationDate = new Date();
    resetToken.expirationDate.setHours(resetToken.expirationDate.getHours() + 1);
    await resetToken.save();
    sendForgetPasswordToken(user, resetToken.token);
    return res.json({ success: 'Token sent to your email' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.put('/resetpassword/:token', async (req, res) => {
  const { token } = req.params;
  const ConfirmPassword = req.body.ConfirmPassword;
  const password = req.body.password;
  const resetToken = await ResetToken.findOne({ token });

  if (!resetToken) {
    return res.status(404).json({ error: 'Invalid or expired token' });
  }
  if (resetToken.expirationDate < new Date()) {
    return res.status(400).json({ error: 'Token has expired' });
  }
  if (password !== ConfirmPassword) {
    return res.status(400).json({ error: "Password Dont Match" });
  }
  const passwordErrors = validatePassword(password);
  if (passwordErrors.length > 0) {
    return res.status(400).json({ error: passwordErrors });
  }
  // Update the user's password
  const user = await User.findById(resetToken.userId);
  user.password = req.body.password;
  try {
    await user.save();
    await ResetToken.deleteOne({ _id: resetToken._id });

    res.json({ success: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.post("/login", async (req, res, next) => {
  try {
    passport.authenticate("local", async (err, user, info) => {
      if (err) {
        console.error("Error in login authentication:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }
      if (info) {
        return res.status(400).json({ error: info.message });
      }
      req.logIn(user, async (err) => {
        if (err) {
          return res.status(500).json({ error: "Internal Server Error" });
        }
        req.session.user = { username: user.username };
        try {
          const token = jwt.sign(
            { username: user.username, _id: user._id },
            secretKey,
            { expiresIn: '1h' }
          );
          return res.json({ success: "Login successful", username: user.username, id: user._id, token });
        } catch (error) {
          console.error("Error while signing JWT:", error);
          return res.status(500).json({ error: "Failed to sign JWT token" });
        }
      });
    })(req, res, next);
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while logging in" });
  }
});
router.get('/profile', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  // User is authenticated, return user data
  res.json({ username: req.user.username, id: req.user.id });
});
router.get('/logout', (req, res) => {
  // Clear the user's session and logout
  req.logout(function (err) {
    if (err) {
      console.error('Error during logout:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    // Clear the session completely
    req.session.destroy((err) => {
      if (err) {
        console.error('Error clearing session:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      // Redirect to a logout success page or send a response
      res.json({ message: 'Logout successful' });
    });
  });
});

module.exports = router;
