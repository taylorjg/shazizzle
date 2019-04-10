import { it_multiple } from './it_multiple.js'
import * as C from '../common/constants.js'
import * as UW from '../common/utils/utilsWebAudioApi.js'
import * as F from '../common/logic/fingerprinting.js'

describe('Web Audio API Exploratory Tests', () => {

  const findTopBins = frequencyData => {
    const binValues = Array.from(frequencyData)
    const zipped = binValues.map((binValue, index) => ({ binValue, index }))
    return zipped.sort((a, b) => b.binValue - a.binValue)
  }

  it_multiple(
    [
      440,
      1000,
      2500,
      5000,
      10000,
      18000
    ],
    'FFT identifies correct frequency from single oscillator',
    async frequency => {
      const DURATION = 1
      const SAMPLE_RATE = 44100
      const FFT_SIZE = 1024
      const options = {
        length: DURATION * SAMPLE_RATE,
        sampleRate: SAMPLE_RATE
      }
      const audioContext = new OfflineAudioContext(options)
      const source = new OscillatorNode(audioContext, { frequency })
      const analyserNode = new AnalyserNode(audioContext, { fftSize: FFT_SIZE })
      source.connect(analyserNode)
      analyserNode.connect(audioContext.destination)
      source.start()
      source.stop(DURATION)
      await audioContext.startRendering()
      const frequencyData = new Uint8Array(analyserNode.frequencyBinCount)
      analyserNode.getByteFrequencyData(frequencyData)
      const binSize = SAMPLE_RATE / FFT_SIZE
      const topBinIndex = Math.round(frequency / binSize)
      const topBins = findTopBins(frequencyData)
      chai.expect(topBins[0].index).to.equal(topBinIndex)
    })

  it_multiple(
    [
      [440, 1000],
      [1000, 2000],
      [80, 440, 1000],
      [80, 440, 1000, 2500]
    ],
    'FFT identifies correct frequencies from multiple oscillators',
    async (...frequencies) => {
      const DURATION = 1
      const SAMPLE_RATE = 8000
      const FFT_SIZE = 1024
      const options = {
        length: DURATION * SAMPLE_RATE,
        sampleRate: SAMPLE_RATE
      }
      const audioContext = new OfflineAudioContext(options)
      const analyserNode = new AnalyserNode(audioContext, { fftSize: FFT_SIZE })
      analyserNode.connect(audioContext.destination)
      const gainNode = new GainNode(audioContext, { gain: 0.125 })
      gainNode.connect(analyserNode)
      const sources = frequencies.map(frequency => new OscillatorNode(audioContext, { frequency }))
      sources.map(source => source.connect(gainNode))
      sources.map(source => source.start())
      sources.map(source => source.stop(DURATION))
      await audioContext.startRendering()
      const frequencyData = new Uint8Array(analyserNode.frequencyBinCount)
      analyserNode.getByteFrequencyData(frequencyData)
      const binSize = SAMPLE_RATE / FFT_SIZE
      const expectedTopBinIndices = frequencies.map(frequency => Math.round(frequency / binSize))
      const actualTopBinIndices = R.compose(
        R.take(frequencies.length),
        R.pluck('index'),
        findTopBins
      )(frequencyData)
      expectedTopBinIndices.forEach(expectedTopBinIndex =>
        chai.expect(actualTopBinIndices).to.include(expectedTopBinIndex))
    })

  it_multiple(
    [
      ['440Hz_44100Hz_16bit_05sec.mp3', 440],
      ['1kHz_44100Hz_16bit_05sec.mp3', 1000],
      ['10kHz_44100Hz_16bit_05sec.mp3', 10000]
    ],
    'FFT identifies correct frequency from a test tone .mp3 file',
    async (testToneFile, frequency) => {

      const DURATION = 5
      const SAMPLE_RATE = 44100
      const FFT_SIZE = 1024

      const config = { responseType: 'arraybuffer' }
      const response = await axios.get(`/signals/${testToneFile}`, config)
      const data = response.data

      const options = {
        length: DURATION * SAMPLE_RATE,
        sampleRate: SAMPLE_RATE
      }
      const audioContext = new OfflineAudioContext(options)
      const audioBuffer = await audioContext.decodeAudioData(data)

      const source = new AudioBufferSourceNode(audioContext, { buffer: audioBuffer })
      const analyserNode = new AnalyserNode(audioContext, { fftSize: FFT_SIZE })
      source.connect(audioContext.destination)
      source.connect(analyserNode)
      source.start()
      await audioContext.startRendering()
      const frequencyData = new Uint8Array(analyserNode.frequencyBinCount)
      analyserNode.getByteFrequencyData(frequencyData)

      const binSize = SAMPLE_RATE / FFT_SIZE
      const topBinIndex = Math.round(frequency / binSize)
      const topBins = findTopBins(frequencyData)
      chai.expect(topBins[0].index).to.equal(topBinIndex)
    })

  it_multiple(
    [
      440,
      1000,
      2500,
      5000
    ],
    'UW.resample tests',
    async frequency => {
      const DURATION = 1
      const SAMPLE_RATE_1 = 44100
      const SAMPLE_RATE_2 = 16000
      const options = {
        length: DURATION * SAMPLE_RATE_1,
        sampleRate: SAMPLE_RATE_1
      }
      const audioContext = new OfflineAudioContext(options)
      const source = new OscillatorNode(audioContext, { frequency })
      source.connect(audioContext.destination)
      source.start()
      source.stop(DURATION)
      const audioBuffer1 = await audioContext.startRendering()
      const audioBuffer2 = await UW.resample(audioBuffer1, SAMPLE_RATE_2)
      const { frequencyData: frequencyData1 } = await UW.getSliverData(audioBuffer1, 10)
      const { frequencyData: frequencyData2 } = await UW.getSliverData(audioBuffer2, 10)
      const binSize1 = SAMPLE_RATE_1 / C.FFT_SIZE
      const binSize2 = SAMPLE_RATE_2 / C.FFT_SIZE
      const topBinIndex1 = Math.round(frequency / binSize1)
      const topBinIndex2 = Math.round(frequency / binSize2)
      const topBins1 = findTopBins(frequencyData1)
      const topBins2 = findTopBins(frequencyData2)
      chai.expect(topBins1[0].index).to.equal(topBinIndex1)
      chai.expect(topBins2[0].index).to.equal(topBinIndex2)
    })

  it_multiple(
    [
      [440, 1000],
      [2, 1500],
      [1000, 4000]
    ],
    'UW.steroToMono correctly combines left and right channels',
    async (constant1, constant2) => {
      const options = {
        numberOfChannels: 2,
        length: 1024,
        sampleRate: 44100
      }
      const steroBuffer = new AudioBuffer(options)
      const steroChannelData0 = steroBuffer.getChannelData(0)
      const steroChannelData1 = steroBuffer.getChannelData(1)
      steroChannelData0.fill(constant1)
      steroChannelData1.fill(constant2)

      const monoBuffer = await UW.steroToMono(steroBuffer)

      chai.expect(monoBuffer.numberOfChannels).to.equal(1)
      chai.expect(monoBuffer.duration).to.equal(steroBuffer.duration)
      chai.expect(monoBuffer.sampleRate).to.equal(steroBuffer.sampleRate)
      const monoChannelData0 = monoBuffer.getChannelData(0)
      // https://developer.mozilla.org/en-US/docs/Web/API/AudioNode/channelInterpretation
      //   Down-mix from stereo to mono.
      //   Both input channels (L and R) are equally combined to produce the unique output channel (M).
      //   output.M = 0.5 * (input.L + input.R)
      const expectedValue = 0.5 * (constant1 + constant2)
      monoChannelData0.forEach(actualValue => {
        chai.expect(actualValue).to.equal(expectedValue)
      })
    })

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
