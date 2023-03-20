const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    address: {
      type: String,
      required: true,
    },
    dob: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    sex: {
      type: String,
      enum: ["male", "female"],
      required: true,
    },
    userType: {
      type: String,
      enum: ["student", "non-student", "admin"],
      required: true,
    },
    matricNo: {
      type: String,
      unique: true,
      sparse: true,
    },
    phoneNo: {
      type: String,
      required: true,
    },
    profilePic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProfilePic",
      // required: true,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
