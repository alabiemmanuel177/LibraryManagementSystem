const RequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    books: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Book",
        required: true,
      },
    ],
    loanDate: {
      type: Date,
      required: true,
    },
    returnDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "approved", "declined", "returned"],
      default: "pending",
    },
  },
  { timestamps: true }
);

RequestSchema.path("books").validate(function (value) {
  return value.length <= 5;
}, "A maximum of 5 books can be requested at once.");

RequestSchema.pre("validate", async function (next) {
  const user = await mongoose.model("User").findById(this.user);
  const existingRequests = await mongoose
    .model("Request")
    .find({ user: this.user, status: "approved" });
  const bookIds = this.books.map((book) => book.toString());
  const requestedBooks = await mongoose
    .model("Book")
    .find({ _id: { $in: bookIds } });
  let invalid = false;

  requestedBooks.forEach((book) => {
    if (book.copies <= 0) {
      invalid = true;
    }
  });

  if (existingRequests.length > 0) {
    invalid = true;
  }

  if (invalid) {
    const error = new Error(
      "Please Return Borrowed Books before requesting to loan some more"
    );
    error.statusCode = 400;
    return next(error);
  }

  next();
});

const Request = mongoose.model("Request", RequestSchema);

module.exports = Request;
