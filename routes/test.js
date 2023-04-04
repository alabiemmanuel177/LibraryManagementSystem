// Route to return books borrowed
router.patch("/:id/return", async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    if (loan.status == "approved") {
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
        loan.status = "partially-returned";
      }

      await loan.save();
      await user.save();
    } else if (loan.status === "partially-returned") {
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

      const booksToUpdate = [];

      for (const bookId of returnedBooks) {
        const book = loan.books.find((book) => book._id.toString() === bookId);

        if (!book) {
          return res.status(400).json({ error: "Book not part of loan" });
        }

        if (book.availableCopies >= book.totalCopies) {
          return res
            .status(400)
            .json({ error: "Book has already been returned" });
        }

        book.availableCopies++;
        book.borrowedCopies--;
        book.borrowers = book.borrowers.filter(
          (borrowerId) => borrowerId.toString() !== loan.user.toString()
        );
        booksToUpdate.push(book);
      }

      const remainingBooks = loan.books.filter(
        (book) => book.availableCopies < book.totalCopies
      );

      if (remainingBooks.length === 0) {
        loan.status = "returned";
        loan.status = "returned";
        user.activeLoan = null;
        user.borrowedBooks = [];
      }

      await Promise.all(booksToUpdate.map((book) => book.save()));
      await loan.save();

      res.json({ loan, returnedBooks: booksToUpdate });
    } else {
      return res
        .status(400)
        .json({ error: "Loan has not been approved or partially-returned" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error returning book" });
  }
});
