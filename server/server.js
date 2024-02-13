const express = require("express");
const session = require("express-session");
const passport = require("passport");
const cors = require("cors");
const userController = require("./controllers/userController");
const todoController = require("./controllers/todoController");
const connectDatabase = require("./config/db.js");
const errorHandler = require("./config/errorhandling");
const { logMiddleware } = require("./config/logMiddleware");
const csrf = require("csurf");
const cookieParser = require("cookie-parser");
const app = express();
const port = process.env.PORT || 4000;
require("dotenv").config({ path: "./server/config/.env" });
const MongoDBStore = require('connect-mongodb-session')(session);
const { verifyToken } = require("./config/functions")

const store = new MongoDBStore({
  uri: 'mongodb+srv://amanuelgirma108:gondar2022@clusterpizza.lyachjx.mongodb.net/?retryWrites=true&w=majority',
  collection: 'sessions',
});
app.use(
  session({
    secret: 'ABCDEFGHSABSDBHJCS',
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      sameSite: "None",
    },
  })
);
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3000", "http://192.168.56.1:3000", "https://warm-pudding-613ffe.netlify.app","https://todo-app-mern1236.netlify.app"],
    credentials: true,
  })
);


app.use(cookieParser());

const csrfProtection = csrf({
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    secure: true,
    httpOnly: true,
  },
  name: "X-CSRF-TOKEN",
  value: (req) => req.csrfToken(),
  failAction: (req, res) => {
    res.status(403).send("Invalid CSRF token");
  },
});
app.use(csrfProtection);
app.use((req, res, next) => {
  res.cookie(req.csrfToken());
  res.locals.csrfToken = req.csrfToken();
  next();
});
app.use(passport.initialize());
app.use(passport.session());
app.use("/user", userController);
app.use("/todos", verifyToken, todoController);
app.use(logMiddleware);
app.use(errorHandler);
app.get('/get-csrf-token', (req, res) => {
  console.log(req.csrfToken())
  res.json({ csrfToken: req.csrfToken() });
});
app.listen(port, () => {
  connectDatabase();
  console.log(`Server is running on port ${port}`);
});
