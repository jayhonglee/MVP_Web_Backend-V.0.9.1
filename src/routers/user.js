const express = require("express");
const User = require("../models/user");
const router = new express.Router();

// Testing
router.post("/users/test", async (req, res) => {
  try {
    const user = new User({ name: "Jay" });
    await user.save();

    res.status(201).send(user);
  } catch (e) {
    console.error(e);
    res.status(400).send({ error: e.message });
  }
});

module.exports = router;
