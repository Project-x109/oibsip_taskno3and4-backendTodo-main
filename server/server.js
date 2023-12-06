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
    origin: ["http://localhost:3000", "http://192.168.56.1:3000", "https://warm-pudding-613ffe.netlify.app"],
    credentials: true,
  })
);


app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());
app.use(errorHandler);
app.use(logMiddleware);
/* app.use(csrf({ cookie: true })); */
app.get('/get-csrf-token', (req, res) => {
  console.log(req.csrfToken())
  res.json({ csrfToken: req.csrfToken() });
});
app.use("/user", userController);
app.use("/todos", todoController);
app.listen(port, () => {
  connectDatabase();
  console.log(`Server is running on port ${port}`);
});
