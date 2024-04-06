const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const xss = require("xss-clean");

// RouteHandler
const authRouter = require("./routes/authRoutes");
const attendanceRouter = require("./routes/attendanceRoutes");

// Utils
const AppError = require("./utils/appError");
const GlobalErrorHandler = require("./controllers/errorController");

// App Initialization
const app = express();

app.use(cors());

// Set security HTTP header
app.use(helmet());

// Data sanitization against XSS: malicious html using Javascript
app.use(xss());

// Limit request from the same Ip to the api routes
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many request from this IP, please try again in an hour!",
});

app.use("/api", limiter);

// Body parser from the request. reading data from body into req.body
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.status(200).send("App is running");
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1", attendanceRouter);

// Any request that makes it to this part has lost it's way
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// This handles app wide error
app.use(GlobalErrorHandler);

module.exports = app;
