const jwt = require("jsonwebtoken");
const TokenBlocklist = require("../models/tokenBlocklist.model");
const hashToken = require("../utils/hashToken");

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Invalid or expired session"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Reject tokens that have been explicitly invalidated via logout.
        const isBlocklisted = await TokenBlocklist.exists({ token: hashToken(token) });
        if (isBlocklisted) {
            return res.status(401).json({
                message: "Invalid or expired session"
            });
        }

        req.user = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired session"
        });
    }
};

module.exports = protect;
