const express = require("express");
const User = require("../models/user");
const multer = require("multer");
const sharp = require("sharp");
const auth = require("../middleware/auth");
const Dropin = require("../models/dropin");
const router = new express.Router();

// Sign up
router.post("/users/signup", async (req, res) => {
  const user = new User(req.body);

  try {
    await user.save();
    const token = await user.generateAuthToken();

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.status(201).send({ user, token });
  } catch (e) {
    res.status(400).send({ message: e.message });
  }
});

// Login
router.post("/users/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByCredentials(email, password);
    const token = await user.generateAuthToken();

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.send({ user, token });
  } catch (e) {
    res.status(401).send({ message: e.message });
  }
});

// Verify user (get current user)
router.get("/users/verify", auth, async (req, res) => {
  try {
    res.send({ user: req.user });
  } catch (e) {
    res.clearCookie("auth_token");
    res.status(401).send({ message: e.message });
  }
});

// Logout
router.post("/users/logout", auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter(
      (token) => token.token !== req.token
    );
    await req.user.save();

    // Clear the auth cookie
    res.clearCookie("auth_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    });

    res.status(200).send();
  } catch (e) {
    res.status(500).send({ message: e.message });
  }
});

// // Get user by id
// router.get("/users/:id", async (req, res) => {
//   try {
//     const user = await User.findById(req.params.id);
//     res.send(user);
//   } catch (e) {
//     res.status(404).send({ message: e.message });
//   }
// });

// Update user (Update profile)
router.patch("/users/me", auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = [
    "firstName",
    "lastName",
    "gender",
    "dateOfBirth",
    "address",
    "introduction",
    "interests",
  ];
  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update)
  );

  if (!isValidOperation) {
    return res.status(400).send({ error: "Invalid update." });
  }

  try {
    updates.forEach((update) => {
      req.user[update] = req.body[update];
    });
    await req.user.save();
    res.send(req.user);
  } catch (e) {
    res.status(400).send(e.message);
  }
});

const upload = multer({
  limits: {
    fileSize: 2000000,
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

// Upload avatar (upload profile picture)
router.post(
  "/users/me/avatar",
  auth,
  upload.single("avatar"),
  async (req, res) => {
    const buffer = await sharp(req.file.buffer)
      .resize({ width: 250, height: 250 })
      .png()
      .toBuffer();
    req.user.avatar = buffer;
    await req.user.save();
    res.send({ user: req.user, message: "Avatar updated successfully" });
  },
  (error, req, res) => {
    res.status(400).send({ error: error.message });
  }
);

// Read avatar (Read profile picture)
router.get("/users/:id/avatar", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user || !user.avatar) {
      throw new Error("Either user or the profile picture does not exist");
    }

    res.set("Content-Type", "image/png");
    res.send(user.avatar);
  } catch (e) {
    res.status(404).send(e.message);
  }
});

router.get("/users/me/createdDropins", auth, async (req, res) => {
  try {
    const createdDropins = await req.user.createdDropins;
    const dropinsData = await Dropin.find({ _id: { $in: createdDropins } });
    res.send(dropinsData);
  } catch (e) {
    res.status(400).send(e.message);
  }
});

router.get("/users/me/joinedDropins", auth, async (req, res) => {
  try {
    const joinedDropins = await req.user.joinedDropins;
    const dropinsData = await Dropin.find({ _id: { $in: joinedDropins } });
    res.send(dropinsData);
  } catch (e) {
    res.status(400).send(e.message);
  }
});

module.exports = router;
