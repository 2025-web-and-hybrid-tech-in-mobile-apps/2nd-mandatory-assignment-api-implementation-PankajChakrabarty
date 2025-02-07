const express = require("express");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Dummy database for users and high scores
let users = [];
let highScores = [];
const secretKey = "supersecret"; // Change for production

// Middleware to verify JWT token
const authenticateJWT = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  console.log("Authorization Header:", req.header("Authorization")); // Debugging log for authorization header

  if (!token) {
    return res.status(401).json({ error: "Unauthorized - Missing token" });
  }

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      console.log("JWT verification failed:", err); // Log the error for JWT verification
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = user;
    next();
  });
};

// Signup route
app.post("/signup", (req, res) => {
  const { userHandle, password } = req.body;

  if (!userHandle || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }
  if (userHandle.length < 6 || password.length < 6) {
    return res.status(400).json({ error: "Username & password must be ≥ 6 chars" });
  }
  if (users.some(user => user.userHandle === userHandle)) {
    return res.status(409).json({ error: "User already exists" });
  }

  users.push({ userHandle, password });
  return res.status(201).json({ message: "Signup successful" });
});

// Login route
app.post("/login", (req, res) => {
  const { userHandle, password } = req.body;
  const user = users.find(u => u.userHandle === userHandle && u.password === password);

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ userHandle }, secretKey, { expiresIn: "1h" });
  return res.status(201).json({ token });
});

// Post high score
app.post("/high-scores", authenticateJWT, (req, res) => {
  const { level, score, timestamp } = req.body;
  console.log("Received data for high score:", req.body); // Debugging log for incoming high score data

  if (!level || !score || !timestamp) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const { userHandle } = req.user;
  highScores.push({ userHandle, level, score, timestamp });
  return res.status(201).json({ message: "High score added" });
});

// Get high scores
app.get("/high-scores", authenticateJWT, (req, res) => {
  const { level, page = 1 } = req.query;
  console.log("Request query:", req.query); // Debugging log for query parameters

  if (!level) {
    return res.status(400).json({ error: "Level is required" });
  }

  let scores = highScores.filter(hs => hs.level === parseInt(level, 10));
  scores = scores.sort((a, b) => b.score - a.score).slice((page - 1) * 20, page * 20);
  return res.status(200).json(scores);
});

let serverInstance = null;
module.exports = {
  start: function () {
    serverInstance = app.listen(port, () => {
      console.log(`Example app listening at http://localhost:${port}`);
    });
  },
  close: function () {
    serverInstance.close();
  },
};
