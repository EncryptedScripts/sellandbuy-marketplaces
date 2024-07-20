require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
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

app.get("/login", (req, res) => {
  res.render("login/login");
});

app.get("/register", (req, res) => {
  res.render("login/register");
});

app.get("/forgot-password", (req, res) => {
  res.render("login/forgot-password");
});

module.exports = app;
