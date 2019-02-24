import * as C from './constants.js'
import * as UW from './utilsWebAudioApi.js'

const FREQUENCY_BANDS = [
  0,
  250,
  500,
  2000,
  8000
]

const findTopBin = frequencyData => ([lb, ub]) => {
  const binValues = Array.from(frequencyData).slice(lb, ub)
  const zipped = binValues.map((binValue, index) => ({ binValue, index }))
  const sorted = zipped.sort((a, b) => b.binValue - a.binValue)
  const top = R.head(sorted)
  return top.binValue >= 20 ? lb + top.index : -1
}

export const getProminentFrequencies = async audioBuffer => {

  const maxFrequency = audioBuffer.sampleRate / 2
  const binCount = C.FFT_SIZE / 2
  const binSize = maxFrequency / binCount
  const binBands = R.aperture(2, FREQUENCY_BANDS.map(f => Math.round(f / binSize)))

  const sliverCount = audioBuffer.duration / C.SLIVER_DURATION
  const sliverIndices = R.range(0, sliverCount)

  const promises = sliverIndices.map(async sliverIndex => {
    const { frequencyData } = await UW.getSliverData(audioBuffer, sliverIndex)
    const topBinIndices = binBands.map(findTopBin(frequencyData))
    return topBinIndices
  })

  return await Promise.all(promises)
}
