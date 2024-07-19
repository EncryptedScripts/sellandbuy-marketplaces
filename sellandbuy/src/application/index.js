require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const layouts = require("express-ejs-layouts");
const mongoSanitize = require("express-mongo-sanitize");
const app = express();
const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, "../../public");
const viewsPath = path.join(__dirname, "../templates");

mongoose.connect("mongodb://127.0.0.1:27017/sellandbuy", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.set("view engine", "ejs");
app.set("views", viewsPath);
app.use(express.static(publicDirectoryPath));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.render("index");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
