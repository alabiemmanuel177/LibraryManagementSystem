const AuthRouter = require("./auth");
const UserRouter = require("./user");
const CategoryRouter = require("./category");
const BookRouter = require("./book");
const RequestRouter = require("./request");

function addSocketConnectionToReq(io) {
  return async (req, res, next) => {
    req.IOconn = io;
    next();
  };
}

const routes = ({ app, io }) => {
  app.use("/auth", AuthRouter);
  app.use("/user", UserRouter);
  app.use("/book", BookRouter);
  app.use("/request", RequestRouter);
  app.use("/category", CategoryRouter);
};

module.exports = { routes };
