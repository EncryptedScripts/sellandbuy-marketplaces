require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const mongoSanitize = require("express-mongo-sanitize");
const session = require("express-session");
const flash = require("express-flash");
const { User } = require("../../database/auth");
const { Product } = require("../../database/product");
const { Category } = require("../../database/category");
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

app.get("/katalog", authenticateSession, async (req, res) => {
  try {
    const {
      search,
      category,
      price,
      sort,
      location,
      page = 1,
      limit = 10,
    } = req.query;

    const query = { isVerified: true };

    if (search) {
      query.$or = [
        { productName: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (price) {
      switch (price) {
        case "50001":
          query.price = { $lt: 50000 };
          break;
        case "50000-100000":
          query.price = { $gte: 50000, $lte: 100000 };
          break;
        case "100000-150000":
          query.price = { $gte: 100000, $lte: 150000 };
          break;
        case "150001":
          query.price = { $gt: 150000 };
          break;
      }
    }

    if (location) {
      query.location =
        location === "DIY" ? "Yogyakarta" : { $ne: "Yogyakarta" };
    }

    // Sorting logic
    let sortOption = {};
    if (sort === "low_price") {
      sortOption = { price: 1 };
    } else if (sort === "high_price") {
      sortOption = { price: -1 };
    }

    const skip = (page - 1) * limit;

    const products = await Product.find(query)
      .populate("category")
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .exec();

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    const categories = await Category.find().exec();

    res.render("market/katalog", {
      products,
      categories,
      currentPage: Number(page),
      totalPages,
    });
  } catch (error) {
    req.flash("error", "An error occurred while fetching products.");
    res.redirect("/");
  }
});

app.get("/katalog/:id", authenticateSession, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category userId")
      .exec();
    if (!product) {
      req.flash("error", "Product not found.");
      return res.redirect("/katalog");
    }

    res.render("market/detail-item", { product });
  } catch (error) {
    req.flash("error", "An error occurred while fetching the product.");
    res.redirect("/katalog");
  }
});

module.exports = app;
