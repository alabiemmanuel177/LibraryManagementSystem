const AuthRouter = require("./auth");
const UserRouter = require("./user");
const CategoryRouter = require("./category");
const BookRouter = require("./book");
const LoanRouter = require("./loan");
const ProfilePicRouter = require("./ProfilePic");

const routes = ({ app }) => {
  app.use("/auth", AuthRouter);
  app.use("/user", UserRouter);
  app.use("/book", BookRouter);
  app.use("/loan", LoanRouter);
  app.use("/profilepic", ProfilePicRouter);
  app.use("/category", CategoryRouter);
};

module.exports = { routes };
