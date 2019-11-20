"use strict";
// const createError = require('http-errors')
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const cons = require("consolidate");
const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const app = express();
const http = require("http");

app.engine("html", cons.swig);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "html");

var server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", express.static(path.join(__dirname, "public", "mentorpanel")));

const port = process.env.NODE_PORT || 3000;
indexRouter.io.listen(server);
server.listen(port, function() {
  console.log(`node listening on port ${port}`);
});

module.exports = app;
