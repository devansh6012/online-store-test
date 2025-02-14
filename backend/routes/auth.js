// routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/database");
const authMiddleware = require("../middleware/auth");

// Register new user
router.post("/register", async (req, res) => {
  const { email, password, first_name, last_name } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Please provide all required fields" });
    }

    // Check if user already exists
    const [existingUser] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const [result] = await db.query(
      "INSERT INTO users (email, password, first_name, last_name) VALUES (?, ?, ?, ?)",
      [email, hashedPassword, first_name, last_name]
    );

    // Generate JWT token
    const token = jwt.sign(
      { id: result.insertId, email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      token,
      user: {
        id: result.insertId,
        email,
        first_name,
        last_name,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error registering user" });
  }
});

// Login user
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Please provide email and password" });
    }

    // Check if user exists
    const [users] = await db.query(
      "SELECT id, email, password, first_name, last_name, role FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const user = users[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Remove password from response
    delete user.password;

    res.json({
      token,
      user,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error logging in" });
  }
});

// Get current user
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = ?",
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(users[0]);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error fetching user" });
  }
});

// Update user profile
router.put("/profile", authMiddleware, async (req, res) => {
  const { first_name, last_name, current_password, new_password } = req.body;

  try {
    let updateFields = [];
    let updateValues = [];

    if (first_name) {
      updateFields.push("first_name = ?");
      updateValues.push(first_name);
    }
    if (last_name) {
      updateFields.push("last_name = ?");
      updateValues.push(last_name);
    }

    // If user wants to update password
    if (current_password && new_password) {
      // Get current user with password
      const [users] = await db.query(
        "SELECT password FROM users WHERE id = ?",
        [req.user.id]
      );

      // Verify current password
      const isMatch = await bcrypt.compare(current_password, users[0].password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(new_password, salt);

      updateFields.push("password = ?");
      updateValues.push(hashedPassword);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    // Add user id to values array
    updateValues.push(req.user.id);

    // Update user
    await db.query(
      `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues
    );

    // Get updated user
    const [updatedUser] = await db.query(
      "SELECT id, email, first_name, last_name, created_at FROM users WHERE id = ?",
      [req.user.id]
    );

    res.json(updatedUser[0]);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error updating profile" });
  }
});

// Delete account
router.delete("/account", authMiddleware, async (req, res) => {
  try {
    // Check for existing orders
    const [orders] = await db.query(
      "SELECT COUNT(*) as count FROM orders WHERE user_id = ?",
      [req.user.id]
    );

    if (orders[0].count > 0) {
      return res.status(400).json({
        message:
          "Cannot delete account with existing orders. Please contact support.",
      });
    }

    // Delete user
    await db.query("DELETE FROM users WHERE id = ?", [req.user.id]);

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error deleting account" });
  }
});

module.exports = router;
