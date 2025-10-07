const express = require("express");
const Dropin = require("../models/dropin");
const multer = require("multer");
const sharp = require("sharp");
const auth = require("../middleware/auth");
const router = new express.Router();
const User = require("../models/user");

// Create dropin
const upload = multer({
  limits: {
    fileSize: 2000000, // 2MB limit
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(
        new Error("Please upload an image with .jpg, .jpeg, or .png extension")
      );
    }

    cb(undefined, true);
  },
});

router.post(
  "/dropins/create",
  auth,
  upload.single("dropInImage"),
  async (req, res) => {
    try {
      // Extract data from request body
      const { type, title, date, location, address, navigation, description } =
        req.body;

      // Validate required fields
      if (!type || !title || !date || !location || !address || !description) {
        return res.status(400).send({
          message:
            "Missing required fields: type, title, date, location, address, description",
        });
      }

      // Prepare dropin data
      const dropinData = {
        type,
        title,
        date: new Date(date),
        location,
        address,
        navigation: navigation || "",
        description,
        host: req.user._id, // Set host to authenticated user
        attendees: [req.user._id],
        attendeesCount: 1,
        interestTags: [type],
        entryFee: req.body.entryFee || 0,
      };

      // Handle image upload if provided
      if (req.file) {
        try {
          const buffer = await sharp(req.file.buffer)
            .resize({ width: 800, height: 600 })
            .jpeg({ quality: 80 })
            .toBuffer();
          dropinData.dropInImage = buffer;
        } catch (imageError) {
          return res.status(400).send({
            message: "Error processing image: " + imageError.message,
          });
        }
      }

      // Create and save dropin
      const dropin = new Dropin(dropinData);
      await dropin.save();

      req.user.createdDropins.push(dropin._id);
      await req.user.save();

      res.status(201).send({
        message: "Dropin created successfully",
        dropin,
      });
    } catch (e) {
      console.error("Error creating dropin:", e);
      res.status(400).send({
        message: e.message || "Error creating dropin",
      });
    }
  },
  (error, req, res) => {
    if (error) {
      res.status(400).send({ error: error.message });
    }
  }
);

