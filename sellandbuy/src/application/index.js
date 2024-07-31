require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const layouts = require("express-ejs-layouts");
const mongoSanitize = require("express-mongo-sanitize");
const flash = require("express-flash");

const app = express();
const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, "../../public");
const viewsPath = path.join(__dirname, "../templates");

// Controllers and Routes
const landing = require("../controllers/landing-page/landing");
const auth = require("../controllers/authentication/auth");
const profile = require("../controllers/profile/profile");
const formJual = require("../controllers/form-jual/jual");

app.set("view engine", "ejs");
app.set("views", viewsPath);
app.use(express.static(publicDirectoryPath));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(mongoSanitize());

const oneWeek = 1000 * 60 * 60 * 24 * 7;

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: oneWeek },
  })
);
app.use(flash());

// Routes
app.use(landing);
app.use(auth);
app.use(profile);
app.use(formJual);

// app.get("/pengguna-lain", (req, res) => {
//   res.render("profile/profil-pengguna-lain");
// });

// app.get("/product", (req, res) => {
//   res.render("profile/item/detail-item");
// });

// app.get("/product/edit", (req, res) => {
//   res.render("profile/item/edit-item");
// });

// app.get("/offer", (req, res) => {
//   res.render("profile/item/penawaran");
// });

// app.get("/membership", (req, res) => {
//   res.render("membership/membership");
// });

// app.get("/membership/form", (req, res) => {
//   res.render("membership/form-awal");
// });

// app.get("/membership/payment", (req, res) => {
//   res.render("membership/pembayaran");
// });

// app.get("/membership/success", (req, res) => {
//   res.render("membership/invoice");
// });

// app.get("/marketplace", (req, res) => {
//   res.render("market/katalog");
// });

// app.get("/detail-item", (req, res) => {
//   res.render("market/detail-item");
// });

// app.get("/form-jual", (req, res) => {
//   res.render("form-jual/form-awal");
// });

// app.get("/form-jual/pembayaran", (req, res) => {
//   res.render("form-jual/pembayaran");
// });

// app.get("/form-jual/success", (req, res) => {
//   res.render("form-jual/selesai");
// });

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
