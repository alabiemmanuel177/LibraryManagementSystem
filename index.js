const express = require("express");
const app = express();
const cors = require("cors");
const connectDB = require("./migrations/index.js");
const server = require("http").createServer(app);
const io = require("socket.io")(server, { cors: { origin: "*" } });
const fs = require("fs");
const passport = require("passport");
const session = require("express-session");
const flash = require("express-flash");
const bodyParser = require("body-parser");

app.use(cors()); // Use cors middleware
app.use(bodyParser.json({ limit: "10mb" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(flash());
app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  })
);

app.use(passport.session());

const UPLOADS_DIR = "./uploads";

// Check if the uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  // If it doesn't exist, create the directory
  fs.mkdirSync(UPLOADS_DIR);
  console.log("Folder Created");
} else {
  console.log("Folder Exist");
}

const { routes } = require("./routes/main");

// Registers routes
routes({ app, io });

app.get("/", (req, res) => {
  res.send("Server Running");
});

//db connect
connectDB();

const port = process.env.ACCESS_PORT || 5900;

server.listen(port, () => {
  console.log(`Server running on port ${port}.`);
});
