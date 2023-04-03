const express = require("express");
const { default: mongoose } = require("mongoose");
const Book = require("../models/Book");
const Loan = require("../models/Loan");
const router = express.Router();
const User = require("../models/User");

// Route to create a new request
router.post("/", async (req, res) => {
  try {
    const user = await User.findById(req.body.user);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.activeLoan) {
      return res.status(400).json({ error: "User already has an active loan" });
    }

    if (user.borrowedBooks.length + req.body.books.length > 5) {
      return res
        .status(400)
        .json({ error: "User can only borrow a maximum of 5 books" });
    }

    const loanedBooks = await Promise.all(
      req.body.books.map(async (bookId) => {
        const book = await Book.findById(bookId);

        if (!book) {
          throw new Error("Book not found");
        }

        if (book.availableCopies <= 0) {
          throw new Error(`Book ${book.title} is currently unavailable`);
        }

        book.availableCopies--;
        book.borrowedCopies++;
        book.borrowers.push(user._id);
        await book.save();

        return book;
      })
    );

    const newLoan = new Loan({
      user: user,
      books: loanedBooks.map((book) => book._id),
      loanDate: req.body.loanDate,
      returnDate: req.body.returnDate,
    });

    const savedLoan = await newLoan.save();

    user.activeLoan = savedLoan._id;
    user.borrowedBooks.push(...savedLoan.books);
    await user.save();

    res.status(201).json(savedLoan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating loan" });
  }
});

// Approves a loan. This is a PATCH request to / api / v1 / loans /
router.patch("/:id/approve", async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    if (loan.status !== "pending") {
      return res.status(400).json({ error: "Loan has already been processed" });
    }

    loan.status = "approved";
    await loan.save();

    res.json(loan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error approving loan" });
  }
});

// Denies a loan. This is a PATCH request to / api / v1 / loans /
router.patch("/:id/deny", async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    if (loan.status !== "pending") {
      return res.status(400).json({ error: "Loan has already been processed" });
    }

    const user = await User.findById(loan.user);

    if (!user) {
      return res.status(500).json({ error: "Error denying loan" });
    }

    loan.status = "denied";
    await loan.save();

    user.activeLoan = null;
    user.borrowedBooks = [];
    await user.save();

    const returnedBooks = await Promise.all(
      loan.books.map(async (bookId) => {
        const book = await Book.findById(bookId);

        if (!book) {
          throw new Error("Book not found");
        }

        book.availableCopies++;
        book.borrowedCopies--;
        book.borrowers = book.borrowers.filter(
          (borrowerId) => borrowerId.toString() !== user._id.toString()
        );
        await book.save();

        return book;
      })
    );

    res.json({ loan, returnedBooks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error denying loan" });
  }
});

// Route to return books borrowed
router.patch("/:id/return", async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    if (loan.status !== "approved") {
      return res.status(400).json({ error: "Loan has not been approved" });
    }

    const user = await User.findById(loan.user);

    if (!user) {
      return res.status(500).json({ error: "Error returning book" });
    }

    const returnedBooks = req.body.books;

    if (!returnedBooks || returnedBooks.length === 0) {
      return res
        .status(400)
        .json({ error: "Please provide at least one book to return" });
    }

    if (returnedBooks.length > loan.books.length) {
      return res
        .status(400)
        .json({ error: "Cannot return more books than borrowed" });
    }

    const booksToUpdate = await Promise.all(
      returnedBooks.map(async (bookId) => {
        const book = await Book.findById(bookId);

        if (!book) {
          throw new Error("Book not found");
        }

        if (!loan.books.includes(bookId)) {
          throw new Error("Book not part of loan");
        }

        if (book.borrowers.length === 0) {
          throw new Error("Book not borrowed");
        }

        book.availableCopies++;
        book.borrowedCopies--;
        book.borrowers = book.borrowers.filter(
          (borrowerId) => borrowerId.toString() !== user._id.toString()
        );
        await book.save();

        return book;
      })
    );

    const isLoanFullyReturned = returnedBooks.length === loan.books.length;

    if (isLoanFullyReturned) {
      loan.status = "returned";
      user.activeLoan = null;
      user.borrowedBooks = [];
    } else {
      loan.status = "partially returned";
    }

    await loan.save();
    await user.save();

    res.json({ loan, returnedBooks: booksToUpdate });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error returning book" });
  }
});

//DELETE REQUEST
router.delete("/:id", async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    await loan.delete();
    return res.status(200).json("Loan has been deleted...");
  } catch (err) {
    return res.status(500).json(err);
  }
});

//GET REQUEST
router.get("/:id", async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate({
        path: "user",
        populate: { path: "profilePic", model: "ProfilePic" },
      })
      .populate("books")
      .exec();
    return res.status(200).json(loan);
  } catch (err) {
    return res.status(500).json(err);
  }
});

//GET ALL REQUEST
router.get("/", async (req, res) => {
  try {
    let loans;
    loans = await Loan.find()
      .populate({
        path: "user",
        populate: { path: "profilePic", model: "ProfilePic" },
      })
      .populate("books")
      .exec();
    return res.status(200).json(loans);
  } catch (err) {
    return res.status(500).json(err);
  }
});

module.exports = router;
