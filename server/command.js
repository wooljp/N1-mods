const { generateId } = require('./auth');
const messageModule = require('./message');
const db = require('../database');

const fortunes = require('../data/fortunes');
const emojis = require('../data/emojis');
const jokes = require('../data/jokes');
const quotes = require('../data/quotes');
const ruleText = require('../data/ruleText');

function drawFortune() {
  const totalWeight = fortunes.reduce((sum, f) => sum + f.weight, 0);
  let random = Math.random() * totalWeight;
  for (const fortune of fortunes) {
    random -= fortune.weight;
    if (random <= 0) return fortune;
  }
  return fortunes[0];
}

function getRandomJoke() {
  return jokes[Math.floor(Math.random() * jokes.length)];
}

function getRandomQuote() {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

function getRuleText(username, isAdmin) {
  return ruleText(username, isAdmin);
}

async function processCommand(command, username, socket, io, users, isAdmin, isPrivilegedAdmin) {
  const parts = command.trim().split(' ');
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  // 管理者コマンドのリスト
  const adminCommands = ['/delete', '/prmdelete', '/rule', '/system', '/ban', '/unban', '/mute', '/unmute', '/mutelist', '/banlist'];
  const privilegedAdminCommands = ['/ipban', '/ipunban', '/ipbanlist'];
  const allAdminCommands = [...adminCommands, ...privilegedAdminCommands];

  // パスをチェック（chat.htmlからの管理者コマンドを制限）
  const referer = socket.handshake.headers.referer || '';
  const isFromChat = referer.includes('/chat') || referer.endsWith('/');
  
  if (isFromChat && allAdminCommands.includes(cmd)) {
    return { type: 'error', message: 'このコマンドは管理者ページ(/admin)で使用してください' };
  }

  switch (cmd) {
    // === 管理者コマンド ===
    case '/delete':
      if (!isPrivilegedAdmin) {
        return { type: 'error', message: 'このコマンドは特権管理者専用です' };
      }
      messageModule.deleteAllMessages();
      io.emit('allMessagesDeleted');
      io.emit('systemMessage', '特権管理者がすべてのメッセージを削除しました');
      return { type: 'silent' };

    case '/rule':
      if (!isAdmin) {
        return { type: 'error', message: 'このコマンドは管理者専用です' };
      }

      const ruleMessageText = getRuleText(username, isAdmin);

      if (args.length >= 1) {
        // Targeted rule (Private to the user)
        const ruleTarget = args[0];
        if (!socket.userSockets.has(ruleTarget)) {
          return { type: 'error', message: 'そのユーザーはオンラインではありません' };
        }

        const ruleTargetData = {
          id: generateId(),
          username: username,
          message: `@${ruleTarget} さんへ (個別案内)\n\n${ruleMessageText}`,
          color: users[username]?.color || '#000000',
          timestamp: new Date().toISOString(),
          isCommandResult: true
        };

        const targetSocketSet = socket.userSockets.get(ruleTarget);
        for (const sid of targetSocketSet) {
          const targetSocketObj = io.sockets.sockets.get(sid);
          if (targetSocketObj) {
            targetSocketObj.emit('message', ruleTargetData);
          }
        }

        socket.emit('systemMessage', `${ruleTarget} さんに個別ルール説明を送信しました`);
        return { type: 'private', message: `${ruleTarget} さんへの個別送信完了` };
      } else {
        // Broadcast rule (To everyone)
        const ruleBroadcastData = {
          id: generateId(),
          username: username,
          message: `【全体案内】\n\n${ruleMessageText}`,
          color: users[username]?.color || '#000000',
          timestamp: new Date().toISOString(),
          isCommandResult: true
        };
        
        messageModule.addMessage(ruleBroadcastData);
        io.emit('message', ruleBroadcastData);
        return { type: 'private', message: `全員にルール説明を表示しました` };
      }

    case '/prmdelete':
      if (!isPrivilegedAdmin) {
        return { type: 'error', message: 'このコマンドは特権管理者専用です' };
      }
      messageModule.deleteAllPrivateMessages();
      io.emit('allPrivateMessagesDeleted');
      io.emit('systemMessage', '特権管理者がすべてのプライベートメッセージを削除しました');
      return { type: 'silent' };

    case '/system':
      if (!isAdmin) {
        return { type: 'error', message: 'このコマンドは管理者専用です' };
      }
      const nowTime = Date.now();
      const muteList = [];
      
      for (const [user, data] of socket.mutedUsers) {
        if (data.until > nowTime) {
          const remaining = Math.ceil((data.until - nowTime) / 1000);
          muteList.push(`${user}: ${remaining}秒`);
        }
      }
      
      const banList = await db.getBannedUsers();
      const shadowBanList = await db.getShadowBannedUsers();
      
      const systemInfo = `=== システム情報 ===\n` +
        `オンラインユーザー: ${socket.getUniqueOnlineUsers().length}人\n` +
        `総メッセージ数: ${messageModule.getMessages().length}件\n` +
        `総プライベートメッセージ数: ${messageModule.getAllPrivateMessages().length}件\n` +
        `現在ミュート中: ${muteList.length}人\n` +
        `BAN済みユーザー: ${banList.length}人\n` +
        `シャドウBAN済み: ${shadowBanList.length}人\n` +
        `サーバー起動時間: ${new Date(nowTime).toLocaleString('ja-JP')}`;
        
      if (muteList.length > 0) {
        return { type: 'system', message: systemInfo + `\n\n=== ミュート中ユーザー ===\n${muteList.join('\n')}` };
      }
      
      return { type: 'system', message: systemInfo };

    // === 基本コマンド ===
    case '/users':
      const onlineUsers = socket.getUniqueOnlineUsers();
      const usersList = onlineUsers.length > 0 
        ? `現在オンライン中 (${onlineUsers.length}人):\n${onlineUsers.join(', ')}`
        : '現在オンライン中のユーザーはいません';
      return { type: 'system', message: usersList };

    case '/clear':
      socket.emit('clearMessages');
      return { type: 'silent', message: '画面をクリアしました' };

    case '/ping':
      return { type: 'system', message: 'pong! 🏓' };

    case '/time':
      const now = new Date();
      const timeString = `現在時刻: ${now.toLocaleString('ja-JP')}`;
      return { type: 'system', message: timeString };

    case '/roll':
      let sides = 6;
      if (args.length > 0) {
        sides = parseInt(args[0]);
        if (isNaN(sides) || sides < 2 || sides > 100) {
          return { type: 'error', message: '面数は2〜100の数字で指定してください' };
        }
      }
      const result = Math.floor(Math.random() * sides) + 1;
      return { type: 'system', message: `🎲 ${sides}面サイコロ: ${result}` };

    // === 楽しいコマンド ===
    case '/fortune':
    case '/omikuji':
      const fortune = drawFortune();
      const fortuneMessage = `🍬 おみくじ 🍬\n\n${fortune.result}`;
      
      const fortuneData = {
        id: generateId(),
        username: 'おみくじ',
        message: fortuneMessage,
        color: '#FF69B4',
        timestamp: new Date().toISOString(),
        isCommandResult: true
      };
      
      messageModule.addMessage(fortuneData);
      io.emit('message', fortuneData);
      return { type: 'silent' };

    case '/joke':
      const joke = getRandomJoke();
      const jokeData = {
        id: generateId(),
        username: 'ジョーク',
        message: joke,
        color: '#FFA500',
        timestamp: new Date().toISOString(),
        isCommandResult: true
      };
      
      messageModule.addMessage(jokeData);
      io.emit('message', jokeData);
      return { type: 'silent' };

    case '/quote':
      const quote = getRandomQuote();
      const quoteData = {
        id: generateId(),
        username: '名言',
        message: quote,
        color: '#9370DB',
        timestamp: new Date().toISOString(),
        isCommandResult: true
      };
      
      messageModule.addMessage(quoteData);
      io.emit('message', quoteData);
      return { type: 'silent' };

    // === 実用コマンド ===
    case '/calc':
      if (args.length === 0) {
        return { type: 'error', message: '計算式を指定してください (例: /calc 2+2)' };
      }
      
      try {
        const expression = args.join(' ');
        // 簡単な数式評価（安全のため）
        const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
        if (sanitized !== expression) {
          return { type: 'error', message: '使用できるのは数字と +, -, *, /, () のみです' };
        }
        
        const result = Function('"use strict"; return (' + sanitized + ')')();
        return { type: 'system', message: `計算結果: ${expression} = ${result}` };
      } catch (error) {
        return { type: 'error', message: '計算式が正しくありません' };
      }

    case '/emoji':
      if (args.length === 0) {
        const emojiList = Object.keys(emojis).slice(0, 20).join(', ');
        return { type: 'system', message: `利用可能な絵文字: ${emojiList}...` };
      }
      
      const emojiName = args[0].toLowerCase();
      if (emojis[emojiName]) {
        const emojiData = {
          id: generateId(),
          username: username,
          message: emojis[emojiName],
          color: users[username]?.color || '#000000',
          timestamp: new Date().toISOString(),
          isCommandResult: true
        };
        
        messageModule.addMessage(emojiData);
        io.emit('message', emojiData);
        return { type: 'silent' };
      } else {
        return { type: 'error', message: `絵文字 "${emojiName}" は見つかりません` };
      }

    // === プライベートメッセージ ===
    case '/prm':
    case '/whisper':
      if (args.length < 2) {
        return { type: 'error', message: '使用方法: /prm <ユーザー名> <メッセージ>' };
      }
      
      const targetUser = args[0];
      const pmMessage = args.slice(1).join(' ');
      
      if (!socket.userSockets.has(targetUser)) {
        return { type: 'error', message: 'ユーザーがオンラインではありません' };
      }
      
      if (targetUser === username) {
        return { type: 'error', message: '自分には送信できません' };
      }
      
      const pmData = {
        id: generateId(),
        from: username,
        to: targetUser,
        message: pmMessage,
        timestamp: new Date().toISOString()
      };
      
      // プライベートメッセージを保存
      messageModule.addPrivateMessage(pmData);
      
      // 送信者と受信者に送信
      const pmMessageData = {
        id: generateId(),
        username: username,
        message: `🔒 @${targetUser} さんへ: ${pmMessage}`,
        color: '#8B4513',
        timestamp: new Date().toISOString(),
        isPrivate: true,
        from: username,
        to: targetUser
      };
      
      // 送信者に表示
      socket.emit('privateMessage', pmMessageData);
      
      // 受信者に送信
      const targetSocketSet = socket.userSockets.get(targetUser);
      for (const sid of targetSocketSet) {
        const targetSocketObj = io.sockets.sockets.get(sid);
        if (targetSocketObj) {
          targetSocketObj.emit('privateMessage', {
            ...pmMessageData,
            message: `🔒 @${username} さんから: ${pmMessage}`
          });
        }
      }
      
      return { type: 'private', message: `${targetUser} さんにプライベートメッセージを送信しました` };

    // === 管理者用BAN/ミュートコマンド ===
    case '/ban':
      if (!isAdmin) {
        return { type: 'error', message: 'このコマンドは管理者専用です' };
      }
      if (args.length === 0) {
        return { type: 'error', message: '使用方法: /ban <ユーザー名> [理由]' };
      }
      
      const banTarget = args[0];
      const banReason = args.slice(1).join(' ') || 'ルール違反';
      
      if (!socket.userSockets.has(banTarget)) {
        return { type: 'error', message: 'ユーザーがオンラインではありません' };
      }
      
      try {
        await db.addBannedUser(banTarget, banReason, username);
        
        // ターゲットの全ソケットを切断
        const targetSocketSet = socket.userSockets.get(banTarget);
        for (const sid of targetSocketSet) {
          const targetSocketObj = io.sockets.sockets.get(sid);
          if (targetSocketObj) {
            targetSocketObj.emit('banned', { message: `BANされました。理由: ${banReason}` });
            targetSocketObj.disconnect();
          }
        }
        
        io.emit('systemMessage', `${banTarget} がBANされました (理由: ${banReason})`);
        return { type: 'private', message: `${banTarget} をBANしました` };
      } catch (error) {
        return { type: 'error', message: 'BANに失敗しました' };
      }

    case '/unban':
      if (!isAdmin) {
        return { type: 'error', message: 'このコマンドは管理者専用です' };
      }
      if (args.length === 0) {
        return { type: 'error', message: '使用方法: /unban <ユーザー名>' };
      }
      
      const unbanTarget = args[0];
      
      try {
        await db.removeBannedUser(unbanTarget);
        io.emit('systemMessage', `${unbanTarget} のBANが解除されました`);
        return { type: 'private', message: `${unbanTarget} のBANを解除しました` };
      } catch (error) {
        return { type: 'error', message: 'BAN解除に失敗しました' };
      }

    case '/mute':
      if (!isAdmin) {
        return { type: 'error', message: 'このコマンドは管理者専用です' };
      }
      if (args.length < 2) {
        return { type: 'error', message: '使用方法: /mute <ユーザー名> <秒数>' };
      }
      
      const muteTarget = args[0];
      const muteSeconds = parseInt(args[1]);
      
      if (isNaN(muteSeconds) || muteSeconds < 1 || muteSeconds > 3600) {
        return { type: 'error', message: '秒数は1〜3600で指定してください' };
      }
      
      if (!socket.userSockets.has(muteTarget)) {
        return { type: 'error', message: 'ユーザーがオンラインではありません' };
      }
      
      socket.mutedUsers.set(muteTarget, {
        until: Date.now() + (muteSeconds * 1000),
        by: username
      });
      
      io.emit('systemMessage', `${muteTarget} が${muteSeconds}秒間ミュートされました`);
      return { type: 'private', message: `${muteTarget} を${muteSeconds}秒間ミュートしました` };

    case '/unmute':
      if (!isAdmin) {
        return { type: 'error', message: 'このコマンドは管理者専用です' };
      }
      if (args.length === 0) {
        return { type: 'error', message: '使用方法: /unmute <ユーザー名>' };
      }
      
      const unmuteTarget = args[0];
      
      if (socket.mutedUsers.has(unmuteTarget)) {
        socket.mutedUsers.delete(unmuteTarget);
        io.emit('systemMessage', `${unmuteTarget} のミュートが解除されました`);
        return { type: 'private', message: `${unmuteTarget} のミュートを解除しました` };
      } else {
        return { type: 'error', message: 'ユーザーはミュートされていません' };
      }

    case '/mutelist':
      if (!isAdmin) {
        return { type: 'error', message: 'このコマンドは管理者専用です' };
      }
      
      if (socket.mutedUsers.size === 0) {
        return { type: 'system', message: 'ミュートされているユーザーはいません' };
      }
      
      let muteListText = '=== ミュートユーザーリスト ===\n\n';
      const currentTime = Date.now();
      
      for (const [username, muteData] of socket.mutedUsers.entries()) {
        const remainingTime = Math.max(0, Math.ceil((muteData.until - currentTime) / 1000));
        const remainingMinutes = Math.floor(remainingTime / 60);
        const remainingSeconds = remainingTime % 60;
        
        muteListText += `🔇 ${username}\n`;
        muteListText += `   残り時間: ${remainingMinutes}分${remainingSeconds}秒\n`;
        muteListText += `   ミュート者: ${muteData.by}\n`;
        muteListText += `   終了時刻: ${new Date(muteData.until).toLocaleString('ja-JP')}\n\n`;
      }
      
      return { type: 'system', message: muteListText };

    // === 特権管理者専用IPバンコマンド ===
    case '/ipban':
      if (!isPrivilegedAdmin) {
        return { type: 'error', message: 'このコマンドは特権管理者専用です' };
      }
      if (args.length === 0) {
        return { type: 'error', message: '使用方法: /ipban <ユーザー名またはIPアドレス> [理由]' };
      }
      
      const ipBanTarget = args[0];
      const ipBanReason = args.slice(1).join(' ') || 'ルール違反';
      
      try {
        // ユーザー名の場合はIPを取得
        let targetIp = ipBanTarget;
        if (socket.userSockets.has(ipBanTarget)) {
          const targetSocketSet = socket.userSockets.get(ipBanTarget);
          for (const sid of targetSocketSet) {
            const targetSocketObj = io.sockets.sockets.get(sid);
            if (targetSocketObj && targetSocketObj.handshake.address) {
              targetIp = targetSocketObj.handshake.address;
              break;
            }
          }
        }
        
        await db.addBannedIP(targetIp, ipBanReason, username);
        
        // 該当IPを持つ全ユーザーを切断
        for (const [user, socketSet] of socket.userSockets.entries()) {
          for (const sid of socketSet) {
            const userSocket = io.sockets.sockets.get(sid);
            if (userSocket && userSocket.handshake.address === targetIp) {
              userSocket.emit('banned', { message: `IP BANされました。理由: ${ipBanReason}` });
              userSocket.disconnect();
            }
          }
        }
        
        io.emit('systemMessage', `IP ${targetIp} がBANされました (理由: ${ipBanReason})`);
        return { type: 'private', message: `IP ${targetIp} をBANしました` };
      } catch (error) {
        return { type: 'error', message: 'IP BANに失敗しました' };
      }

    case '/ipunban':
      if (!isPrivilegedAdmin) {
        return { type: 'error', message: 'このコマンドは特権管理者専用です' };
      }
      if (args.length === 0) {
        return { type: 'error', message: '使用方法: /ipunban <IPアドレス>' };
      }
      
      const ipUnbanTarget = args[0];
      
      try {
        await db.removeBannedIP(ipUnbanTarget);
        io.emit('systemMessage', `IP ${ipUnbanTarget} のBANが解除されました`);
        return { type: 'private', message: `IP ${ipUnbanTarget} のBANを解除しました` };
      } catch (error) {
        return { type: 'error', message: 'IP BAN解除に失敗しました' };
      }

    case '/banlist':
      if (!isAdmin) {
        return { type: 'error', message: 'このコマンドは管理者専用です' };
      }
      
      try {
        const bannedUsers = await db.getBannedUsers();
        if (bannedUsers.length === 0) {
          return { type: 'system', message: 'BANされているユーザーはいません' };
        }
        
        let banListText = '=== BANユーザーリスト ===\n\n';
        bannedUsers.forEach(ban => {
          banListText += `🚫 ${ban.username}\n`;
          banListText += `   理由: ${ban.reason}\n`;
          banListText += `   BAN者: ${ban.bannedBy}\n`;
          banListText += `   日時: ${new Date(ban.bannedAt).toLocaleString('ja-JP')}\n\n`;
        });
        
        return { type: 'system', message: banListText };
      } catch (error) {
        return { type: 'error', message: 'BANリストの取得に失敗しました' };
      }

    case '/ipbanlist':
      if (!isPrivilegedAdmin) {
        return { type: 'error', message: 'このコマンドは特権管理者専用です' };
      }
      
      try {
        const bannedIPs = await db.getBannedIPs();
        if (bannedIPs.length === 0) {
          return { type: 'system', message: 'BANされているIPはありません' };
        }
        
        let ipBanListText = '=== IP BANリスト ===\n\n';
        bannedIPs.forEach(ban => {
          ipBanListText += `🚫 ${ban.ip}\n`;
          ipBanListText += `   理由: ${ban.reason}\n`;
          ipBanListText += `   BAN者: ${ban.bannedBy}\n`;
          ipBanListText += `   日時: ${new Date(ban.bannedAt).toLocaleString('ja-JP')}\n\n`;
        });
        
        return { type: 'system', message: ipBanListText };
      } catch (error) {
        return { type: 'error', message: 'IP BANリストの取得に失敗しました' };
      }

    // === ヘルプ ===
    case '/help':
      const referer = socket.handshake.headers.referer || '';
      const isFromChat = referer.includes('/chat') || referer.endsWith('/');
      
      let helpText;
      
      if (isFromChat) {
        // chat.html用のヘルプ（一般ユーザー向け）
        helpText = `=== 利用可能なコマンド ===\n\n` +
          `📋 基本コマンド:\n` +
          `/users - オンラインユーザー一覧\n` +
          `/clear - 画面をクリア\n` +
          `/ping - pong! と返信\n` +
          `/time - 現在時刻を表示\n` +
          `/roll [面数] - サイコロを振る\n\n` +
          `🎲 楽しいコマンド:\n` +
          `/fortune - おみくじを引く\n` +
          `/joke - ジョークを表示\n` +
          `/quote - 名言を表示\n` +
          `/calc <計算式> - 計算を実行\n` +
          `/emoji <名前> - 絵文字を送信\n\n` +
          `💬 プライベートメッセージ:\n` +
          `/prm <ユーザー名> <メッセージ> - プライベートメッセージ\n` +
          `/whisper <ユーザー名> <メッセージ> - ささやき\n\n` +
          `🔧 管理者コマンド:\n` +
          `管理者ページ(/admin)で使用可能です\n\n` +
          `/help - このヘルプを表示`;
      } else {
        // admin.html用のヘルプ（管理者向け）
        helpText = `=== 利用可能なコマンド ===\n\n` +
          `📋 基本コマンド:\n` +
          `/users - オンラインユーザー一覧\n` +
          `/clear - 画面をクリア\n` +
          `/ping - pong! と返信\n` +
          `/time - 現在時刻を表示\n` +
          `/roll [面数] - サイコロを振る\n\n` +
          `🎲 楽しいコマンド:\n` +
          `/fortune - おみくじを引く\n` +
          `/joke - ジョークを表示\n` +
          `/quote - 名言を表示\n` +
          `/calc <計算式> - 計算を実行\n` +
          `/emoji <名前> - 絵文字を送信\n\n` +
          `💬 プライベートメッセージ:\n` +
          `/prm <ユーザー名> <メッセージ> - プライベートメッセージ\n` +
          `/whisper <ユーザー名> <メッセージ> - ささやき\n\n` +
          `👮 管理者コマンド:\n` +
          `/rule [ユーザー名] - ルール説明\n` +
          `/system - システム情報\n` +
          `/ban <ユーザー名> [理由] - BAN\n` +
          `/unban <ユーザー名> - BAN解除\n` +
          `/mute <ユーザー名> <秒数> - ミュート\n` +
          `/unmute <ユーザー名> - ミュート解除\n` +
          `/mutelist - ミュートユーザーリスト表示\n` +
          `/banlist - BANユーザーリスト表示\n\n` +
          `🔐 特権管理者専用コマンド:\n` +
          `/delete - 全メッセージ削除\n` +
          `/prmdelete - 全PM削除\n` +
          `/ipban <ユーザー名またはIP> [理由] - IP BAN\n` +
          `/ipunban <IPアドレス> - IP BAN解除\n` +
          `/ipbanlist - IP BANリスト表示\n\n` +
          `/help - このヘルプを表示`;
      }
        
      return { type: 'system', message: helpText };

    default:
      return { type: 'error', message: '不明なコマンドです。/help でコマンド一覧を表示できます。' };
  }
}

module.exports = {
  processCommand,
  drawFortune
};
