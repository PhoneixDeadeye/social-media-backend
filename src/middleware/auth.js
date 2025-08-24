const { verifyToken } = require("../utils/jwt");
const { getUserById } = require("../models/user");
const logger = require("../utils/logger");

/**
 * Middleware to authenticate JWT tokens
 */
const authenticateToken = async (req, res, next) => {
	try {
		const authHeader = req.headers["authorization"];

		if (!authHeader) {
			return res.status(401).json({ error: "Access token required" });
		}

		// Check if header starts with "Bearer "
		if (!authHeader.startsWith('Bearer ')) {
			return res.status(401).json({ error: "Authorization header must start with 'Bearer '" });
		}

		// Extract token from "Bearer token" format
		const token = authHeader.slice(7);
		
		const decoded = verifyToken(token);

		const user = await getUserById(decoded.userId);
		if (!user) {
			return res.status(401).json({ error: "User not found" });
		}

		req.user = user;
		next();
	} catch (error) {
		logger.critical("Authentication error:", error.message);
		return res.status(401).json({ error: "Invalid token" });
	}
};

/**
 * Middleware to optionally authenticate tokens (for endpoints that work with/without auth)
 */
const optionalAuth = async (req, res, next) => {
	try {
		const authHeader = req.headers["authorization"];

		if (authHeader) {
			// Extract token from "Bearer token" format
			const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
			const decoded = verifyToken(token);
			const user = await getUserById(decoded.userId);
			if (user) {
				req.user = user;
			}
		}

		next();
	} catch (error) {
		// Ignore auth errors for optional auth
		next();
	}
};

module.exports = {
	authenticateToken,
	optionalAuth,
};
