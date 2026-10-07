const { verifyUserToken, verifyAdminToken } = require("../utils/jwt");

const getToken = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("No token");
  }

  return authHeader.split(" ")[1];
};
// user verification
const userAuth = (req, res, next) => {
  try {
    const token = getToken(req);

    const decoded = verifyUserToken(token);

    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid token",
    });
  }
};
// admin verification
const adminAuth = (req, res, next) => {
  try {
    const token = getToken(req);

    const decoded = verifyAdminToken(token);

    req.admin = decoded;

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid token",
    });
  }
};

module.exports = { userAuth, adminAuth };
