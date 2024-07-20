require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const layouts = require("express-ejs-layouts");
const mongoSanitize = require("express-mongo-sanitize");
const publicDirectoryPath = path.join(__dirname, "../../../public");
const viewsPath = path.join(__dirname, "../../templates");
const app = express();

app.set("view engine", "ejs");
app.set("views", viewsPath);
app.use(express.static(publicDirectoryPath));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Routes
app.get("/", (req, res) => {
  res.render("landing-page/index");
});

app.get("/faq", (req, res) => {
  res.render("landing-page/faq");
});

app.get("/privacy", (req, res) => {
  res.render("landing-page/privacy");
});

app.get("/tos", (req, res) => {
  res.render("landing-page/tos");
});
module.exports = app;
