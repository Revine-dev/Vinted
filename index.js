const express = require("express");
const formidableMiddleware = require("express-formidable");
const app = express();
app.use(formidableMiddleware());
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const fn = require("./middlewares/functions");

app.use(cors());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

const signRoutes = require("./routes/sign");
const offersRoutes = require("./routes/offers");

app.use(signRoutes);
app.use(offersRoutes);

app.all("/", function (req, res) {
  res.json({ message: "Welcome to Vinted Application !" });
});

app.all("*", function (req, res) {
  fn.notFound(res);
});

app.listen(process.env.PORT, () => {
  console.log("Server started");
});
