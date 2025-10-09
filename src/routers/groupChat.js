const express = require("express");
const GroupChat = require("../models/groupChat");
const auth = require("../middleware/auth");
const router = new express.Router();

// Create a new group chat
router.post("/groupChats", auth, async (req, res) => {
  try {
    // Extract dropinId from request body
    const dropinId = req.body.dropinId;

    // Validate dropinId
    if (!dropinId || typeof dropinId !== "string" || dropinId.trim() === "") {
      return res.status(400).send("Dropin ID is required");
    }

    // Check if a group chat for the same dropin already exists
    const existingGroupChat = await GroupChat.findOne({
      dropin: dropinId,
    });

    if (existingGroupChat) {
      return res
        .status(500)
        .send("A group chat for this dropin already exists.");
    }

    // If no existing group chat, create a new one
    const newGroupChat = new GroupChat({
      members: [req.user._id],
      dropin: dropinId,
    });

    await newGroupChat.save();
    res.status(200).send(newGroupChat);
  } catch (e) {
    console.log("error:", e.message);
    res.status(500).send(e.message);
  }
});

// Get group chats of a user
router.get("/groupChats/me", auth, async (req, res) => {
  try {
    const groupChats = await GroupChat.find({
      members: { $in: [req.user._id] },
    });
    res.status(200).send(groupChats);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

module.exports = router;
