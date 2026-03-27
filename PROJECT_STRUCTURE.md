# Project Structure

This document describes the modular structure of the chat application.

## File Organization

```
chocochat-new-main/
├── index.js                 # Main application entry point
├── database.js              # Database configuration and adapter selection
├── package.json             # Dependencies and scripts
├── render.yaml              # Render deployment configuration
├── DATABASE_SETUP.md        # Database configuration guide
├── PROJECT_STRUCTURE.md     # This file
├── data/
│   └── fortunes.js         # Fortune data for /fortune command
├── public/
│   ├── chat.html           # Main chat interface
│   └── ...                 # Other static files
├── server/                 # Modular server components
│   ├── auth.js            # Authentication and user management
│   ├── command.js         # Command processing (/help, /rule, etc.)
│   ├── ip.js              # IP address handling and ban management
│   └── message.js         # In-memory message handling
└── database-adapters/      # Database abstraction layer
    ├── index.js           # Adapter factory
    ├── base-adapter.js    # Base adapter interface
    ├── mysql-adapter.js   # MySQL/TiDB implementation
    ├── postgresql-adapter.js # PostgreSQL implementation
    └── mongodb-adapter.js # MongoDB implementation
```

## Module Responsibilities

### index.js
- Main application entry point
- Express server setup
- Socket.IO connection handling
- Module integration
- Server startup and graceful shutdown

### server/auth.js
- User authentication (signup, login, logout)
- Token management
- Profile management
- Password hashing
- Account validation

### server/command.js
- Command processing (/help, /rule, /delete, etc.)
- Admin commands
- System information
- Fortune drawing
- Rule broadcasting

### server/ip.js
- IP address normalization and validation
- Ban management (IP bans, user bans, shadowbans)
- IP history tracking
- Geographic location handling
- Ban enforcement

### server/message.js
- In-memory message storage
- Message history management (500 message limit)
- Private message handling
- Anti-spam protection
- Rate limiting
- Message editing and deletion

### database.js
- Database connection management
- Adapter selection based on DATABASE_URL
- Configuration parsing
- Database type detection

### database-adapters/
- Database abstraction layer
- Multi-database support (MySQL, PostgreSQL, MongoDB)
- User and account management only
- Persistent data storage

## Data Flow

1. **Authentication Flow**
   - Client → index.js → server/auth.js → database-adapters/ → Database
   - Returns user session and profile data

2. **Message Flow**
   - Client → index.js → server/message.js → In-memory storage
   - Broadcast to all connected clients
   - No database involvement for better performance

3. **Command Flow**
   - Client → index.js → server/command.js
   - May interact with other modules (ip.js, message.js, auth.js)
   - Admin commands may access database through adapters

4. **Ban/Management Flow**
   - Admin command → index.js → server/ip.js → database-adapters/ → Database
   - Persistent storage of ban data

## Memory Management

### In-Memory Storage
- **Messages**: Limited to 500 most recent messages
- **Private Messages**: Limited by available memory
- **User Sessions**: Active connections only
- **Rate Limiting**: Per-user timestamp tracking
- **Anti-Spam**: Recent message history (last 10 messages)

### Persistent Storage (Database)
- User accounts and authentication
- User preferences and settings
- Ban lists (users, IPs, shadowbans)
- IP address history
- Admin account seeding

## Performance Benefits

- **Fast Message Delivery**: No database latency for real-time messaging
- **Reduced Database Load**: Only user management operations hit the database
- **Scalable Message Handling**: Memory-based message storage scales with server resources
- **Efficient Command Processing**: Modular design allows for optimized command handling

## Security Features

- **IP-based Bans**: Prevents banned users from rejoining
- **Rate Limiting**: 1 message per second per user
- **Anti-Spam**: Detects repeated identical messages
- **Shadow Banning**: Silently blocks problematic users
- **Token-based Authentication**: Secure session management

## Deployment Considerations

- **Memory Requirements**: ~10-50MB for moderate activity
- **Database Requirements**: Only for user management (smaller footprint)
- **Horizontal Scaling**: Multiple instances can share database but have independent message storage
- **Session Persistence**: Users may lose message history when switching between instances

## Development Guidelines

### Adding New Commands
1. Add command case in `server/command.js`
2. Update help text if needed
3. Test with both admin and regular users

### Adding New Features
1. Determine if feature needs persistence (database) or real-time (memory)
2. Create appropriate module in `server/` directory
3. Update `index.js` to integrate the new module
4. Update documentation

### Database Changes
1. Modify all adapters in `database-adapters/`
2. Update `base-adapter.js` interface if needed
3. Test with all supported database types
4. Update `DATABASE_SETUP.md`
