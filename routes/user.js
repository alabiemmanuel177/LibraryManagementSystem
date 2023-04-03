const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { uploader, destroy } = require("../util/cloudinary");
const multer = require("multer");
const fs = require("fs");
const ProfilePic = require("../models/ProfilePic");

//UPDATE USER
router.put("/:id", async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: req.body,
      },
      { new: true }
    );
    return res.status(200).json(updatedUser);
  } catch (err) {
    return res.status(500).json(err);
  }
});

//DELETE USER
router.delete("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    await user.delete();
    return res.status(200).json("User has been deleted...");
  } catch (err) {
    return res.status(500).json(err);
  }
});

//GET USER
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("profilePic");
    return res.status(200).json(user);
  } catch (err) {
    return res.status(500).json(err);
  }
});

//GET ALL USER
router.get("/", async (req, res) => {
  try {
    let users;
    users = await User.find();
    return res.status(200).json(users);
  } catch (err) {
    return res.status(500).json(err);
  }
});

//PATCH USER
router.patch("/:id", async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, {
      $push: req.body,
    });
    return res.status(200).json(updatedUser);
  } catch (err) {
    return res.status(500).json(err);
  }
});

//CHANGE PASSWORD STUDENT
router.post("/change-password", async (req, res) => {
  const { id, oldPassword, newPassword } = req.body;

  try {
    const user = await User.findOne({ _id: id });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ msg: "Incorrect old password" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();
    res.json({ msg: "Password changed successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
});

/**
 * This should be properly extracted into a utility function
 */

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/png" ||
    file.mimetype === "image/webp" ||
    file.mimetype === "image/jpg"
  ) {
    cb(null, true);
  } else {
    //reject file
    cb({ message: "Unsupported file format" }, false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 },
  fileFilter: fileFilter,
});

// Upload a new profile picture for a user
router.post(
  "/:userId/profilepic",
  upload.single("profilePic"),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const result = await uploader(req, "LMS/profile_pictures");

      // Create a new profile picture document in the database
      const newProfilePic = new ProfilePic({
        fileUrl: result.secure_url,
        fileType: req.file.mimetype,
        fileName: req.file.originalname,
        public_id: result.id,
      });
      await newProfilePic.save();

      // Update the reference to the new profile picture in the user's document
      user.profilePic = newProfilePic._id;
      await user.save();

      res
        .status(200)
        .json({ message: "Profile picture uploaded successfully" });
      fs.unlinkSync(req.file.path);
    } catch (err) {
      fs.unlinkSync(req.file.path);
      console.log(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
