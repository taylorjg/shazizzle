import '../AudioContextMonkeyPatch.js'
import * as UH from '../common/utils/utilsHtml.js'
import * as UC from '../common/utils/utilsChart.js'

const SAMPLE_RATES = [44100, 8000]
const FFT_SIZES = [256, 512, 1024, 2048, 4096, 8192]
const FREQUENCY_VALUES = [10, 440, 1000, 2000]
const CUT_OFF_FREQUENCY_VALUES = [{ value: 0, label: 'Off' }, 800, 1500]
const GAIN_VALUES = [0.125, 0.25, 0.5, 0.75, 1.0]

const DEFAULT_SAMPLE_RATE = SAMPLE_RATES[0]
const DEFAULT_FFT_SIZE = FFT_SIZES[2]
const DEFAULT_FREQUENCIES = [FREQUENCY_VALUES[1]]
const DEFAULT_CUT_OFF_FREQUENCY = CUT_OFF_FREQUENCY_VALUES[2]
const DEFAULT_GAIN = GAIN_VALUES.slice(-1)[0]

let currentSampleRate = DEFAULT_SAMPLE_RATE
let currentFftSize = DEFAULT_FFT_SIZE
let currentFrequencies = DEFAULT_FREQUENCIES
let currentCutOffFrequency = DEFAULT_CUT_OFF_FREQUENCY
let currentGain = DEFAULT_GAIN

const onReset = () => {
  currentSampleRate = DEFAULT_SAMPLE_RATE
  currentFftSize = DEFAULT_FFT_SIZE
  currentFrequencies = DEFAULT_FREQUENCIES
  currentCutOffFrequency = DEFAULT_CUT_OFF_FREQUENCY
  currentGain = DEFAULT_GAIN
  UH.setSelectedValue(sampleRateSelect, currentSampleRate)
  UH.setSelectedValue(fftSizesSelect, currentFftSize)
  UH.setCheckedCheckboxes(frequencyCheckboxes, currentFrequencies)
  UH.setCheckedRadioButton(cutOffFrequencyRadioButtons, currentCutOffFrequency)
  UH.setCheckedRadioButton(gainRadioButtons, currentGain)
  updateCharts()
}

document.getElementById('resetButton').addEventListener('click', onReset)

const sampleRateSelect = UH.createSelect(
  'sampleRates',
  SAMPLE_RATES.map(value => ({ value })))

const fftSizesSelect = UH.createSelect(
  'fftSizes',
  FFT_SIZES.map(value => ({ value })))

const frequencyCheckboxes = UH.createCheckboxes(
  'frequencies',
  'frequency',
  FREQUENCY_VALUES)

const cutOffFrequencyRadioButtons = UH.createRadioButtons(
  'cutOffFrequency',
  'cutOffFrequency',
  CUT_OFF_FREQUENCY_VALUES)

const gainRadioButtons = UH.createRadioButtons(
  'gain',
  'gain',
  GAIN_VALUES)

const onSampleRateChange = () => {
  currentSampleRate = Number(UH.getSelectedValue(sampleRateSelect))
  updateCharts()
}

const onFftSizeChange = () => {
  currentFftSize = Number(UH.getSelectedValue(fftSizesSelect))
  updateCharts()
}

const onFrequencyChange = () => {
  currentFrequencies = UH.getCheckedCheckboxes(frequencyCheckboxes).map(Number)
  updateCharts()
}

const onCutOffFrequencyChange = () => {
  currentCutOffFrequency = Number(UH.getCheckedRadioButton(cutOffFrequencyRadioButtons))
  updateCharts()
}

const onGainChange = () => {
  currentGain = Number(UH.getCheckedRadioButton(gainRadioButtons))
  updateCharts()
}

