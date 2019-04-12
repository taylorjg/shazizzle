import { it_multiple } from './it_multiple.js'
import * as C from '../common/constants.js'
import * as F from '../common/logic/fingerprinting.js'

describe('fingerprinting.js tests', () => {

  it_multiple(
    [
      440,
      1000,
      2500,
      5000
    ],
    'F.getProminentFrequencies tests (single frequency)',
    async frequency => {
      const DURATION = 1
      const SAMPLE_RATE = 44100
      const options = {
        length: DURATION * SAMPLE_RATE,
        sampleRate: SAMPLE_RATE
      }
      const audioContext = new OfflineAudioContext(options)
      const source = new OscillatorNode(audioContext, { frequency })
      source.connect(audioContext.destination)
      source.start()
      source.stop(DURATION)
      const audioBuffer = await audioContext.startRendering()
      const binSize = SAMPLE_RATE / C.FFT_SIZE
      const expectedTopBinIndex = Math.round(frequency / binSize)
      const pfss = await F.getProminentFrequencies(audioBuffer)
      pfss.forEach(pfs => chai.expect(pfs).to.include(expectedTopBinIndex))
    })

  it_multiple(
    [
      [440, 1000],
      [1000, 2000],
      [80, 440, 1000],
      [80, 440, 1000, 2500]
    ],
    'F.getProminentFrequencies tests (multiple frequencies)',
    async (...frequencies) => {
      const DURATION = 1
      const SAMPLE_RATE = 44100
      const options = {
        length: DURATION * SAMPLE_RATE,
        sampleRate: SAMPLE_RATE
      }
      const audioContext = new OfflineAudioContext(options)
      const sources = frequencies.map(frequency => new OscillatorNode(audioContext, { frequency }))
      sources.map(source => source.connect(audioContext.destination))
      sources.map(source => source.start())
      sources.map(source => source.stop(DURATION))
      const audioBuffer = await audioContext.startRendering()
      const binSize = SAMPLE_RATE / C.FFT_SIZE
      const expectedTopBinIndices = frequencies.map(frequency => Math.round(frequency / binSize))
      const pfss = await F.getProminentFrequencies(audioBuffer)
      pfss.forEach(pfs => {
        expectedTopBinIndices.forEach(expectedTopBinIndex =>
          chai.expect(pfs).to.include(expectedTopBinIndex))
      })
    })
})
