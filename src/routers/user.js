const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const router = new express.Router();

// Sign up
router.post("/users/signup", async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    const token = await user.generateAuthToken();

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.status(201).send({ user, token });
  } catch (e) {
    res.status(400).send({ message: e.message });
  }
});

// Login
router.post("/users/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByCredentials(email, password);
    const token = await user.generateAuthToken();

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.send({ user, token });
  } catch (e) {
    res.status(401).send({ message: e.message });
  }
});

// Verify user (get current user)
router.get("/users/verify", async (req, res) => {
  try {
    const token = req.cookies.auth_token;
    if (!token) {
      throw new Error("No authentication token found");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({
      _id: decoded._id,
      "tokens.token": token,
    });

    if (!user) {
      throw new Error("User not found");
    }

    res.send({ user });
  } catch (e) {
    res.clearCookie("auth_token");
    res.status(401).send({ message: e.message });
  }
});

// Logout
router.post("/users/logout", async (req, res) => {
  try {
    const token = req.cookies.auth_token;
    if (!token) {
      return res.status(200).send(); // Already logged out
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({
      _id: decoded._id,
      "tokens.token": token,
    });

    if (user) {
      // Remove the current token from user's tokens array
      user.tokens = user.tokens.filter((t) => t.token !== token);
      await user.save();
    }

    // Clear the auth cookie
    res.clearCookie("auth_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).send();
  } catch (e) {
    res.status(500).send({ message: e.message });
  }
});

module.exports = router;
