const { createServer } = require("http");
const { Server } = require("socket.io");
require("dotenv").config(); // Loads .env file contents into process.env.

const app = require("./app");
const connectToMongoDB = require("./db");
const { enrollStudentWithWebsocket } = require("./handlers/enrollHandler");
const {
  takeAttendanceWithWebsocket,
} = require("./handlers/takeAttendanceHandler");
// const {
//   deleteEnrolledStudentsWithWebsocket,
// } = require("./handlers/deleteEnrolledStudentHandler");
const { esp32DetailsWithWebsocket } = require("./handlers/esp32DetailsHandler");

const PORT = process.env.PORT || 8080;

const httpServer = createServer(app);

// Initialize io with server
const io = new Server(httpServer, {
  cors: {
    // origin: [`http://localhost:3000`, `https://f-b-a-s-client.vercel.app`],
    origin: true,
    methods: ["POST", "PUT", "GET", "OPTIONS", "HEAD"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("A client is connected");

  // // Emit an event to the client upon connection
  socket.emit("serverMessage", "Hello from fbas server!");
  socket.emit("welcome", "Welcome to fbas server!");

  // Handle enrollment with websocket from the UI
  socket.on("enroll", (data) => enrollStudentWithWebsocket(socket, data));

  // Handle attendance with websocket from the UI
  socket.on("attendance", (data) => takeAttendanceWithWebsocket(socket, data));

  // // Handle attendance with websocket from the UI
  // socket.on("delete_enrolled_students", (data) =>
  //   deleteEnrolledStudentsWithWebsocket(socket, data)
  // );

  // Handle fetch esp32 details with websocket from the UI
  socket.on("esp32_details", (data) => esp32DetailsWithWebsocket(socket, data));
});

connectToMongoDB()
  .then(() => {
    console.log("Connection to MongoDB is successful.");
    httpServer.listen(PORT, () => {
      console.log("Server running on port ->", PORT);
    });
  })
  .catch((error) => {
    console.log(
      error.message || error,
      "Connection to MongoDB was unsuccessful."
    );
  });