router.get("/dropins/home", async (req, res) => {
  try {
    const currentDate = new Date();

    // Use aggregation pipeline to efficiently get 10 dropins per type
    const result = await Dropin.aggregate([
      // Stage 1: Filter by future dates (uses date index)
      {
        $match: {
          date: { $gte: currentDate },
        },
      },
      // Stage 2: Sort by creation date (newest first)
      {
        $sort: { createdAt: -1 },
      },
      // Stage 3: Group by type and get top 10 from each
      {
        $group: {
          _id: "$type",
          dropins: {
            $push: "$$ROOT",
          },
        },
      },
      // Stage 4: Limit to 10 dropins per type
      {
        $project: {
          type: "$_id",
          dropins: { $slice: ["$dropins", 10] },
        },
      },
      // Stage 5: Lookup host information for all dropins
      {
        $unwind: "$dropins",
      },
      {
        $lookup: {
          from: "users",
          localField: "dropins.host",
          foreignField: "_id",
          as: "hostInfo",
          pipeline: [
            {
              $project: {
                firstName: 1,
                lastName: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      // Stage 6: Lookup attendees information
      {
        $lookup: {
          from: "users",
          localField: "dropins.attendees",
          foreignField: "_id",
          as: "attendeesInfo",
          pipeline: [
            {
              $project: {
                firstName: 1,
                lastName: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      // Stage 7: Unwind host array
      {
        $unwind: "$hostInfo",
      },
      // Stage 8: Group back by type
      {
        $group: {
          _id: "$type",
          dropins: {
            $push: {
              $mergeObjects: [
                "$dropins", // This includes ALL fields including dropInImage
                {
                  host: "$hostInfo",
                  attendees: "$attendeesInfo",
                },
              ],
            },
          },
        },
      },
    ]);

    // Transform to frontend format
    const categories = {};

    // Category emoji mapping
    const categoryEmojis = {
      "Art & Crafting": "🎨",
      "Books & Study": "📚",
      "Club Activities": "🎤",
      "Food & Drinks": "🍽️",
      Gaming: "🎮",
      "Local Chat": "💬",
      Party: "🎉",
      Sports: "⚽",
      "Travel & Outdoor": "🏕️",
    };

    // Process each type group
    const allDropins = [];

    result.forEach((typeGroup) => {
      const transformedDropins = typeGroup.dropins.map((dropin) => {
        const eventDate = new Date(dropin.date);

        return {
          id: dropin._id,
          title: dropin.title,
          category: dropin.type || "General",
          date: eventDate.toISOString().split("T")[0],
          time: eventDate.toTimeString().split(" ")[0].substring(0, 5),
          location: dropin.location,
          host: {
            name: `${dropin.host.firstName} ${dropin.host.lastName}`,
            avatar: dropin.host.avatar
              ? `data:image/png;base64,${dropin.host.avatar.toString("base64")}`
              : null,
          },
          attendees: dropin.attendeesCount || dropin.attendees.length,
          maxAttendees: dropin.maxAttendees,
          description: dropin.description,
          interestTags: dropin.interestTags || [typeGroup._id],
          dropInImage: dropin.dropInImage
            ? `data:image/jpeg;base64,${dropin.dropInImage.toString("base64")}`
            : null,
          attendingPeople: dropin.attendees.slice(0, 5).map((attendee) => ({
            name: `${attendee.firstName} ${attendee.lastName}`,
            avatar: attendee.avatar
              ? `data:image/png;base64,${attendee.avatar.toString("base64")}`
              : null,
          })),
        };
      });

      // Add to "All" category
      allDropins.push(...transformedDropins);

      // Add to specific category
      const categoryKey = `${categoryEmojis[typeGroup._id] || "📋"} ${typeGroup._id}`;
      categories[categoryKey] = transformedDropins;
    });

    // Sort "All" by creation date and limit to 10
    categories["All"] = allDropins
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    res.send(categories);
  } catch (e) {
    console.error("Error retrieving home page data:", e);
    res.status(500).send({
      message: e.message || "Error retrieving home page data",
    });
  }
});

// Get specific dropin by ID
router.get("/dropins/:id", async (req, res) => {
  try {
    const dropin = await Dropin.findById(req.params.id)
      .populate("host", "name email")
      .populate("attendees", "name email");

    if (!dropin) {
      return res.status(404).send({
        message: "Dropin not found",
      });
    }

    res.send({
      message: "Dropin retrieved successfully",
      dropin,
    });
  } catch (e) {
    console.error("Error retrieving dropin:", e);
    res.status(400).send({
      message: e.message || "Error retrieving dropin",
    });
  }
});

router.post("/dropins/:id/join", auth, async (req, res) => {
  try {
    const dropinId = req.params.id;
    const userId = req.user._id;

    // Find the dropin
    const dropin = await Dropin.findById(dropinId);
    if (!dropin) {
      return res.status(404).send({
        message: "Dropin not found",
      });
    }

    // Find the user to check their joinedDropins
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send({
        message: "User not found",
      });
    }

    // Check if user is already in the dropin's attendees list
    const isInAttendees = dropin.attendees.some(
      (attendeeId) => attendeeId.toString() === userId.toString()
    );

    // Check if dropin is already in user's joinedDropins list
    const isInJoinedDropins = user.joinedDropins.some(
      (joinedId) => joinedId.toString() === dropinId.toString()
    );

    // If user is already joined (either in attendees or joinedDropins), return error
    if (isInAttendees || isInJoinedDropins) {
      return res.status(400).send({
        message: "You have already joined this dropin",
      });
    }

    // Check if dropin is in the past
    if (dropin.date < new Date()) {
      return res.status(400).send({
        message: "Cannot join past dropins",
      });
    }

    // Check if user is the host
    if (dropin.host.toString() === userId.toString()) {
      return res.status(400).send({
        message: "Host cannot join their own dropin",
      });
    }

    // Update dropin attendees and increment count
    await Dropin.findByIdAndUpdate(dropinId, {
      $addToSet: { attendees: userId },
      $inc: { attendeesCount: 1 },
    });

    // Update user's joinedDropins
    await User.findByIdAndUpdate(userId, {
      $addToSet: { joinedDropins: dropinId },
    });

    // Get updated dropin with populated data
    const populatedDropin = await Dropin.findById(dropinId)
      .populate("host", "firstName lastName avatar")
      .populate("attendees", "firstName lastName avatar");

    res.send({
      message: "Successfully joined dropin",
      dropin: populatedDropin,
    });
  } catch (e) {
    console.error("Error joining dropin:", e);
    res.status(400).send({
      message: e.message || "Error joining dropin",
    });
  }
});

module.exports = router;
