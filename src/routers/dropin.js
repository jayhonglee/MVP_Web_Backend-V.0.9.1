const express = require("express");
const Dropin = require("../models/dropin");
const multer = require("multer");
const sharp = require("sharp");
const auth = require("../middleware/auth");
const router = new express.Router();

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

module.exports = router;
