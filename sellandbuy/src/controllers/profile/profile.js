require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const mongoSanitize = require("express-mongo-sanitize");
const session = require("express-session");
const flash = require("express-flash");
const { User } = require("../../database/auth");
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
    cookie: { maxAge: 60000 },
  })
);

app.use(flash());

app.get("/profile", authenticateSession, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/login");
    }
    res.render("profile/profil-pengguna", { user });
  } catch (error) {
    req.flash("error", "An error occurred");
    res.redirect("/login");
  }
});

module.exports = app;
