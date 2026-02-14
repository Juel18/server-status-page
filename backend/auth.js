const jwt = require("jsonwebtoken");

const SECRET = "CHANGE_THIS_SECRET";

function generateToken(username) {
    return jwt.sign({ username }, SECRET, { expiresIn: "1d" });
}

function verifyToken(req, res, next) {
    const token = req.headers.authorization;
    if (!token) return res.status(403).json({ error: "Access denied" });

    try {
        req.user = jwt.verify(token, SECRET);
        next();
    } catch {
        res.status(400).json({ error: "Invalid token" });
    }
}

module.exports = { generateToken, verifyToken };

