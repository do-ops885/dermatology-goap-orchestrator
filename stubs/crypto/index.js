export const getRandomValues = () => new Uint8Array(16);
export const createHash = () => ({
  update: () => null,
  digest: () => 'hashed',
});
export default { getRandomValues, createHash };