UH.selectOnChange(sampleRateSelect, onSampleRateChange)
UH.selectOnChange(fftSizesSelect, onFftSizeChange)
UH.checkboxesOnChange(frequencyCheckboxes, onFrequencyChange)
UH.radioButtonsOnChange(cutOffFrequencyRadioButtons, onCutOffFrequencyChange)
UH.radioButtonsOnChange(gainRadioButtons, onGainChange)

const makeOscillatorNode = (audioContext, gainNode) => frequency => {
  const oscillatorNode = audioContext.createOscillator()
  oscillatorNode.frequency.value = frequency
  oscillatorNode.connect(gainNode)
  return oscillatorNode
}

const startOscillatorNode = when => oscillatorNode => oscillatorNode.start(when)
const stopOscillatorNode = when => oscillatorNode => oscillatorNode.stop(when)

const updateCharts = () =>
  drawCharts(
    currentSampleRate,
    currentFftSize,
    currentFrequencies,
    currentCutOffFrequency,
    currentGain)

const drawCharts = async (sampleRate, fftSize, frequencies, cutOffFrequency, gain) => {
  const numberOfChannels = 1
  const length = sampleRate
  const audioContext = new OfflineAudioContext(numberOfChannels, length, sampleRate)
  const gainNode = audioContext.createGain()
  gainNode.gain.value = gain
  const oscillatorNodes = frequencies.map(makeOscillatorNode(audioContext, gainNode))
  const analyserNode = audioContext.createAnalyser()
  analyserNode.fftSize = fftSize
  if (cutOffFrequency > 0) {
    const biquadFilterNode = audioContext.createBiquadFilter()
    // TODO: add UI support to select 'lowpass', 'highpass', 'bandpass'
    biquadFilterNode.type = 'lowpass'
    biquadFilterNode.frequency.value = cutOffFrequency
    // TODO: add UI support to select various values of Q ([0.001, 0.01, 0.1, 1, 10, 100, 1000])
    // biquadFilterNode.Q.value = Q
    gainNode.connect(biquadFilterNode)
    biquadFilterNode.connect(audioContext.destination)
    biquadFilterNode.connect(analyserNode)
  } else {
    gainNode.connect(audioContext.destination)
    gainNode.connect(analyserNode)
  }
  oscillatorNodes.forEach(startOscillatorNode(0))
  oscillatorNodes.forEach(stopOscillatorNode(1))
  await new Promise(resolve => {
    audioContext.oncomplete = resolve
    audioContext.startRendering()
  })
  const timeDomainData = new Uint8Array(analyserNode.frequencyBinCount)
  const frequencyData = new Uint8Array(analyserNode.frequencyBinCount)
  analyserNode.getByteTimeDomainData(timeDomainData)
  analyserNode.getByteFrequencyData(frequencyData)
  UC.drawTimeDomainChart('timeDomainChart', timeDomainData)
  UC.drawFFTChart('fftChart', frequencyData, sampleRate)
  const binSize = sampleRate / fftSize
  showBins(binSize, frequencies.length, frequencyData)
}

const findTopBins = frequencyData => {
  const binValues = Array.from(frequencyData)
  const zipped = binValues.map((value, bin) => ({ value, bin }))
  return zipped.sort((a, b) => b.value - a.value)
}

const showBins = (binSize, numFrequencies, frequencyData) => {
  const topBins = findTopBins(frequencyData)
  const topFewBins = R.take(numFrequencies, topBins)
  const frequencyRange = bin => {
    const from = (bin * binSize).toFixed(2).padStart(7)
    const to = ((bin + 1) * binSize).toFixed(2).padStart(7)
    return `${from} Hz to ${to} Hz`
  }
  const lines = topFewBins.map(({ value, bin }) => {
    const binStr = bin.toString().padStart(3)
    const valueStr = value.toString().padStart(3)
    return `bin: ${binStr}; value: ${valueStr}; frequency range: ${frequencyRange(bin)}`
  })
  const binsPre = document.getElementById('binsRow').querySelector('pre')
  binsPre.innerHTML = lines.join('\n')
}

onReset()
