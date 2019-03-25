import * as C from '../constants.js'
import * as U from '../utils/utils.js'
import * as UW from '../utils/utilsWebAudioApi.js'

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

  const binSize = audioBuffer.sampleRate / C.FFT_SIZE
  const binBands = R.aperture(2, C.FREQUENCY_BANDS.map(f => Math.round(f / binSize)))

  const sliverCount = Math.floor(audioBuffer.duration / C.SLIVER_DURATION)
  const sliverIndices = R.range(0, sliverCount)

  const PIECE_SIZE = 1000
  const pieces = R.splitEvery(PIECE_SIZE, sliverIndices)

  const processPiece = async piece => {
    const promises = piece.map(async sliverIndex => {
      const { frequencyData } = await UW.getSliverData(audioBuffer, sliverIndex)
      return findTopBinIndices(frequencyData, binBands)
    })
    return await Promise.all(promises)
  }

  const results = []
  for (const piece of pieces) {
    const result = await processPiece(piece)
    results.push(result)
  }
  return R.unnest(results)
}

export const getHashes = async audioBuffer => {

  const TARGET_ZONE_SLIVER_GAP = 5
  const TARGET_ZONE_NUM_POINTS = 5

  const pfs = await getProminentFrequencies(audioBuffer)

  const allTargetPoints = R.flatten(
    pfs.map((bins, sliverIndex) =>
      bins.map(bin => ({ bin, sliverIndex }))))

  const getTargetZonePoints = targetZoneStartSliverIndex => {
    const index = allTargetPoints.findIndex(targetPoint => targetPoint.sliverIndex === targetZoneStartSliverIndex)
    if (index < 0) return []
    return allTargetPoints.slice(index, index + TARGET_ZONE_NUM_POINTS)
  }

  const tuples = R.flatten(
    pfs.map((bins, sliverIndex) =>
      bins.map(anchorPoint => {
        const targetZoneStartSliverIndex = sliverIndex + TARGET_ZONE_SLIVER_GAP
        const targetZonePoints = getTargetZonePoints(targetZoneStartSliverIndex)
        return targetZonePoints.map(targetPoint => {
          const f1 = anchorPoint
          const f2 = targetPoint.bin
          const t1 = sliverIndex
          const t2 = targetPoint.sliverIndex
          const dt = t2 - t1
          return { f1, f2, dt, t1 }
        })
      })
    ))

  return tuples.map(({ f1, f2, dt, t1 }) => {
    const hash = (f1 << 20) | (f2 << 8) | dt
    return [hash, t1]
  })
}
