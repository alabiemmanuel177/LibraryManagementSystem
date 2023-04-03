const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// User registration route
router.post("/register", async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      userType,
      matricNo,
      phoneNo,
      address,
      sex,
      dob,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const saltRounds = 10; // Use 10 rounds of salt
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      userType,
      matricNo,
      phoneNo,
      dob,
      sex,
      address,
      borrowedBooks: [],
      activeLoan: null,
    });

    // Save user to database
    const savedUser = await newUser.save();

    // Return user information
    res.status(201).json({ user: savedUser });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

// non-student login route
router.post("/non-student/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if password is correct
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Create and sign JWT
    const token = jwt.sign(
      { userId: user._id, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Return token and user information
    res.status(200).json({
      token,
      user: user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

// student login route
router.post("/student/login", async (req, res) => {
  try {
    const { matricNo, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ matricNo });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if password is correct
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Create and sign JWT
    const token = jwt.sign(
      { userId: user._id, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Return token and user information
    res.status(200).json({
      token,
      user: user,
    });
  } catch (error) {
    res.status(500).json({ message: error });
  }
});
// Admin login route
router.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if admin exists
    const admin = await User.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if password is correct
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Create and sign JWT
    const token = jwt.sign(
      { userId: admin._id, userType: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Return token and admin information
    res.status(200).json({ token, admin: admin });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;
