import jwt from "jsonwebtoken";

export function authenticateToken(req, res, next) {
  const header = req.headers["authorization"];

  if (!header) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = header.split(" ")[1]; // "Bearer token_here"

  if (!token) {
    return res.status(401).json({ error: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWTSECRET);
    req.user = { id: decoded.userId }; // attach user to request
    next(); // continue to protected route
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

export default [authenticateToken];