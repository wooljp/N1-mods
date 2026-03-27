# Multi-Database Support

This chat application now supports MySQL, PostgreSQL, and MongoDB databases for **user and account management only**. All messaging functionality is handled in-memory for optimal performance.

## Supported Databases

- **MySQL/TiDB** - Traditional relational database
- **PostgreSQL** - Advanced relational database 
- **MongoDB** - NoSQL document database

## What's Stored in Database

- User accounts and authentication
- User preferences and settings  
- User bans and shadowbans
- IP address bans and history
- Admin account seeding

## What's Stored In-Memory

- Chat messages
- Private messages
- Online user status
- Real-time typing indicators

## Configuration

The application automatically detects the database type from the `DATABASE_URL` environment variable.

### MySQL/TiDB
```
DATABASE_URL=mysql://username:password@host:port/database
DATABASE_URL=mysql://username:password@host:port/database?sslmode=require
```

### PostgreSQL
```
DATABASE_URL=postgresql://username:password@host:port/database
DATABASE_URL=postgres://username:password@host:port/database?sslmode=require
```

### MongoDB
```
DATABASE_URL=mongodb://username:password@host:port/database
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/database
```

## Environment Variables

Required:
- `DATABASE_URL` - Database connection string

Optional (for admin accounts):
- `ADMIN_PASSWORD` - Default admin password
- `PASS_BANANA` - Password for "ばなな" admin
- `PASS_CHOCOWAKAME` - Password for "チョコわかめ" admin
- `PASS_BANANA_LEFT` - Password for "ばななの左腕" admin
- `PASS_BANANA_RIGHT` - Password for "ばななの右腕" admin
- `PASS_WOOLISBEST_PLUS` - Password for "woolisbest#plus" admin
- `PASS_WOOLISBEST` - Password for "woolisbest" admin
- `PASS_YOSSHY` - Password for "Yosshy#管理者もどき" admin
- `PASS_AIROU` - Password for "アイルー" admin

## Database Schema

### Relational Databases (MySQL/PostgreSQL)
- `accounts` - User accounts with authentication
- `users` - User preferences and settings
- `banned_users` - Banned usernames
- `shadowbanned_users` - Shadow banned users
- `ip_bans` - IP address bans
- `user_ip_history` - IP address tracking

### MongoDB
Same logical structure using collections instead of tables.

## Performance Benefits

- **Faster message delivery** - No database latency for real-time messaging
- **Reduced database load** - Only user management operations hit the database
- **Better scalability** - Message handling scales with server memory
- **Simplified deployment** - Smaller database requirements

## Deployment Examples

### Render.com (MySQL)
```yaml
services:
- type: web
  name: chat-app
  runtime: node
  envVars:
    - key: DATABASE_URL
      value: mysql://user:pass@host:3306/chatdb
```

### Render.com (PostgreSQL)
```yaml
services:
- type: web
  name: chat-app
  runtime: node
  envVars:
    - key: DATABASE_URL
      value: postgresql://user:pass@host:5432/chatdb
```

### Render.com (MongoDB)
```yaml
services:
- type: web
  name: chat-app
  runtime: node
  envVars:
    - key: DATABASE_URL
      value: mongodb+srv://user:pass@cluster.mongodb.net/chatdb
```

## Features Supported

### Database Features
- User authentication and accounts
- User management (ban, shadowban)
- IP address tracking and banning
- Admin account seeding
- User profiles and themes
- Persistent user preferences

### In-Memory Features
- Real-time chat messaging
- Private messages
- Message editing and deletion
- Message history (limited to 500 messages)
- User online status
- Typing indicators

## Migration

To switch between databases:
1. Update the `DATABASE_URL` environment variable
2. Restart the application
3. The new database will be automatically initialized with required tables/collections

Note: User data will need to be exported/imported manually if switching database types. Message data is ephemeral and stored in memory only.

## Memory Usage

- Messages: Limited to 500 most recent messages
- Private messages: Limited by available memory
- User data: Persistent in database
- Typical memory usage: ~10-50MB for moderate activity
