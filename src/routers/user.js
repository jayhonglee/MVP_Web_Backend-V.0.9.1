const express = require("express");
const router = new express.Router();

// Testing
router.post("/users/test", async (req, res) => {
  try {
    res.status(201).send("hello");
  } catch (e) {
    res.status(400).send(e);
    console.log(e);
  }
});

module.exports = router;
