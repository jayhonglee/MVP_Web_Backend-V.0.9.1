const express = require("express");
const User = require("../models/user");
const router = new express.Router();

// Create user (Sign up)
router.post("/users", async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    const token = await user.generateAuthToken();

    res.cookie("auth_token", token);
    res.status(201).send({ user, token });
  } catch (e) {
    res.status(400).send(e.message);
  }
});

module.exports = router;
