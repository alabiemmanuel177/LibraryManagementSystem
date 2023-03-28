const express = require("express");
const router = express.Router();
const Request = require("../models/request");

// Route to create a new request
router.post("/requests", async (req, res, next) => {
  try {
    const user = req.user;
    const { books, loanDate, returnDate } = req.body;

    const request = new Request({
      user: user._id,
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

router.put("/requests/:id/approve", async (req, res, next) => {
  try {
    const requestId = req.params.id;
    const request = await Request.findById(requestId).populate("books");

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

    const bookIds = request.books.map((book) => book._id);
    const books = await Book.find({ _id: { $in: bookIds } });

    books.forEach(async (book) => {
      if (book.copies <= 0) {
        const error = new Error("Not enough copies available");
        error.statusCode = 400;
        throw error;
      }

      book.copies -= 1;
      await book.save();
    });

    request.status = "approved";
    await request.save();

    res.status(200).json({
      message: "Request approved successfully",
      request,
    });
  } catch (err) {
    next(err);
  }
});

router.put("/requests/:id/decline", async (req, res, next) => {
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

router.put("/requests/:id/return", async (req, res, next) => {
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

module.exports = router;
