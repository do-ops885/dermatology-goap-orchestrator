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
      headerPattern: /^(?:(\p{Emoji_Presentation}\s))?(?:(\w+)(?:\((.*)\))?:\s(.*)|\b(wip)\b.*)$/u,
      headerCorrespondence: ['emoji', 'type', 'scope', 'subject'],
    },
  },
};
