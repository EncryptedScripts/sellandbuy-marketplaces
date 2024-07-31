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
    if (file.fieldname === "productImages") {
      cb(null, "public/images/products");
    } else if (file.fieldname === "paymentProof") {
      cb(null, "public/images/payments");
    }
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

app.get("/jual", authenticateSession, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/login");
    }

    res.render("form-jual/form-awal", { user });
  } catch (error) {
    req.flash("error", "An error occurred");
    res.redirect("/jual");
  }
});

app.post(
  "/jual",
  authenticateSession,
  upload.array("productImages", 4),
  async (req, res) => {
    try {
      const user = await User.findById(req.session.userId);
      if (!user) {
        req.flash("error", "User not found");
        return res.redirect("/login");
      }

      const newProduct = new Product({
        userId: user._id,
        productName: req.body.productName,
        category: req.body.category,
        price: req.body.price,
        reasonForSelling: req.body.reasonForSelling,
        description: req.body.description,
        location: req.body.location,
        fullAddress: req.body.fullAddress,
        images: req.files.map((file) => file.path),
      });

      await newProduct.save();

      req.flash("success", "Product added successfully");
      res.redirect("/finish-payment/" + newProduct._id);
    } catch (error) {
      req.flash("error", "An error occurred");
      res.redirect("/jual");
    }
  }
);

app.get("/finish-payment/:productId", authenticateSession, async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      req.flash("error", "Product not found");
      return res.redirect("/jual");
    }

    res.render("form-jual/pembayaran", { product });
  } catch (error) {
    req.flash("error", "An error occurred");
    res.redirect("/jual");
  }
});

app.post(
  "/finish-payment/:productId",
  authenticateSession,
  upload.single("paymentProof"),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.productId);
      if (!product) {
        req.flash("error", "Product not found");
        return res.redirect("/jual");
      }

      product.paymentProof = req.file.path;
      await product.save();

      req.flash("success", "Payment proof uploaded successfully");
      res.redirect("/selesai/" + product._id);
    } catch (error) {
      req.flash("error", "An error occurred");
      res.redirect("/finish-payment/" + req.params.productId);
    }
  }
);

app.get("/selesai/:productId", authenticateSession, async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      req.flash("error", "Product not found");
      return res.redirect("/jual");
    }

    res.render("form-jual/selesai", { product });
  } catch (error) {
    req.flash("error", "An error occurred");
    res.redirect("/jual");
  }
});

module.exports = app;
