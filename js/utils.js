export const delay = ms =>
  new Promise(resolve => setTimeout(resolve, ms))

export const defer = async (ms, f, ...args) => {
  await delay(ms)
  return f(...args)
}
