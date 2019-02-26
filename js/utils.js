export const delay = ms =>
  new Promise(resolve => setTimeout(resolve, ms))

export const defer = async (ms, f, ...args) => {
  await delay(ms)
  return f(...args)
}

export const zipWithIndex = xs =>
  xs.map(R.pair)

export const fst = ([a]) => a
export const snd = ([, b]) => b
