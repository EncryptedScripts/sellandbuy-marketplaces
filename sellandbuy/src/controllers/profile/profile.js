require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const mongoSanitize = require("express-mongo-sanitize");
const session = require("express-session");
const flash = require("express-flash");
const multer = require("multer");
const fs = require("fs");
const { User } = require("../../database/auth");
const { Product } = require("../../database/product");
const { Offer } = require("../../database/offer");
const { authenticateSession } = require("../middleware/middleware");
const app = express();

const publicDirectoryPath = path.join(__dirname, "../../../public");
const viewsPath = path.join(__dirname, "../../templates");

app.set("view engine", "ejs");
app.set("views", viewsPath);
app.use(express.static(publicDirectoryPath));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(mongoSanitize());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 1 week
  })
);

app.use(flash());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/images/pictures");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

app.get("/profile", authenticateSession, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/login");
    }
    const products = await Product.find({ user: user._id });
    res.render("profile/profil-pengguna", { user, products });
  } catch (error) {
    req.flash("error", "An error occurred");
    res.redirect("/login");
  }
});

app.get("/profile/:id", authenticateSession, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/profile");
    }
    const products = await Product.find({ user: user._id });
    res.render("profile/profil-pengguna-lain", { user, products });
  } catch (error) {
    req.flash("error", "An error occurred");
    res.redirect("/profile");
  }
});

app.post("/profile/update", authenticateSession, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.session.userId, req.body, {
      new: true,
    });
    req.flash("success", "Profile updated successfully");
    res.redirect("/profile");
  } catch (error) {
    req.flash("error", "An error occurred");
    res.redirect("/profile");
  }
});

app.post(
  "/profile/update-picture",
  authenticateSession,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      const user = await User.findById(req.session.userId);
      if (user.profilePicturePath !== "public/images/pictures/default.png") {
        // remove the old picture if it's not the default
        fs.unlinkSync(user.profilePicturePath);
      }
      user.profilePicturePath = req.file.path;
      await user.save();
      req.flash("success", "Profile picture updated successfully");
      res.redirect("/profile");
    } catch (error) {
      req.flash("error", "An error occurred");
      res.redirect("/profile");
    }
  }
);

app.get("/profile/product/:id", authenticateSession, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/login");
    }
    const product = await Product.findById(req.params.id);
    if (!product) {
      req.flash("error", "Product not found");
      return res.redirect("/profile");
    }

    if (product.user.toString() !== user._id.toString()) {
      req.flash("error", "You do not have permission to access this product");
      return res.redirect("/profile");
    }

    res.render("profile/item/detail-item", { product });
  } catch (error) {
    req.flash("error", "An error occurred");
    res.redirect("/profile");
  }
});

app.get("/profile/product/edit/:id", authenticateSession, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/login");
    }
    const product = await Product.findById(req.params.id);
    if (!product) {
      req.flash("error", "Product not found");
      return res.redirect("/profile");
    }
    if (product.user.toString() !== user._id.toString()) {
      req.flash("error", "You do not have permission to access this product");
      return res.redirect("/profile");
    }
    res.render("profile/item/edit-item", { product });
  } catch (error) {
    req.flash("error", "An error occurred");
    res.redirect("/profile");
  }
});

app.post(
  "/profile/product/edit/:id",
  authenticateSession,
  upload.array("productImages", 4),
  async (req, res) => {
    try {
      const user = await User.findById(req.session.userId);
      if (!user) {
        req.flash("error", "User not found");
        return res.redirect("/login");
      }
      const product = await Product.findById(req.params.id);
      if (!product) {
        req.flash("error", "Product not found");
        return res.redirect("/profile");
      }
      if (product.user.toString() !== user._id.toString()) {
        req.flash("error", "You do not have permission to access this product");
        return res.redirect("/profile");
      }

      if (req.files && req.files.length > 0) {
        product.images.forEach((image) => {
          if (image !== "public/images/pictures/default.png") {
            fs.unlinkSync(image);
          }
        });
        product.images = req.files.map((file) => file.path);
      }

      product.productName = req.body.productName;
      product.category = req.body.category;
      product.price = req.body.price;
      product.reasonForSelling = req.body.reasonForSelling;
      product.description = req.body.description;

      await product.save();
      req.flash("success", "Product updated successfully");
      res.redirect(`/profile/product/${product._id}`);
    } catch (error) {
      req.flash("error", "An error occurred");
      res.redirect("/profile");
    }
  }
);

app.get("/profile/daftar-penawaran", authenticateSession, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/login");
    }
    const products = await Product.find({ user: user._id });
    const offers = await Offer.find({
      product: { $in: products.map((p) => p._id) },
    })
      .populate("user")
      .populate("product");
    res.render("profile/daftar-penawaran", { user, offers });
  } catch (error) {
    req.flash("error", "An error occurred");
    res.redirect("/profile");
  }
});

app.post("/product/:id/offer", authenticateSession, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      req.flash("error", "Product not found");
      return res.redirect("/profile");
    }
    const newOffer = new Offer({
      user: req.session.userId,
      product: product._id,
      offerPrice: req.body.offerPrice,
    });
    await newOffer.save();
    req.flash("success", "Offer made successfully");
    res.redirect(`/profile/product/${product._id}`);
  } catch (error) {
    req.flash("error", "An error occurred");
    res.redirect(`/profile/product/${req.params.id}`);
  }
});

module.exports = app;
