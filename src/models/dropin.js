const mongoose = require("mongoose");

const dropinSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    navigation: {
      type: String,
      trim: true,
    },
    dropInImage: {
      type: Buffer,
    },
    entryFee: {
      type: Number,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    attendees: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      trim: true,
    },
    attendeesCount: {
      type: Number,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    interestTags: {
      type: [String],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Dropin = mongoose.model("Dropin", dropinSchema);

module.exports = Dropin;
