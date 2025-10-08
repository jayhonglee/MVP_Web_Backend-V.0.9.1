const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    groupChat: {
      type: mongoose.Schema.Types.ObjectId,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
    },
    text: {
      type: String,
    },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
