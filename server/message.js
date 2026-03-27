const { generateId } = require('./auth');
const db = require('../database');

// In-memory message storage (fallback)
let messages = [];
let privateMessages = [];
const MAX_HISTORY = 500;

// Anti-spam tracking
const userMessageHistory = new Map();
const userLastMessageTime = new Map();

// Check if database is available for messages
function isMessageDatabaseAvailable() {
  return db.isUsingDatabase() && (db.getDatabaseType().includes('Message') || db.getDatabaseType().includes('postgresql'));
}

function checkMuted(username, mutedUsers) {
  if (mutedUsers.has(username)) {
    const muteInfo = mutedUsers.get(username);
    if (Date.now() < muteInfo.until) {
      const remaining = Math.ceil((muteInfo.until - Date.now()) / 1000);
      return { muted: true, remaining };
    } else {
      mutedUsers.delete(username);
    }
  }
  return { muted: false };
}

function checkRateLimit(username) {
  const now = Date.now();
  const lastTime = userLastMessageTime.get(username);
  
  if (lastTime && now - lastTime < 1000) {
    return false; // Rate limited: 1 message per second
  }
  
  userLastMessageTime.set(username, now);
  return true;
}

function addSpamCheck(username, message) {
  const now = Date.now();
  if (!userMessageHistory.has(username)) {
    userMessageHistory.set(username, []);
  }
  
  const history = userMessageHistory.get(username);
  history.push({ message, timestamp: now });
  
  // Keep only last 10 messages for spam detection
  if (history.length > 10) {
    history.shift();
  }
  
  // Check for spam (same message repeated multiple times)
  const recentMessages = history.slice(-5);
  const messageCount = recentMessages.filter(m => m.message === message).length;
  
  return messageCount >= 3; // Spam if same message repeated 3+ times in last 5 messages
}

function addMessage(messageData) {
  // Try database first, fallback to memory
  if (isMessageDatabaseAvailable()) {
    try {
      db.addMessage(messageData);
    } catch (error) {
      console.log('[Message] Database add failed, using memory fallback');
      memoryAddMessage(messageData);
    }
  } else {
    memoryAddMessage(messageData);
  }
}

function memoryAddMessage(messageData) {
  messages.push(messageData);
  if (messages.length > MAX_HISTORY) {
    messages.shift();
  }
}

function getMessages() {
  // Try database first, fallback to memory
  if (isMessageDatabaseAvailable()) {
    try {
      return db.getMessages();
    } catch (error) {
      console.log('[Message] Database get failed, using memory fallback');
      return messages;
    }
  } else {
    return messages;
  }
}

function addPrivateMessage(messageData) {
  // Try database first, fallback to memory
  if (isMessageDatabaseAvailable()) {
    try {
      db.addPrivateMessage(messageData);
    } catch (error) {
      console.log('[Message] Database PM add failed, using memory fallback');
      memoryAddPrivateMessage(messageData);
    }
  } else {
    memoryAddPrivateMessage(messageData);
  }
}

function memoryAddPrivateMessage(messageData) {
  privateMessages.push(messageData);
}

function getPrivateMessages(user1, user2) {
  // Try database first, fallback to memory
  if (isMessageDatabaseAvailable()) {
    try {
      return db.getPrivateMessages(user1, user2);
    } catch (error) {
      console.log('[Message] Database PM get failed, using memory fallback');
      return memoryGetPrivateMessages(user1, user2);
    }
  } else {
    return memoryGetPrivateMessages(user1, user2);
  }
}

function memoryGetPrivateMessages(user1, user2) {
  return privateMessages.filter(pm => 
    (pm.from === user1 && pm.to === user2) || 
    (pm.from === user2 && pm.to === user1)
  );
}

function getAllPrivateMessagesForUser(username) {
  // Try database first, fallback to memory
  if (isMessageDatabaseAvailable()) {
    try {
      return db.getAllPrivateMessagesForUser(username);
    } catch (error) {
      console.log('[Message] Database PM get all failed, using memory fallback');
      return memoryGetAllPrivateMessagesForUser(username);
    }
  } else {
    return memoryGetAllPrivateMessagesForUser(username);
  }
}

function memoryGetAllPrivateMessagesForUser(username) {
  return privateMessages.filter(pm => pm.from === username || pm.to === username);
}

