const router = require("express").Router();
const Book = require("../models/Book");
const multer = require("multer");
const { uploader, destroy } = require("../util/cloudinary");
const BookPic = require("../models/BookPic");
const upload = require("../middlewares/upload");

//CREATE BOOK
router.post("/", upload.single("bookPic"), async (req, res) => {
  try {
    // Upload image to cloudinary
    const result = await uploader(req.file.path, "LMS/Book Images");

    // Create a new profile picture document in the database
    const newBookPic = new BookPic({
      fileUrl: result.secure_url,
      fileType: req.file.mimetype,
      fileName: req.file.originalname,
      public_id: result.id,
    });
    await newBookPic.save();

    // Create new book object
    const newBook = new Book({
      title: req.body.title,
      author: req.body.author,
      year: req.body.year,
      category: req.body.category,
      publisher: req.body.publisher,
      description: req.body.description,
      bookPic: newBookPic._id,
    });

    // Save book to database
    await newBook.save();
    fs.unlinkSync(path);

    res.status(201).json(newBook);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

//UPDATE BOOK
router.put("/:id", async (req, res) => {
  try {
    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      {
        $set: req.body,
      },
      { new: true }
    );
    return res.status(200).json(updatedBook);
  } catch (err) {
    return res.status(500).json(err);
  }
});

//DELETE BOOK
router.delete("/:id", async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    await book.delete();
    return res.status(200).json("Book has been deleted...");
  } catch (err) {
    return res.status(500).json(err);
  }
});

//GET BOOK
router.get("/:id", async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).populate("bookPic");
    return res.status(200).json(book);
  } catch (err) {
    return res.status(500).json(err);
  }
});

//GET ALL BOOK
router.get("/", async (req, res) => {
  try {
    const books = await Book.find().populate("category").populate("bookPic");
    return res.status(200).json(books);
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

//PATCH BOOK
router.patch("/:id", async (req, res) => {
  try {
    const updatedBook = await Book.findByIdAndUpdate(req.params.id, {
      $push: req.body,
    });
    return res.status(200).json(updatedBook);
  } catch (err) {
    return res.status(500).json(err);
  }
});

module.exports = router;
