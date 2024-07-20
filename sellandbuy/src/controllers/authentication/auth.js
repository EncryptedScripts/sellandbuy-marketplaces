require("dotenv").config();
const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const mongoSanitize = require("express-mongo-sanitize");
const session = require("express-session");
const flash = require("express-flash");
const { User, PasswordResetToken } = require("../../database/auth");
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

// Middleware to check if user is authenticated
const authenticateSession = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect("/login");
  }
};

// Routes
app.get("/login", (req, res) => {
  const error = req.flash("error");
  res.render("login/login", { error });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    req.flash("error", "User not found!");
    return res.redirect("/login");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  console.log("Password:", password);
  console.log("Hashed Password:", user.password);
  console.log("Password Valid:", isPasswordValid);

  if (!isPasswordValid) {
    req.flash("error", "Invalid password!");
    return res.redirect("/login");
  }

  req.session.userId = user._id;
  res.redirect("/profile");
});

app.get("/register", (req, res) => {
  const error = req.flash("error");
  res.render("login/register", { error });
});

app.post("/register", async (req, res) => {
  const {
    username,
    email,
    password,
    confirm_password,
    phone,
    address,
    birthdate,
  } = req.body;

  if (password !== confirm_password) {
    req.flash("error", "Passwords does not match");
    return res.redirect("/register");
  }

  const findEmail = await User.findOne({ email });

  if (findEmail) {
    req.flash("error", "Email already exists");
    return res.redirect("/register");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    username,
    email,
    password: hashedPassword,
    phone,
    address,
    birthdate,
    membership: "none",
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
  const token = Math.random().toString(36).substr(2); // Generate a random token
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
  const resetToken = await PasswordResetToken.findOne({ token });
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
  const resetToken = await PasswordResetToken.findOne({ token });
  if (!resetToken) {
    res.status(400).send("Invalid token");
    return;
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.findById(resetToken.userId);
  user.password = hashedPassword;
  await user.save();
  await resetToken.delete();
  res.redirect("/login");
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect("/profile");
    }
    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
});

app.get("/profile", authenticateSession, (req, res) => {
  res.render("profile");
});

module.exports = app;
