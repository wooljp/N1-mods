module.exports = {
  title: '🍫ちょこちゃっと ルール🍫',
  version: '2.0',
  lastUpdated: '2024-03-25',
  
  sections: [
    {
      title: '基本ルール',
      icon: '📋',
      rules: [
        {
          id: 'basic_1',
          title: '挨拶をしましょう',
          description: '入室時や退室時には挨拶をするのがマナーです。',
          example: '「こんにちは」「おはよう」「おやすみ」など',
          severity: 'guideline'
        },
        {
          id: 'basic_2',
          title: '敬意を持って',
          description: '他のユーザーに対して敬意と礼儀を持って接しましょう。',
          example: '丁寧な言葉遣い、感謝の表現など',
          severity: 'important'
        },
        {
          id: 'basic_3',
          title: '個人情報の保護',
          description: '自分や他人の個人情報を共有しないでください。',
          example: '住所、電話番号、メールアドレスなど',
          severity: 'critical'
        }
      ]
    },
    {
      title: '禁止事項',
      icon: '🚫',
      rules: [
        {
          id: 'prohibited_1',
          title: '暴力的な表現',
          description: '暴力、脅迫、嫌がらせなどの表現は禁止です。',
          example: '「殺す」「傷つける」など',
          severity: 'critical'
        },
        {
          id: 'prohibited_2',
          title: '差別的な発言',
          description: '人種、性別、宗教などに関する差別的な発言は禁止です。',
          example: '特定のグループを攻撃する言葉',
          severity: 'critical'
        },
        {
          id: 'prohibited_3',
          title: 'スパム行為',
          description: '同じメッセージの繰り返しや無意味な投稿は禁止です。',
          example: '連続投稿、意味のない文字列など',
          severity: 'warning'
        },
        {
          id: 'prohibited_4',
          title: '違法行為の助長',
          description: '違法行為を助長するような発言は禁止です。',
          example: '薬物、犯罪に関する話題',
          severity: 'critical'
        },
        {
          id: 'prohibited_5',
          title: '著作権侵害',
          description: '著作権のあるコンテンツの無断転載は禁止です。',
          example: '長文の引用、画像の無断転載など',
          severity: 'warning'
        }
      ]
    },
    {
      title: '推奨事項',
      icon: '✅',
      rules: [
        {
          id: 'recommended_1',
          title: '楽しく会話',
          description: '明るく楽しい雰囲気を作りましょう。',
          example: 'ポジティブな話題、共通の趣味など',
          severity: 'guideline'
        },
        {
          id: 'recommended_2',
          title: '助け合い',
          description: '困っている人がいれば助け合いましょう。',
          example: '質問に答える、情報を提供するなど',
          severity: 'guideline'
        },
        {
          id: 'recommended_3',
          title: '新しい友達作り',
          description: '新しい出会いを楽しみましょう。',
          example: '自己紹介、共通の話題探しなど',
          severity: 'guideline'
        }
      ]
    },
    {
      title: 'プライベートメッセージ',
      icon: '💬',
      rules: [
        {
          id: 'pm_1',
          title: '許可なく送信しない',
          description: '相手の許可なくプライベートメッセージを送らないでください。',
          example: '突然のDM、広告メッセージなど',
          severity: 'warning'
        },
        {
          id: 'pm_2',
          title: '迷惑行為の禁止',
          description: 'プライベートメッセージでの迷惑行為は禁止です。',
          example: 'しつこい連絡、不適切な内容など',
          severity: 'critical'
        }
      ]
    },
    {
      title: '管理者について',
      icon: '👮',
      rules: [
        {
          id: 'admin_1',
          title: '管理者の指示',
          description: '管理者の指示に従ってください。',
          example: '警告、注意、ルールの説明など',
          severity: 'important'
        },
        {
          id: 'admin_2',
          title: '不服申し立て',
          description: '管理者の判断に不服がある場合は、丁寧に説明してください。',
          example: '理由を添えて質問、意見の表明など',
          severity: 'guideline'
        },
        {
          id: 'admin_3',
          title: '管理者の権限',
          description: '管理者はルール違反者に対して処置を行う権限があります。',
          example: '警告、ミュート、BANなど',
          severity: 'information'
        }
      ]
    },
    {
      title: '技術的なルール',
      icon: '💻',
      rules: [
        {
          id: 'tech_1',
          title: '文字数制限',
          description: '1メッセージは200文字以内にしてください。',
          example: '長文は複数に分けて投稿',
          severity: 'guideline'
        },
        {
          id: 'tech_2',
          title: 'ユーザー名',
          description: 'ユーザー名は1〜20文字、スペース以外の文字を使用できます。',
          example: 'ひらがな、カタカナ、漢字、英数字、記号など',
          severity: 'information'
        },
        {
          id: 'tech_3',
          title: '同時接続',
          description: '同一ユーザーの複数接続は制限される場合があります。',
          example: '多重ログインの制限',
          severity: 'information'
        }
      ]
    },
    {
      title: '罰則について',
      icon: '⚖️',
      rules: [
        {
          id: 'penalty_1',
          title: '警告',
          description: '軽度の違反には警告が発せられます。',
          example: '注意喚起、ルールの再説明',
          severity: 'information'
        },
        {
          id: 'penalty_2',
          title: 'ミュート',
          description: '一定期間、発言ができなくなります。',
          example: '1分〜1時間の発言制限',
          severity: 'warning'
        },
        {
          id: 'penalty_3',
          title: 'BAN',
          description: 'チャットから追放されます。',
          example: '期間限定BAN、永久BAN',
          severity: 'critical'
        }
      ]
    },
    {
      title: '特別ルール',
      icon: '🌟',
      rules: [
        {
          id: 'special_1',
          title: 'チョコデー',
          description: '毎月10日はチョコデーです！チョコに関する話題を楽しみましょう。',
          example: 'チョコレートの話、お菓子の話など',
          severity: 'event'
        },
        {
          id: 'special_2',
          title: 'おみくじ',
          description: 'おみくじコマンドで運勢を占えます。',
          example: '/fortune や /omikuji で実行',
          severity: 'fun'
        },
        {
          id: 'special_3',
          title: '絵文字',
          description: '絵文字を自由に使って表現を豊かにしましょう。',
          example: '/emoji コマンドで絵文字を送信',
          severity: 'fun'
        }
      ]
    }
  ],
  
  severity: {
    critical: {
      label: '重大',
      color: '#e74c3c',
      penalty: ['警告', 'ミュート', 'BAN']
    },
    warning: {
      label: '警告',
      color: '#f39c12',
      penalty: ['警告', 'ミュート']
    },
    important: {
      label: '重要',
      color: '#3498db',
      penalty: ['警告']
    },
    guideline: {
      label: '推奨',
      color: '#2ecc71',
      penalty: ['注意']
    },
    information: {
      label: '情報',
      color: '#95a5a6',
      penalty: []
    },
    event: {
      label: 'イベント',
      color: '#9b59b6',
      penalty: []
    },
    fun: {
      label: '楽しみ',
      color: '#e67e22',
      penalty: []
    }
  },
  
  contact: {
    title: 'お問い合わせ',
    description: 'ルールに関する質問や報告は管理者までお願いします。',
    methods: [
      {
        type: 'チャット内',
        description: '管理者に直接メッセージを送信'
      },
      {
        type: 'プライベートメッセージ',
        description: '管理者宛にPMを送信'
      }
    ]
  },
  
  updates: [
    {
      date: '2024-03-25',
      version: '2.0',
      changes: [
        'プライベートメッセージルールを追加',
        '技術的なルールを詳細化',
        '罰則についての説明を追加',
        '特別ルールを新設'
      ]
    },
    {
      date: '2024-01-15',
      version: '1.5',
      changes: [
        '差別的発言の禁止を明確化',
        '著作権侵害の項目を追加',
        '管理者の権限について説明を追加'
      ]
    },
    {
      date: '2023-12-01',
      version: '1.0',
      changes: [
        '基本ルールを制定',
        '禁止事項を設定',
        '推奨事項を追加'
      ]
    }
  ],
  
  footer: {
    message: '🍫皆で楽しいチャットを作りましょう！🍫',
    lastUpdate: '最終更新: 2024-03-25',
    copyright: '© 2024 ちょこちゃっと'
  }
};
