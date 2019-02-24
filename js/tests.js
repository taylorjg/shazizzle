/* eslint-env mocha */
/* global chai:false */

import { it_multiple } from './it_multiple.js'

describe('Shazizzle Tests', () => {

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
    'FFT identifies correct single frequency from an OscillatorNode',
    async frequency => {
      const CHANNELS = 1
      const DURATION = 1
      const SAMPLE_RATE = 44100
      const FFT_SIZE = 1024
      const audioContext = new OfflineAudioContext(CHANNELS, CHANNELS * DURATION * SAMPLE_RATE, SAMPLE_RATE)
      const source = new OscillatorNode(audioContext, { frequency })
      const analyserNode = new AnalyserNode(audioContext, { fftSize: FFT_SIZE })
      source.connect(analyserNode)
      analyserNode.connect(audioContext.destination)
      source.start()
      source.stop(DURATION)
      await audioContext.startRendering()
      const frequencyData = new Uint8Array(analyserNode.frequencyBinCount)
      analyserNode.getByteFrequencyData(frequencyData)
      const numFrequenciesPerBin = SAMPLE_RATE / 2 / analyserNode.frequencyBinCount
      const topBinIndex = Math.round(frequency / numFrequenciesPerBin)
      const topBins = findTopBins(frequencyData)
      chai.expect(topBins[0].index).to.equal(topBinIndex)
    })

  it_multiple(
    [
      ['440Hz_44100Hz_16bit_05sec.mp3', 440],
      ['1kHz_44100Hz_16bit_05sec.mp3', 1000],
      ['10kHz_44100Hz_16bit_05sec.mp3', 10000]
    ],
    'FFT identifies correct single frequency from an MP3 test tone',
    async (testToneFile, frequency) => {

      const SAMPLE_RATE = 44100
      const FFT_SIZE = 1024

      const config = { responseType: 'arraybuffer' }
      const response = await axios.get(`https://shazizzle-prep.herokuapp.com/signals/${testToneFile}`, config)
      const data = response.data

      const audioContext = new OfflineAudioContext({ length: FFT_SIZE * 2, sampleRate: SAMPLE_RATE })
      const audioBuffer = await audioContext.decodeAudioData(data)

      const source = new AudioBufferSourceNode(audioContext, { buffer: audioBuffer })
      const analyserNode = new AnalyserNode(audioContext, { fftSize: FFT_SIZE })
      source.connect(audioContext.destination)
      source.connect(analyserNode)
      source.start()
      await audioContext.startRendering()
      const frequencyData = new Uint8Array(analyserNode.frequencyBinCount)
      analyserNode.getByteFrequencyData(frequencyData)

      const numFrequenciesPerBin = SAMPLE_RATE / 2 / analyserNode.frequencyBinCount
      const topBinIndex = Math.round(frequency / numFrequenciesPerBin)
      const topBins = findTopBins(frequencyData)
      chai.expect(topBins[0].index).to.equal(topBinIndex)
    })
})
