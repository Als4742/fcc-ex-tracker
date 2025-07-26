const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});
app.use(bodyParser.urlencoded({ extended: true }));

// Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  count: { type: Number, default: 0 },
  log: [
    {
      description: String,
      duration: Number,
      date: String,
    },
  ],
});

const exerciseSchema = new mongoose.Schema({
  user_id: String,
  username: String,
  description: String,
  duration: Number,
  date: String,
});

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

// Create User
app.post("/api/users", async (req, res) => {
  const newUser = await User.create({ username: req.body.username });
  res.json({ username: newUser.username, _id: newUser._id });
});

// Get All Users
app.get("/api/users", async (req, res) => {
  const users = await User.find({}, "username _id");
  res.json(users);
});

// Add Exercise
app.post("/api/users/:_id/exercises", async (req, res) => {
  const user = await User.findById(req.params._id);
  if (!user) return res.status(400).json({ error: "User not found" });

  const description = req.body.description;
  const duration = parseInt(req.body.duration);
  const date = req.body.date
    ? new Date(req.body.date)
    : new Date();

  const formattedDate = date.toDateString();

  // Save to Exercise collection
  await Exercise.create({
    user_id: user._id,
    username: user.username,
    description,
    duration,
    date: formattedDate,
  });

  // Add to user log
  user.log.push({ description, duration, date: formattedDate });
  user.count = user.log.length;
  await user.save();

  res.json({
    _id: user._id,
    username: user.username,
    date: formattedDate,
    duration: duration,
    description: description,
  });
});

// Get Logs
app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const user = await User.findById(req.params._id);
  if (!user) return res.status(400).json({ error: "User not found" });

  let log = [...user.log];

  if (from) {
    const fromDate = new Date(from);
    log = log.filter((entry) => new Date(entry.date) >= fromDate);
  }

  if (to) {
    const toDate = new Date(to);
    log = log.filter((entry) => new Date(entry.date) <= toDate);
  }

  if (limit) {
    log = log.slice(0, parseInt(limit));
  }

  res.json({
    username: user.username,
    count: log.length,
    _id: user._id,
    log: log,
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
