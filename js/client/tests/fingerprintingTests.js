import '../AudioContextMonkeyPatch.js'
import * as C from '../common/constants.js'
import * as F from '../common/logic/fingerprinting.js'
import * as UW from '../common/utils/utilsWebAudioApi.js'
import { it_multiple } from './it_multiple.js'

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
      const length = DURATION * SAMPLE_RATE
      const audioContext = new OfflineAudioContext(1, length, SAMPLE_RATE)
      const oscillatorNode = audioContext.createOscillator()
      oscillatorNode.frequency.value = frequency
      oscillatorNode.connect(audioContext.destination)
      oscillatorNode.start()
      oscillatorNode.stop(DURATION)
      const audioBuffer = await UW.startRenderingPromise(audioContext)
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
      const length = DURATION * SAMPLE_RATE
      const audioContext = new OfflineAudioContext(1, length, SAMPLE_RATE)
      const oscillatorNodes = frequencies.map(frequency => {
        const oscillatorNode = audioContext.createOscillator()
        oscillatorNode.frequency.value = frequency
        return oscillatorNode
      })
      oscillatorNodes.map(source => source.connect(audioContext.destination))
      oscillatorNodes.map(source => source.start())
      oscillatorNodes.map(source => source.stop(DURATION))
      const audioBuffer = await UW.startRenderingPromise(audioContext)
      const binSize = SAMPLE_RATE / C.FFT_SIZE
      const expectedTopBinIndices = frequencies.map(frequency => Math.round(frequency / binSize))
      const pfss = await F.getProminentFrequencies(audioBuffer)
      pfss.forEach(pfs => {
        expectedTopBinIndices.forEach(expectedTopBinIndex =>
          chai.expect(pfs).to.include(expectedTopBinIndex))
      })
    })
})
