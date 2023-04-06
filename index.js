const express = require("express");
const app = express();
const connectDB = require("./migrations/index.js");
const cors = require("cors");
const server = require("http").createServer(app);
const io = require("socket.io")(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const fs = require("fs");

const UPLOADS_DIR = "./uploads";

// Check if the uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  // If it doesn't exist, create the directory
  fs.mkdirSync(UPLOADS_DIR);
  console.log("Folder Created");
} else {
  console.log("Folder Exist");
}

const allowedOrigins = ["http://localhost:3000", "http://example.com"];

app.use(
  cors({
    origin: function (origin, callback) {
      // Check if the request origin is in the allowed origins array
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);

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
