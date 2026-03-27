module.exports = {
  // 基本コマンド
  help: {
    description: '利用可能なコマンド一覧を表示します',
    usage: '/help',
    examples: ['/help']
  },
  users: {
    description: '現在オンラインのユーザー一覧を表示します',
    usage: '/users',
    examples: ['/users']
  },
  clear: {
    description: '画面をクリアします（自分のみ）',
    usage: '/clear',
    examples: ['/clear']
  },
  ping: {
    description: 'pong! と返信します',
    usage: '/ping',
    examples: ['/ping']
  },
  time: {
    description: '現在時刻を表示します',
    usage: '/time',
    examples: ['/time']
  },
  roll: {
    description: 'サイコロを振ります',
    usage: '/roll [面数]',
    examples: ['/roll', '/roll 6', '/roll 100']
  },
  
  // 楽しいコマンド
  fortune: {
    description: 'おみくじを引きます',
    usage: '/fortune',
    examples: ['/fortune', '/omikuji']
  },
  omikuji: {
    description: 'おみくじを引きます（別名）',
    usage: '/omikuji',
    examples: ['/omikuji']
  },
  joke: {
    description: 'ジョークを表示します',
    usage: '/joke',
    examples: ['/joke']
  },
  quote: {
    description: '名言を表示します',
    usage: '/quote',
    examples: ['/quote']
  },
  
  // 実用コマンド
  calc: {
    description: '計算を行います',
    usage: '/calc <計算式>',
    examples: ['/calc 2+2', '/calc 10*5']
  },
  emoji: {
    description: '絵文字を送信します',
    usage: '/emoji <絵文字名>',
    examples: ['/emoji heart', '/emoji star', '/emoji fire']
  },
  
  // プライベートメッセージ
  prm: {
    description: 'プライベートメッセージを送信します',
    usage: '/prm <ユーザー名> <メッセージ>',
    examples: ['/prm ユーザー名 こんにちは']
  },
  whisper: {
    description: 'ささやきメッセージを送信します',
    usage: '/whisper <ユーザー名> <メッセージ>',
    examples: ['/whisper ユーザー名 秘密の話']
  },
  
  // 管理者コマンド
  rule: {
    description: 'チャットのルールを表示します（管理者専用）',
    usage: '/rule [ユーザー名]',
    examples: ['/rule', '/rule ユーザー名'],
    adminOnly: true
  },
  delete: {
    description: 'すべてのメッセージを削除します（管理者専用）',
    usage: '/delete',
    examples: ['/delete'],
    adminOnly: true
  },
  prmdelete: {
    description: 'すべてのプライベートメッセージを削除します（管理者専用）',
    usage: '/prmdelete',
    examples: ['/prmdelete'],
    adminOnly: true
  },
  system: {
    description: 'システム情報を表示します（管理者専用）',
    usage: '/system',
    examples: ['/system'],
    adminOnly: true
  },
  ban: {
    description: 'ユーザーをBANします（管理者専用）',
    usage: '/ban <ユーザー名> [理由]',
    examples: ['/ban ユーザー名', '/ban ユーザー名 ルール違反'],
    adminOnly: true
  },
  unban: {
    description: 'ユーザーのBANを解除します（管理者専用）',
    usage: '/unban <ユーザー名>',
    examples: ['/unban ユーザー名'],
    adminOnly: true
  },
  mute: {
    description: 'ユーザーをミュートします（管理者専用）',
    usage: '/mute <ユーザー名> <秒数>',
    examples: ['/mute ユーザー名 60'],
    adminOnly: true
  },
  unmute: {
    description: 'ユーザーのミュートを解除します（管理者専用）',
    usage: '/unmute <ユーザー名>',
    examples: ['/unmute ユーザー名'],
    adminOnly: true
  }
};
