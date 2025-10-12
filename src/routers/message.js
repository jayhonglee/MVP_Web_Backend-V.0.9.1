const express = require("express");
const Message = require("../models/message");
const GroupChat = require("../models/groupChat");
const auth = require("../middleware/auth");
const router = new express.Router();

// Create a new message
router.post("/messages", auth, async (req, res) => {
  const { groupChat, text } = req.body;

  try {
    const existingGroupChat = await GroupChat.findById(groupChat);
    if (!existingGroupChat) {
      return res.status(404).send(groupChat + "Group chat not found.");
    }

    if (!existingGroupChat.members.includes(req.user._id)) {
      return res.status(403).send("You are not a member of this group chat.");
    }

    const message = new Message({
      groupChat,
      sender: req.user._id,
      text,
    });

    await message.save();
    res.status(200).send(message);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// Read messages
router.get("/messages/:id", auth, async (req, res) => {
  try {
    // Find the group chat
    const groupChat = await GroupChat.findById(req.params.id);

    // Check if the group chat exists
    if (!groupChat) {
      return res.status(404).send("Group chat not found.");
    }

    // Check if the authenticated user is a member of the group chat
    if (!groupChat.members.includes(req.user._id)) {
      return res.status(403).send("You are not a member of this group chat.");
    }

    // Find messages for the specified group chat
    const messages = await Message.find({
      groupChat: req.params.id,
    });

    res.status(200).send(messages);
  } catch (e) {
    res.status(500).send(e);
  }
});

module.exports = router;
