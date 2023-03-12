const mongoose = require("mongoose");

const RequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    author: {
      type: String,
      required: true,
      unique: true,
    },
    year: {
      type: Number,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    publisher: {
      type: String,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      unique: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["on-shelf", "off-shelf"],
      default: "on-shelf",
    },
  },
  { timestamps: true }
);

const Book = mongoose.model("Book", RequestSchema);

module.exports = Book;
