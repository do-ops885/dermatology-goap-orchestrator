module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'ci', 'revert'],
    ],
  },
  parserPreset: {
    parserOpts: {
      // Matches optional emoji + conventional commit format
      // Group 1 (optional): Emoji like 📝, ✅, 🐛
      // Group 2: Type (feat, fix, docs, etc.)
      // Group 3 (optional): Scope
      // Group 4: Subject
      headerPattern:
        /^(?:([\u2600-\u27BF\uE000-\uF8FF\U0001F300-\U0001F9FF])\s+)?(\w+)(?:\((.*)\))?:\s(.*)$/u,
      headerCorrespondence: ['emoji', 'type', 'scope', 'subject'],
    },
  },
};