function getAllPrivateMessages() {
  // Try database first, fallback to memory
  if (isMessageDatabaseAvailable()) {
    try {
      return db.getAllPrivateMessages();
    } catch (error) {
      console.log('[Message] Database PM get all failed, using memory fallback');
      return privateMessages;
    }
  } else {
    return privateMessages;
  }
}

function updateMessage(id, newMessage) {
  // Try database first, fallback to memory
  if (isMessageDatabaseAvailable()) {
    try {
      db.updateMessage(id, newMessage);
    } catch (error) {
      console.log('[Message] Database update failed, using memory fallback');
      memoryUpdateMessage(id, newMessage);
    }
  } else {
    memoryUpdateMessage(id, newMessage);
  }
}

function memoryUpdateMessage(id, newMessage) {
  const index = messages.findIndex(m => m.id === id);
  if (index !== -1) {
    messages[index].message = newMessage;
    messages[index].edited = true;
    messages[index].editedAt = new Date().toISOString();
  }
}

function deleteMessage(id) {
  // Try database first, fallback to memory
  if (isMessageDatabaseAvailable()) {
    try {
      return db.deleteMessage(id);
    } catch (error) {
      console.log('[Message] Database delete failed, using memory fallback');
      return memoryDeleteMessage(id);
    }
  } else {
    return memoryDeleteMessage(id);
  }
}

function memoryDeleteMessage(id) {
  const index = messages.findIndex(m => m.id === id);
  if (index !== -1) {
    const deletedMessage = messages[index];
    messages.splice(index, 1);
    return deletedMessage;
  }
  return null;
}

function deleteAllMessages() {
  // Try database first, fallback to memory
  if (isMessageDatabaseAvailable()) {
    try {
      db.deleteAllMessages();
    } catch (error) {
      console.log('[Message] Database delete all failed, using memory fallback');
      memoryDeleteAllMessages();
    }
  } else {
    memoryDeleteAllMessages();
  }
}

function memoryDeleteAllMessages() {
  messages = [];
}

function deletePrivateMessage(id) {
  // Try database first, fallback to memory
  if (isMessageDatabaseAvailable()) {
    try {
      return db.deletePrivateMessage(id);
    } catch (error) {
      console.log('[Message] Database PM delete failed, using memory fallback');
      return memoryDeletePrivateMessage(id);
    }
  } else {
    return memoryDeletePrivateMessage(id);
  }
}

function memoryDeletePrivateMessage(id) {
  const index = privateMessages.findIndex(pm => pm.id === id);
  if (index !== -1) {
    const deletedMessage = privateMessages[index];
    privateMessages.splice(index, 1);
    return deletedMessage;
  }
  return null;
}

function deleteAllPrivateMessages() {
  // Try database first, fallback to memory
  if (isMessageDatabaseAvailable()) {
    try {
      db.deleteAllPrivateMessages();
    } catch (error) {
      console.log('[Message] Database PM delete all failed, using memory fallback');
      memoryDeleteAllPrivateMessages();
    }
  } else {
    memoryDeleteAllPrivateMessages();
  }
}

function memoryDeleteAllPrivateMessages() {
  privateMessages = [];
}

function findMessage(id) {
  // Try database first, fallback to memory
  if (isMessageDatabaseAvailable()) {
    try {
      const dbMessages = db.getMessages();
      return dbMessages.find(m => m.id === id);
    } catch (error) {
      console.log('[Message] Database find failed, using memory fallback');
      return messages.find(m => m.id === id);
    }
  } else {
    return messages.find(m => m.id === id);
  }
}

function findPrivateMessage(id) {
  // Try database first, fallback to memory
  if (isMessageDatabaseAvailable()) {
    try {
      const dbPMs = db.getAllPrivateMessages();
      return dbPMs.find(pm => pm.id === id);
    } catch (error) {
      console.log('[Message] Database PM find failed, using memory fallback');
      return privateMessages.find(pm => pm.id === id);
    }
  } else {
    return privateMessages.find(pm => pm.id === id);
  }
}

module.exports = {
  MAX_HISTORY,
  checkMuted,
  checkRateLimit,
  addSpamCheck,
  addMessage,
  getMessages,
  addPrivateMessage,
  getPrivateMessages,
  getAllPrivateMessagesForUser,
  getAllPrivateMessages,
  updateMessage,
  deleteMessage,
  deleteAllMessages,
  deletePrivateMessage,
  deleteAllPrivateMessages,
  findMessage,
  findPrivateMessage
};
