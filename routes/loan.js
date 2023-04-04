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

    if (!req.body.books || req.body.books.length === 0) {
      return res
        .status(400)
        .json({ error: "Please provide at least one book to borrow" });
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

// Route to return books in a loan
router.patch("/:loanId/return", async (req, res) => {
  try {
    const loanId = req.params.loanId;
    const loan = await Loan.findById(loanId).populate("books").populate("user");

    // Check if loan exists
    if (!loan) {
      return res.status(404).json({ message: "Loan not found" });
    }

    const user = await User.findById(loan.user);

    if (!user) {
      return res.status(500).json({ error: "User not found" });
    }

    const returnedBooks = req.body.books; // Array of book IDs

    // Check if all returned books exist in the loan
    const invalidBooks = returnedBooks.filter(
      (id) => !loan.books.some((book) => book._id.toString() === id)
    );
    if (invalidBooks.length > 0) {
      return res
        .status(400)
        .json({ message: "Invalid book IDs in returnedBooks" });
    }

    // Update returned books array and available/borrowed copies of books
    const returnedBookIds = loan.returnedBooks.map((book) =>
      book._id.toString()
    );
    returnedBooks.forEach((bookId) => {
      if (!returnedBookIds.includes(bookId)) {
        const book = loan.books.find((b) => b._id.toString() === bookId);
        book.availableCopies++;
        book.borrowedCopies--;
        loan.returnedBooks.push(book);
      }
    });

    // Update loan status
    if (loan.returnedBooks.length === loan.books.length) {
      loan.status = "returned";
    } else {
      loan.status = "partially-returned";
    }

    // Save changes
    await Promise.all([loan.save(), ...loan.books.map((book) => book.save())]);
    user.activeLoan = null;
    await user.save();
    return res
      .status(200)
      .json({ message: "Books returned successfully", loan });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.put("/:loanId/partially-return", async (req, res) => {
  const { loanId } = req.params;
  const bookIds = req.body.books;

  try {
    const loan = await Loan.findById(loanId).populate("user").populate("books");
    const books = await Book.find({ _id: { $in: bookIds } });

    // Check if loan status is "partially-returned"
    if (loan.status !== "partially-returned") {
      return res
        .status(400)
        .json({ message: 'Loan status is not "partially-returned"' });
    }

    // Update returnedBooks array in loan document
    loan.returnedBooks.push(...bookIds);

    // Check if all books have been returned
    if (loan.returnedBooks.length === loan.books.length) {
      loan.status = "returned";
    }

    // Update loan document
    await loan.save();

    // Update availableCopies and borrowedCopies fields in Book document for each book that has been returned
    for (const book of books) {
      book.availableCopies++;
      book.borrowedCopies--;
      await book.save();
    }

    // Update activeLoan and borrowedBooks arrays in User document
    const user = loan.user;
    user.activeLoan = null;
    user.borrowedBooks.push(...bookIds);
    await user.save();

    res.status(200).json({ message: "Books returned successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
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
