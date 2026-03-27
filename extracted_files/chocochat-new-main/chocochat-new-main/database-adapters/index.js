const MySQLAdapter = require('./mysql-adapter');
const PostgreSQLAdapter = require('./postgresql-adapter');
const MongoDBAdapter = require('./mongodb-adapter');

class DatabaseFactory {
  static createAdapter(type, config) {
    switch (type.toLowerCase()) {
      case 'mysql':
      case 'tidb':
        return new MySQLAdapter(config);
      case 'postgresql':
      case 'postgres':
        return new PostgreSQLAdapter(config);
      case 'mongodb':
      case 'mongo':
        return new MongoDBAdapter(config);
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }

  static detectDatabaseType(connectionString) {
    if (!connectionString) return null;
    
    if (connectionString.startsWith('mysql://') || connectionString.includes('tidb')) {
      return 'mysql';
    } else if (connectionString.startsWith('postgresql://') || connectionString.startsWith('postgres://')) {
      return 'postgresql';
    } else if (connectionString.startsWith('mongodb://') || connectionString.startsWith('mongodb+srv://')) {
      return 'mongodb';
    }
    
    return null;
  }
}

module.exports = {
  DatabaseFactory,
  MySQLAdapter,
  PostgreSQLAdapter,
  MongoDBAdapter
};
