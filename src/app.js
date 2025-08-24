const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const logger = require("./utils/logger");
const { connectDB } = require("./utils/database");

// Import GraphQL server
const { applyGraphQLMiddleware } = require("./graphql/server");

/**
 * Express application setup and configuration
 */
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// JSON parsing error handler
app.use((err, req, res, next) => {
	if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
		return res.status(400).json({ error: 'Invalid JSON' });
	}
	next(err);
});

// Setup GraphQL endpoint first - this needs to be done before other routes
const setupGraphQL = async () => {
	try {
		await applyGraphQLMiddleware(app);
		logger.verbose("GraphQL endpoint configured at /graphql");
		return true;
	} catch (error) {
		logger.error("Failed to setup GraphQL:", error);
		return false;
	}
};

// Initialize GraphQL setup promise
const graphqlPromise = setupGraphQL();

// Function to setup routes after GraphQL is ready
const setupRoutes = async () => {
	// Wait for GraphQL to be ready first
	await graphqlPromise;
	
	// Import routes after GraphQL setup
	const authRoutes = require("./routes/auth");
	const userRoutes = require("./routes/users");
	const postRoutes = require("./routes/posts");
	const commentRoutes = require("./routes/comments");
	const likeRoutes = require("./routes/likes");
	const scheduledRoutes = require("./routes/scheduled");

	// API routes
	app.use("/api/auth", authRoutes);
	app.use("/api/users", userRoutes);
	app.use("/api/posts", postRoutes);
	app.use("/api/comments", commentRoutes);
	app.use("/api/likes", likeRoutes);
	app.use("/api/posts", scheduledRoutes);

	// Health check endpoint
	app.get("/health", (req, res) => {
		res.status(200).json({ 
			status: "OK", 
			timestamp: new Date().toISOString(),
			uptime: process.uptime()
		});
	});

	// Root endpoint
	app.get("/", (req, res) => {
		res.status(200).json({ 
			message: "Social Media API", 
			version: "1.0.0",
			endpoints: {
				auth: "/api/auth",
				users: "/api/users", 
				posts: "/api/posts",
				comments: "/api/comments",
				likes: "/api/likes",
				graphql: "/graphql",
				health: "/health"
			}
		});
	});

	// Global error handler
	app.use((err, req, res, next) => {
		logger.critical("Unhandled error:", err);
		res.status(500).json({
			error: "Internal server error",
			...(process.env.NODE_ENV === "development" && { details: err.message }),
		});
	});

	// 404 handler
	app.use("*", (req, res) => {
		res.status(404).json({ error: "Route not found" });
	});
};

// Setup routes
const routesPromise = setupRoutes();

/**
 * Start the server (only if not in test environment)
 */
const startServer = async () => {
	try {
		await connectDB();
		
		// Wait for routes to be setup (which waits for GraphQL)
		await routesPromise;
		logger.verbose("All routes configured successfully");
		
		app.listen(PORT, () => {
			logger.verbose(`Server is running on port ${PORT}`);
			logger.verbose(
				`Environment: ${process.env.NODE_ENV || "development"}`
			);
			logger.verbose("GraphQL endpoint available at /graphql");
		});
	} catch (error) {
		logger.critical("Failed to start server:", error);
		process.exit(1);
	}
};

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test' && require.main === module) {
	startServer();
}

module.exports = app;
module.exports.graphqlReady = routesPromise;
