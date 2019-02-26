import * as C from './constants.js'
import * as U from './utils.js'
import * as UW from './utilsWebAudioApi.js'

const findTopBinPairInBand = frequencyData => ([lb, ub]) => {
  const array = Array.from(frequencyData)
  const zipped = U.zipWithIndex(array)
  const sliced = zipped.slice(lb, ub)
  const sorted = sliced.sort(([binValue1], [binValue2]) => binValue2 - binValue1)
  return R.head(sorted)
}

const MIN_BIN_VALUE = 10

const findTopBinIndices = (frequencyData, binBands) => {
  const topBinsPairs = binBands.map(findTopBinPairInBand(frequencyData))
  const sumBinValues = topBinsPairs.reduce((acc, [binValue]) => acc + binValue, 0)
  const meanBinValue = sumBinValues / topBinsPairs.length
  const threshold = Math.max(meanBinValue, MIN_BIN_VALUE)
  const filteredBinPairs = topBinsPairs.filter(([binValue]) => binValue >= threshold)
  return filteredBinPairs.map(U.snd)
}

export const getProminentFrequencies = async audioBuffer => {

  const maxFrequency = audioBuffer.sampleRate / 2
  const binCount = C.FFT_SIZE / 2
  const binSize = maxFrequency / binCount
  const binBands = R.aperture(2, C.FREQUENCY_BANDS.map(f => Math.round(f / binSize)))

  const sliverCount = Math.floor(audioBuffer.duration / C.SLIVER_DURATION)
  const sliverIndices = R.range(0, sliverCount)

  const promises = sliverIndices.map(async sliverIndex => {
    const { frequencyData } = await UW.getSliverData(audioBuffer, sliverIndex)
    return findTopBinIndices(frequencyData, binBands)
  })

  return await Promise.all(promises)
}
