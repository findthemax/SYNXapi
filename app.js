const express = require("express");
const connectDB = require("./config/db");

const cors = require("cors");
const app = express();

// Connect Database
connectDB;

// Init Middleware
app.use(cors());
app.use(express.json({ extended: false }));

// app.get('/', (req, res) => {
//     res.send('API Running')
// })

// Define Routes
app.use("/auth", require("./routes/auth"));
app.use("/room", require("./routes/room"));
app.use("/player", require("./routes/player"));
app.use("/admin", require("./routes/admin"));
app.use("/admob", require("./routes/adMob"));

module.exports = app;
