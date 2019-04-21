import * as UH from '../common/utils/utilsHtml.js'
import * as UC from '../common/utils/utilsChart.js'

const frequencyValues = [10, 440, 1000, 2000]
const cutOffFrequencyValues = [{ value: 0, label: 'Off' }, 800, 1500]
const gainValues = [0.125, 0.25, 0.5, 0.75, 1.0]

let currentFrequencies = []
let currentCutOffFrequency = 1500
let currentGain = 1

const onReset = () => {
  currentFrequencies = []
  currentCutOffFrequency = 1500
  currentGain = 1
  UH.setCheckedCheckboxes(frequencyCheckboxes, currentFrequencies)
  UH.setCheckedRadioButton(cutOffFrequencyRadioButtons, currentCutOffFrequency)
  UH.setCheckedRadioButton(gainRadioButtons, currentGain)
  drawCharts(currentFrequencies, currentCutOffFrequency, currentGain)
}

document.getElementById('resetButton').addEventListener('click', onReset)

const frequencyCheckboxes = UH.createCheckboxes(
  'frequencies',
  'frequency',
  frequencyValues)

const cutOffFrequencyRadioButtons = UH.createRadioButtons(
  'cutOffFrequency',
  'cutOffFrequency',
  cutOffFrequencyValues)

const gainRadioButtons = UH.createRadioButtons(
  'gain',
  'gain',
  gainValues)

const onFrequencyChange = () => {
  currentFrequencies = UH.getCheckedCheckboxes(frequencyCheckboxes)
  drawCharts(currentFrequencies, currentCutOffFrequency, currentGain)
}

const onCutOffFrequencyChange = () => {
  currentCutOffFrequency = UH.getCheckedRadioButton(cutOffFrequencyRadioButtons)
  drawCharts(currentFrequencies, currentCutOffFrequency, currentGain)
}

const onGainChange = () => {
  currentGain = UH.getCheckedRadioButton(gainRadioButtons)
  drawCharts(currentFrequencies, currentCutOffFrequency, currentGain)
}

UH.setCheckedCheckboxes(frequencyCheckboxes, currentFrequencies)
UH.setCheckedRadioButton(cutOffFrequencyRadioButtons, currentCutOffFrequency)
UH.setCheckedRadioButton(gainRadioButtons, currentGain)

UH.buttonsOnChange(frequencyCheckboxes, onFrequencyChange)
UH.buttonsOnChange(cutOffFrequencyRadioButtons, onCutOffFrequencyChange)
UH.buttonsOnChange(gainRadioButtons, onGainChange)

const makeOscillatorNode = (audioContext, gainNode) => frequency => {
  const oscillatorNode = new OscillatorNode(audioContext, { frequency })
  oscillatorNode.connect(gainNode)
  return oscillatorNode
}

const startOscillatorNode = when => oscillatorNode => oscillatorNode.start(when)
const stopOscillatorNode = when => oscillatorNode => oscillatorNode.stop(when)

const drawCharts = async (frequencies, cutOffFrequency, gain) => {
  const SAMPLE_RATE = 8000
  const FFT_SIZE = 1024
  const options = {
    length: SAMPLE_RATE,
    sampleRate: SAMPLE_RATE
  }
  const audioContext = new OfflineAudioContext(options)
  const gainNode = new GainNode(audioContext, { gain })
  const oscillatorNodes = frequencies.map(makeOscillatorNode(audioContext, gainNode))
  const analyserNode = new AnalyserNode(audioContext, { fftSize: FFT_SIZE })
  if (cutOffFrequency > 0) {
    const biquadFilterNode = new BiquadFilterNode(audioContext, {
      type: 'lowpass',
      frequency: cutOffFrequency
    })
    gainNode.connect(biquadFilterNode)
    biquadFilterNode.connect(audioContext.destination)
    biquadFilterNode.connect(analyserNode)
  } else {
    gainNode.connect(audioContext.destination)
    gainNode.connect(analyserNode)
  }
  oscillatorNodes.forEach(startOscillatorNode(0))
  oscillatorNodes.forEach(stopOscillatorNode(1))
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

onReset()
