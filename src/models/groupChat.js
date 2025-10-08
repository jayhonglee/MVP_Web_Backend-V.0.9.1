const mongoose = require("mongoose");

const groupChatSchema = new mongoose.Schema(
  {
    members: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      trim: true,
      required: true,
    },
    dropin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dropin",
      trim: true,
      required: true,
    },
  },
  { timestamps: true }
);

// groupChatSchema.pre("deleteOne", { document: true }, async function (next) {
//     const groupChat = this;
//     await Message.deleteMany({ groupChat: groupChat._id });
//     next();
// });

const GroupChat = mongoose.model("GroupChat", groupChatSchema);

module.exports = GroupChat;
