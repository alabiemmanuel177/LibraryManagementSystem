const AuthRouter = require("./auth");

function addSocketConnectionToReq(io) {
  return async (req, res, next) => {
    req.IOconn = io;
    next();
  };
}

const routes = ({ app, io }) => {
  app.use("/auth", AuthRouter);
};

module.exports = { routes };
