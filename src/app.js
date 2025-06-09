require("./database/mongoose");

const express = require("express");
const userRouter = require("./routers/user");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());
app.use(userRouter);

module.exports = app;
