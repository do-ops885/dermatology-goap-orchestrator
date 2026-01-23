export default {
  argv: [],
  env: {},
  platform: 'browser',
  version: '',
  nextTick: (fn, ...args) => setTimeout(fn, 0, ...args),
  hrtime: () => {
    const now = Date.now() / 1000;
    return [Math.floor(now), (now % 1) * 1e9];
  },
};
