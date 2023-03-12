const mongoose = require("mongoose");

const BookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    author: {
      type: String,
      required: true,
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

const Book = mongoose.model("Book", BookSchema);

module.exports = Book;
