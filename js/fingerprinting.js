import * as C from './constants.js'
import * as UW from './utilsWebAudioApi.js'

const findTopBin = frequencyData => ([lb, ub]) => {
  const binValues = Array.from(frequencyData).slice(lb, ub)
  const zipped = binValues.map((binValue, index) => ({ binValue, index }))
  const sorted = zipped.sort((a, b) => b.binValue - a.binValue)
  return R.head(sorted)
}

const findTopBins = (binBands, frequencyData) => {
  const allTopBins = binBands.map(findTopBin(frequencyData))
  const sum = allTopBins.reduce((acc, { binValue }) => acc + binValue, 0)
  const mean = sum / allTopBins.length
  const binValuesAboveMean = allTopBins.filter(({ binValue }) => binValue >= mean)
  return binValuesAboveMean.map(({ index }) => index)
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
    return findTopBins(binBands, frequencyData)
  })

  return await Promise.all(promises)
}
