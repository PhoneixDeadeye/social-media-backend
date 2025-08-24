# Social Media Backend API

A comprehensive Node.js backend API for a social media platform featuring user authentication, content management, social interactions, GraphQL support, and scheduled posting capabilities.

## 🚀 Features

### Core Features
- **User Authentication** - JWT-based registration and login
- **Posts Management** - Create, read, update, delete posts with media support
- **Social Interactions** - Like/unlike posts, follow/unfollow users
- **Comments System** - Add, edit, delete comments on posts
- **Search Functionality** - Search posts and users
- **User Profiles** - View user statistics and activity

### Advanced Features
- **GraphQL API** - Complete GraphQL schema with resolvers
- **Scheduled Posts** - Schedule posts for future publication
- **Background Jobs** - Bull queue system with Redis support
- **Health Monitoring** - System health checks and status endpoints
- **Comprehensive Testing** - 118 tests with 100% coverage
- **Flexible Logging** - Configurable logging levels

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **GraphQL**: Apollo Server Express
- **Job Queue**: Bull (with Redis/In-memory fallback)
- **Testing**: Jest
- **Logging**: Custom logger with multiple levels

## 📋 Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- Redis (optional, for job queue - falls back to in-memory)

## 🔧 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd social-media-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=social_media_db
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   JWT_SECRET=your_jwt_secret_key_here
   REDIS_URL=redis://localhost:6379
   NODE_ENV=development
   ```

4. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb social_media_db
   
   # Run database setup script
   npm run setup:db
   ```

5. **Start the application**
   ```bash
   # Development mode (with auto-reload)
   npm run dev
   
   # Production mode
   npm start
   ```

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Posts
- `GET /api/posts` - Get all posts (public)
- `GET /api/posts/search` - Search posts (public)
- `POST /api/posts` - Create post (auth required)
- `GET /api/posts/my` - Get user's posts (auth required)
- `GET /api/posts/feed` - Get user's feed (auth required)
- `PUT /api/posts/:id` - Update post (auth required)
- `DELETE /api/posts/:id` - Delete post (auth required)

### Comments
- `GET /api/comments/:postId` - Get post comments
- `POST /api/comments` - Create comment (auth required)
- `PUT /api/comments/:id` - Update comment (auth required)
- `DELETE /api/comments/:id` - Delete comment (auth required)

### Likes
- `GET /api/likes/:postId` - Get post likes
- `POST /api/likes` - Like post (auth required)
- `DELETE /api/likes/:postId` - Unlike post (auth required)

### Users & Following
- `GET /api/users/search` - Search users
- `GET /api/users/following` - Get following list (auth required)
- `GET /api/users/followers` - Get followers list (auth required)
- `GET /api/users/stats` - Get follow statistics (auth required)
- `POST /api/users/follow` - Follow user (auth required)
- `DELETE /api/users/unfollow/:userId` - Unfollow user (auth required)

### Scheduled Posts
- `POST /api/posts/schedule` - Schedule post (auth required)
- `GET /api/posts/scheduled` - Get scheduled posts (auth required)
- `DELETE /api/posts/scheduled/:jobId` - Cancel scheduled post (auth required)
- `GET /api/admin/queue/stats` - Get queue statistics (auth required)

### Health & System
- `GET /health` - System health check
- `POST /graphql` - GraphQL endpoint

## 📊 GraphQL Schema

Access GraphQL Playground at `http://localhost:3000/graphql`

### Available Queries
```graphql
type Query {
  posts(limit: Int, offset: Int): [Post!]!
  users(search: String, limit: Int, offset: Int): [User!]!
  health: HealthStatus!
  me: User
}
```

### Available Mutations
```graphql
type Mutation {
  createPost(content: String!, mediaUrl: String, commentsEnabled: Boolean): Post!
  schedulePost(content: String!, scheduledTime: String!, mediaUrl: String): ScheduleResponse!
}
```

## 🧪 Testing

Run the complete test suite:
```bash
npm test
```

**Test Coverage**: 118 tests across 11 test suites with 100% pass rate

Test suites include:
- Authentication tests
- Posts controller tests  
- Comments functionality
- Likes system
- User management
- GraphQL integration
- Scheduled posts
- Route integration
- Model validations

## 📁 Project Structure

```
src/
├── app.js                 # Express app configuration
├── controllers/           # Route controllers
│   ├── auth.js           # Authentication logic
│   ├── posts.js          # Posts management
│   ├── comments.js       # Comments handling
│   ├── likes.js          # Likes functionality
│   ├── users.js          # User operations
│   └── scheduled.js      # Scheduled posts
├── middleware/           
│   └── auth.js           # JWT authentication middleware
├── models/               # Database models
│   ├── user.js           # User model
│   ├── post.js           # Post model
│   ├── comment.js        # Comment model
│   ├── like.js           # Like model
│   └── follow.js         # Follow relationship model
├── routes/               # Route definitions
│   ├── auth.js           # Auth routes
│   ├── posts.js          # Post routes
│   ├── comments.js       # Comment routes
│   ├── likes.js          # Like routes
│   ├── users.js          # User routes
│   └── scheduled.js      # Scheduled post routes
├── utils/                # Utility modules
│   ├── database.js       # Database connection
│   ├── jwt.js            # JWT utilities
│   ├── logger.js         # Logging system
│   ├── validation.js     # Input validation
│   └── redis.js          # Redis connection
├── graphql/              # GraphQL implementation
│   ├── schema.js         # GraphQL schema definition
│   ├── resolvers.js      # GraphQL resolvers
│   └── server.js         # Apollo server setup
└── queue/                # Job queue system
    └── jobQueue.js       # Bull queue configuration
```

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_NAME` | Database name | social_media_db |
| `DB_USER` | Database username | - |
| `DB_PASSWORD` | Database password | - |
| `JWT_SECRET` | JWT signing secret | - |
| `REDIS_URL` | Redis connection URL | redis://localhost:6379 |
| `NODE_ENV` | Environment | development |

### NPM Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with nodemon |
| `npm run start:verbose` | Start with verbose logging |
| `npm run start:critical` | Start with critical-only logging |
| `npm test` | Run test suite |
| `npm run setup:db` | Initialize database schema |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 API Documentation

For detailed API documentation including request/response examples, see the [API Collection](docs/api-collection.json) which can be imported into Postman or similar tools.

## 🚀 Deployment

### Using Docker (Coming Soon)
```bash
docker build -t social-media-backend .
docker run -p 3000:3000 social-media-backend
```

### Manual Deployment
1. Set up PostgreSQL database on your server
2. Configure environment variables
3. Run `npm install --production`
4. Start with `npm start`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues & Support

If you encounter any issues or have questions, please [open an issue](https://github.com/your-username/social-media-backend/issues) on GitHub.

## 🎉 Acknowledgments

- Express.js community for the excellent framework
- Apollo GraphQL for powerful GraphQL implementation
- Bull queue for robust job processing
- Jest for comprehensive testing capabilities
