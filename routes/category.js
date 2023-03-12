const router = require("express").Router();
const Category = require("../models/Category");

//CREATE CATEGORY
router.post("/", async (req, res) => {
  const newCategory = new Category(req.body);
  try {
    const savedCategory = await newCategory.save();
    return res.status(200).json(savedCategory);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

//UPDATE CATEGORY
router.put("/:id", async (req, res) => {
  try {
    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      {
        $set: req.body,
      },
      { new: true }
    );
    return res.status(200).json(updatedCategory);
  } catch (err) {
    return res.status(500).json(err);
  }
});

//DELETE CATEGORY
router.delete("/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    await category.delete();
    return res.status(200).json("Category has been deleted...");
  } catch (err) {
    return res.status(500).json(err);
  }
});

//GET CATEGORY
router.get("/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    return res.status(200).json(category);
  } catch (err) {
    return res.status(500).json(err);
  }
});

//GET ALL CATEGORY
router.get("/", async (req, res) => {
  try {
    let categories;
    categories = await Category.find()
    return res.status(200).json(categories);
  } catch (err) {
    return res.status(500).json(err);
  }
});

//PATCH CATEGORY
router.patch("/:id", async (req, res) => {
  try {
    const updatedCategory = await Category.findByIdAndUpdate(req.params.id, {
      $push: req.body,
    });
    return res.status(200).json(updatedCategory);
  } catch (err) {
    return res.status(500).json(err);
  }
});

module.exports = router;
