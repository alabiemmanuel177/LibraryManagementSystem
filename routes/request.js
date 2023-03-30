const express = require("express");
const { default: mongoose } = require("mongoose");
const Book = require("../models/Book");
const router = express.Router();
const Request = require("../models/Request");

// Route to create a new request
router.post("/", async (req, res, next) => {
  try {
    const { books, loanDate, returnDate, user } = req.body;

    const request = new Request({
      user,
      books,
      loanDate,
      returnDate,
    });

    await request.save();

    res.status(201).json({
      message: "Request created successfully",
      request,
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/approve", async (req, res, next) => {
  try {
    const requestId = req.params.id;
    const request = await Request.findById(requestId);

    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request status is not pending" });
    }

    // update the copies of each book in the request
    for (const bookId of request.books) {
      const book = await Book.findById(bookId);
      book.copies -= 1;
      await book.save();
    }

    request.status = "approved";
    await request.save();

    return res.json({ message: "Request approved" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id/decline", async (req, res, next) => {
  try {
    const requestId = req.params.id;
    const request = await Request.findById(requestId);

    if (!request) {
      const error = new Error("Request not found");
      error.statusCode = 404;
      throw error;
    }

    if (request.status !== "pending") {
      const error = new Error("Request has already been processed");
      error.statusCode = 400;
      throw error;
    }

    request.status = "declined";
    await request.save();

    res.status(200).json({
      message: "Request declined successfully",
      request,
    });
  } catch (err) {
    next(err);
  }
});

router.put("/:id/return", async (req, res, next) => {
  try {
    const requestId = req.params.id;
    const request = await Request.findById(requestId).populate("books");

    if (!request) {
      const error = new Error("Request not found");
      error.statusCode = 404;
      throw error;
    }

    if (request.status !== "approved") {
      const error = new Error("Request has not been approved yet");
      error.statusCode = 400;
      throw error;
    }

    const returnedBooks = req.body.books;

    if (returnedBooks.length !== request.books.length) {
      const error = new Error(
        "Number of books returned does not match the number of books borrowed"
      );
      error.statusCode = 400;
      throw error;
    }

    for (let i = 0; i < request.books.length; i++) {
      const book = request.books[i];
      if (!returnedBooks.includes(book._id.toString())) {
        const error = new Error("All borrowed books must be returned");
        error.statusCode = 400;
        throw error;
      }
      book.copies += 1;
      await book.save();
    }

    request.status = "returned";
    await request.save();

    res.status(200).json({
      message: "Books returned successfully",
      request,
    });
  } catch (err) {
    next(err);
  }
});

//DELETE REQUEST
router.delete("/:id", async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    await request.delete();
    return res.status(200).json("Request has been deleted...");
  } catch (err) {
    return res.status(500).json(err);
  }
});

//GET REQUEST
router.get("/:id", async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate({
        path: "user",
        populate: { path: "profilePic", model: "ProfilePic" },
      })
      .populate("books")
      .exec();
    return res.status(200).json(request);
  } catch (err) {
    return res.status(500).json(err);
  }
});

//GET ALL REQUEST
router.get("/", async (req, res) => {
  try {
    let requests;
    requests = await Request.find()
      .populate({
        path: "user",
        populate: { path: "profilePic", model: "ProfilePic" },
      })
      .populate("books")
      .exec();
    return res.status(200).json(requests);
  } catch (err) {
    return res.status(500).json(err);
  }
});

module.exports = router;
