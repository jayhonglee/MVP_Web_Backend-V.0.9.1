require("./database/mongoose");

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const userRouter = require("./routers/user");
const dropinRouter = require("./routers/dropin");
const groupChatRouter = require("./routers/groupChat");
const messageRouter = require("./routers/message");
const app = express();

// Enable CORS for your frontend
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://mvp-web-v-0-9-1-qhuq8grr8-jayhonglees-projects.vercel.app",
      "https://hangoutpeople.com",
      /^https:\/\/mvp-web-v-0-9-1.*\.vercel\.app$/, // Wildcard for all Vercel deployments
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(userRouter);
app.use(dropinRouter);
app.use(groupChatRouter);
app.use(messageRouter);

module.exports = app;
