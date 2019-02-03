// https://github.com/matplotlib/matplotlib/blob/master/lib/matplotlib/colors.py

const CM = {};

(function (exports) {

  const N = 256

  const WHITE = [1, 1, 1, 1]
  const BLACK = [0, 0, 0, 1]
  const MONOCHROME_COLOUR_MAP = Array(N - 1).fill(WHITE).concat([BLACK])

  const getColourMap = name => {
    const data = CMD.colourMapDictionary[name]
    if (data) {
      return getColourMapRgbaValues(data, N)
    }
    switch (name) {
      case 'monochrome':
        return MONOCHROME_COLOUR_MAP
      default:
        console.error(`ERROR: unknown colour map name, '${name}'.`)
        return MONOCHROME_COLOUR_MAP
    }
  }

  const getColourMapRgbaValues = (data, n) => {
    const makeMappingArrayFunc = data.usesFuncs
      ? makeMappingArray2
      : makeMappingArray
    const rs = makeMappingArrayFunc(n, data.red)
    const gs = makeMappingArrayFunc(n, data.green)
    const bs = makeMappingArrayFunc(n, data.blue)
    return rsgsbsToColourValues(n, rs, gs, bs)
  }

  const rsgsbsToColourValues = (n, rs, gs, bs) => {
    const values = Array(n)
    for (let i = 0; i < n; i++) {
      values[i] = [rs[i], gs[i], bs[i], 1]
    }
    return values
  }

  const makeMappingArray = (n, adata) => {

    let x = adata.map(e => e[0])
    const y0 = adata.map(e => e[1])
    const y1 = adata.map(e => e[2])

    x = x.map(v => v * (n - 1))

    const lut = new Array(n).fill(0)

    const xind = Array.from(Array(n).keys())

    let ind = searchSorted(x, xind)
    ind = ind.slice(1, ind.length - 1)

    const distance = Array.from(Array(n - 2).keys())
      .map(i => {
        const numerator = xind[i + 1] - x[ind[i] - 1]
        const denominator = x[ind[i]] - x[ind[i] - 1]
        return numerator / denominator
      })

    Array.from(Array(n - 2).keys()).forEach(i =>
      lut[i + 1] = distance[i] * (y0[ind[i]] - y1[ind[i] - 1]) + y1[ind[i] - 1])

    lut[0] = y1[0]

    lut[n - 1] = y0[y0.length - 1]

    return lut.map(clipZeroToOne)
  }

  const searchSorted = (arr, vs) => {
    const result = Array(vs.length)
    const arrLen = arr.length
    for (let i = 0; i < vs.length; i++) {
      const v = vs[i]
      let added = false
      for (let j = 0; j < arrLen; j++) {
        if (v <= arr[j]) {
          result[i] = j
          added = true
          break
        }
      }
      if (!added) result[i] = arrLen
    }
    return result
  }

  const makeMappingArray2 = (n, lambda) =>
    linearSpaced(n, 0, 1)
      .map(lambda)
      .map(clipZeroToOne)

  const linearSpaced = (length, start, stop) => {
    const step = (stop - start) / (length - 1)
    const data = Array(length)
    for (let i = 0; i < data.length; i++) {
      data[i] = start + i * step
    }
    data[data.length - 1] = stop
    return data
  }

  const clipZeroToOne = v => clip(0, 1, v)

  const clip = (min, max, v) => v < min ? min : v > max ? max : v

  exports.getColourMap = getColourMap
})(CM)
