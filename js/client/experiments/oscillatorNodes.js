import * as UH from '../common/utils/utilsHtml.js'
import * as UC from '../common/utils/utilsChart.js'

const frequencyValues = [10, 440, 1000, 2000]
const gainValues = [0.125, 0.25, 0.5, 0.75, 1.0]

let currentGain = 1
let currentFrequencies = []

document.getElementById('resetButton').addEventListener('click', () => {
  currentGain = 1
  currentFrequencies = []
  UH.setCheckedCheckboxes(frequencyCheckboxes, currentFrequencies)
  UH.setCheckedRadioButton(gainRadioButtons, currentGain)
  drawCharts(currentFrequencies, currentGain)
})

const frequencyCheckboxes = UH.createCheckboxes(
  'frequencies',
  'frequency',
  frequencyValues)

const gainRadioButtons = UH.createRadioButtons(
  'gains',
  'gain',
  gainValues)

const onFrequencyChange = () => {
  currentFrequencies = UH.getCheckedCheckboxes(frequencyCheckboxes)
  drawCharts(currentFrequencies, currentGain)
}

const onGainChange = () => {
  currentGain = UH.getCheckedRadioButton(gainRadioButtons)
  drawCharts(currentFrequencies, currentGain)
}

UH.setCheckedCheckboxes(frequencyCheckboxes, currentFrequencies)
UH.setCheckedRadioButton(gainRadioButtons, currentGain)

UH.buttonsOnChange(frequencyCheckboxes, onFrequencyChange)
UH.buttonsOnChange(gainRadioButtons, onGainChange)

const makeOscillatorNode = (audioContext, gainNode) => frequency => {
  const oscillatorNode = new OscillatorNode(audioContext, { frequency })
  oscillatorNode.connect(gainNode)
  return oscillatorNode
}

const startOscillator = when => oscillator => oscillator.start(when)
const stopOscillator = when => oscillator => oscillator.stop(when)

const drawCharts = async (frequencies, gain) => {
  const SAMPLE_RATE = 8000
  const FFT_SIZE = 1024
  const CHANNELS = 1
  const DURATION = 1
  const options = {
    numberOfChannels: CHANNELS,
    length: DURATION * SAMPLE_RATE,
    sampleRate: SAMPLE_RATE
  }
  const audioContext = new OfflineAudioContext(options)
  const gainNode = new GainNode(audioContext, { gain })
  const oscillators = frequencies.map(makeOscillatorNode(audioContext, gainNode))
  gainNode.connect(audioContext.destination)
  const analyserNode = new AnalyserNode(audioContext, { fftSize: FFT_SIZE })
  gainNode.connect(analyserNode)
  oscillators.forEach(startOscillator(0))
  oscillators.forEach(stopOscillator(DURATION))
  await audioContext.startRendering()
  const timeDomainData = new Uint8Array(analyserNode.frequencyBinCount)
  const frequencyData = new Uint8Array(analyserNode.frequencyBinCount)
  analyserNode.getByteTimeDomainData(timeDomainData)
  analyserNode.getByteFrequencyData(frequencyData)
  UC.drawTimeDomainChart('timeDomainChart', timeDomainData)
  UC.drawFFTChart('fftChart', frequencyData, SAMPLE_RATE)
  const binSize = SAMPLE_RATE / FFT_SIZE
  showBins(binSize, frequencies.length, frequencyData)
}

const findTopBins = frequencyData => {
  const binValues = Array.from(frequencyData)
  const zipped = binValues.map((binValue, index) => ({ binValue, bin: index }))
  return zipped.sort((a, b) => b.binValue - a.binValue)
}

const showBins = (binSize, numFrequencies, frequencyData) => {
  const topBins = findTopBins(frequencyData)
  const topFewBins = R.take(numFrequencies, topBins)
  const lines = topFewBins.map(({ bin }) =>
    `bin: ${bin}; frequency range: ${bin * binSize} - ${(bin + 1) * binSize} Hz`)
  const binsPre = document.getElementById('binsRow').querySelector('pre')
  binsPre.innerHTML = lines.join('\n')
}

drawCharts(currentFrequencies, currentGain)
