# 🍫 ChocoChat - Multi-Database Real-time Chat Application

A modern real-time chat application with support for multiple database backends (MySQL, PostgreSQL, MongoDB) and modular architecture.

## ✨ Features

- **Multi-Database Support**: MySQL/TiDB, PostgreSQL, or MongoDB for user management
- **Real-time Messaging**: Instant message delivery with Socket.IO
- **In-Memory Messages**: Fast message storage (500 most recent messages)
- **User Authentication**: Secure login/signup with password hashing
- **Admin Commands**: Comprehensive admin tools for chat management
- **Private Messages**: Direct messaging between users
- **Anti-Spam Protection**: Rate limiting and spam detection
- **IP & User Bans**: Flexible ban system including shadowbans
- **Modular Architecture**: Clean, maintainable code structure
- **Responsive Design**: Works on desktop and mobile devices

## 🏗️ Architecture

### Modular Structure
```
├── index.js              # Main application entry point
├── server/               # Modular server components
│   ├── auth.js          # Authentication & user management
│   ├── command.js       # Command processing
│   ├── ip.js            # IP handling & ban management
│   └── message.js       # In-memory message handling
├── database-adapters/    # Database abstraction layer
│   ├── mysql-adapter.js
│   ├── postgresql-adapter.js
│   └── mongodb-adapter.js
└── public/              # Static files
```

### Data Storage
- **Database**: User accounts, preferences, bans, IP history
- **Memory**: Chat messages, private messages, online status

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Database (MySQL, PostgreSQL, or MongoDB)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd chocochat-new-main
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your database settings
```

4. **Start the application**
```bash
npm start
```

Visit `http://localhost:3000` to access the chat application.

## ⚙️ Configuration

### Environment Variables

Create a `.env` file with the following configuration:

```env
# Server settings
PORT=3000
NODE_VERSION=20.11.0

# Database connection (choose one)
# MySQL/TiDB:
DATABASE_URL=mysql://username:password@localhost:3306/chatdb
# PostgreSQL:
DATABASE_URL=postgresql://username:password@localhost:5432/chatdb
# MongoDB:
DATABASE_URL=mongodb://username:password@localhost:27017/chatdb

# Admin passwords
ADMIN_PASSWORD=admin-user-pass=version1-iwyegv
PASS_BANANA=bananananana
PASS_CHOCOWAKAME=wakametube=banana
PASS_BANANA_LEFT=ばななの右腕だよ♡
PASS_BANANA_RIGHT=ばななの左腕だよ☆
PASS_WOOLISBEST_PLUS=html-astroid=gg
PASS_WOOLISBEST=woolisbest=html-astroid=gg
PASS_YOSSHY=thisismypassword
PASS_AIROU=aiueo
```

### Database Setup

#### MySQL/TiDB
```sql
-- Tables are created automatically by the application
-- Just ensure the database exists:
CREATE DATABASE chatdb;
```

#### PostgreSQL
```sql
-- Tables are created automatically by the application
-- Just ensure the database exists:
CREATE DATABASE chatdb;
```

#### MongoDB
```javascript
// Collections are created automatically by the application
// Just ensure the database exists
```

## 📦 Deployment

### Render.com

1. **Connect your repository** to Render
2. **Create a Web Service** with the following settings:
   - Build Command: `npm install`
   - Start Command: `node index.js`
   - Environment Variables: Set your `DATABASE_URL` and admin passwords

3. **Add a PostgreSQL/MySQL Database** (optional) or use external database

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

## 📝 Username Rules

When creating an account or logging in, usernames must follow these rules:

- **Length**: 1-20 characters
- **Allowed characters**: 
  - English letters (a-z, A-Z)
  - Numbers (0-9)
  - Hiragana (ひらがな)
  - Katakana (カタカナ)
  - Kanji (漢字)
  - Symbols and special characters (!@#$%^&* etc.)
  - Emojis 😀
- **Not allowed**:
  - Spaces or whitespace characters
  - Control characters

**Examples of valid usernames**:
- `Taro123`
- `田中太郎`
- `さくら`
- `User2024`
- `タロウ`
- `ユーザー@名`
- `😀user`

**Examples of invalid usernames**:
- `Taro Yamada` (contains space)
- `User\tName` (contains tab character)

## �️ Admin Commands

Available commands for admin users:

- `/help` - Show all available commands
- `/rule` - Display chat rules to everyone
- `/rule [username]` - Send rules to specific user
- `/delete` - Delete all chat messages
- `/prmdelete` - Delete all private messages
- `/system` - Show system information
- `/fortune` - Draw a fortune

## 🛡️ Security Features

- **Password Hashing**: bcrypt for secure password storage
- **Rate Limiting**: 1 message per second per user
- **Anti-Spam**: Detects repeated identical messages
- **IP Bans**: Prevent access from banned IP addresses
- **User Bans**: Block specific usernames
- **Shadow Bans**: Silently block problematic users
- **Token Authentication**: Secure session management

## 📊 Performance

### Memory Usage
- **Messages**: 500 most recent messages (~10-50MB)
- **Private Messages**: Limited by available memory
- **User Sessions**: Active connections only

### Database Load
- **User Management**: Authentication and preferences
- **Ban System**: IP and user ban enforcement
- **Message Storage**: In-memory only (no database load)

## 🔧 Development

### Project Structure

See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) for detailed information about the modular architecture.

### Adding New Features

1. **Database Features**: Modify adapters in `database-adapters/`
2. **Commands**: Add to `server/command.js`
3. **Authentication**: Modify `server/auth.js`
4. **Message Features**: Update `server/message.js`

### Testing

```bash
# Syntax check
node -c index.js
node -c server/*.js

# Start development server
npm start
```

## 📚 Documentation

- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Database configuration guide
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Architecture documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For issues and questions:
1. Check the documentation
2. Review existing issues
3. Create a new issue with detailed information

---

**Built with ❤️ using Node.js, Socket.IO, and Express**
