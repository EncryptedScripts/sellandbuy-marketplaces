require("dotenv").config();
const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const layouts = require("express-ejs-layouts");
const mongoSanitize = require("express-mongo-sanitize");
const { User, Session, PasswordResetToken } = require("../../database/auth");
const app = express();

const publicDirectoryPath = path.join(__dirname, "../../../public");
const viewsPath = path.join(__dirname, "../../templates");

app.set("view engine", "ejs");
app.set("views", viewsPath);
app.use(express.static(publicDirectoryPath));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(mongoSanitize());

// Middleware to check if user is authenticated
const authenticateJWT = (req, res, next) => {
  const token = req.cookies.token;
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    res.redirect("/login");
  }
};

// Routes
app.get("/login", (req, res) => {
  res.render("login/login");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user && (await bcrypt.compare(password, user.password))) {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.cookie("token", token, { httpOnly: true });
    res.redirect("/profile");
  } else {
    res.status(401).send("Invalid email or password");
  }
});

app.get("/register", (req, res) => {
  res.render("login/register");
});

app.post("/register", async (req, res) => {
  const { username, email, password, phone, address, birthdate } = req.body;
  const user = new User({
    username,
    email,
    password,
    phone,
    address,
    birthdate,
  });
  await user.save();
  res.redirect("/login");
});

app.get("/forgot-password", (req, res) => {
  res.render("login/forgot-password");
});

app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    res.status(404).send("User not found");
    return;
  }
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  const resetToken = new PasswordResetToken({ userId: user._id, token });
  await resetToken.save();

  // Send email
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Password Reset",
    text: `To reset your password, please click the link: ${req.headers.origin}/reset/${token}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    res.send("Password reset email sent");
  });
});

app.get("/reset/:token", async (req, res) => {
  const { token } = req.params;
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  const resetToken = await PasswordResetToken.findOne({
    userId: payload.id,
    token,
  });
  if (!resetToken) {
    res.status(400).send("Invalid token");
    return;
  }
  res.render("login/reset", { token });
});

app.post("/reset/:token", async (req, res) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;
  if (password !== confirmPassword) {
    res.status(400).send("Passwords do not match");
    return;
  }
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  const resetToken = await PasswordResetToken.findOne({
    userId: payload.id,
    token,
  });
  if (!resetToken) {
    res.status(400).send("Invalid token");
    return;
  }
  const user = await User.findById(payload.id);
  user.password = password;
  await user.save();
  await resetToken.delete();
  res.redirect("/login");
});

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

app.get("/profile", authenticateJWT, (req, res) => {
  res.render("profile");
});

module.exports = app;
