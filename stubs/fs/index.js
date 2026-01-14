export const readFileSync = () => '';
export const writeFileSync = () => {};
export const existsSync = () => false;
export const mkdirSync = () => {};
export const promises = { readFile: () => Promise.resolve(''), writeFile: () => Promise.resolve() };
export const dirname = () => '';
export const readFile = () => Promise.resolve('');
export const writeFile = () => Promise.resolve();
export default { readFileSync, writeFileSync, existsSync, mkdirSync, promises, dirname, readFile, writeFile };
