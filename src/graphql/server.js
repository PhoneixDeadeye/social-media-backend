/**
 * GraphQL Server Setup
 * Configures Apollo Server with Express integration
 */

const { ApolloServer } = require('apollo-server-express');
const jwt = require('jsonwebtoken');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');
const { critical: logError, verbose } = require('../utils/logger');

/**
 * Create Apollo Server instance
 */
const createApolloServer = async () => {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    // Enable GraphQL Playground in development
    introspection: process.env.NODE_ENV !== 'production',
    playground: process.env.NODE_ENV !== 'production',
    // Custom error formatting
    formatError: (err) => {
      logError('GraphQL Error:', err);
      
      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production' && err.message.startsWith('Internal')) {
        return new Error('Internal server error');
      }
      
      return err;
    },
    // Context function
    context: ({ req }) => {
      let user = null;
      
      try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        verbose('GraphQL request authorization header:', authHeader ? 'present' : 'missing');
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          verbose('GraphQL token extracted, length:', token.length);
          
          // Verify JWT token
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
          user = decoded;
          
          verbose('GraphQL request authenticated:', { 
            userId: user.userId, 
            username: user.username,
            tokenStructure: Object.keys(user)
          });
        } else {
          verbose('GraphQL request - no valid authorization header');
        }
      } catch (err) {
        // Token is invalid or expired - continue without user
        verbose('GraphQL request authentication failed:', err.message);
      }
      
      return {
        user,
        req,
      };
    },
  });

  return server;
};

/**
 * Apply GraphQL middleware to Express app
 */
const applyGraphQLMiddleware = async (app) => {
  try {
    verbose('Starting GraphQL middleware application...');
    const server = await createApolloServer();
    verbose('Apollo server created, starting server...');
    await server.start();
    verbose('Apollo server started, applying middleware...');
    
    server.applyMiddleware({ 
      app, 
      path: '/graphql',
      cors: {
        origin: true,
        credentials: true
      }
    });
    
    verbose('GraphQL middleware applied successfully');
    verbose('GraphQL endpoint configured at /graphql');
    
    return server;
  } catch (error) {
    logError('Error applying GraphQL middleware:', error);
    throw error;
  }
};

module.exports = {
  createApolloServer,
  applyGraphQLMiddleware,
};
