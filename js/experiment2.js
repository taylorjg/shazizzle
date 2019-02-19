const sampleRateValues = [4096, 8192, 16384, 32768, 44100, 1024 * 44]
const fftSizeValues = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768]
const gainValues = [0.125, 0.25, 0.5, 0.75, 1.0]
const frequencyValues = [1, 2, 4, 6, 8, 440, 1000, 2000]

let currentSampleRate = 44100
let currentFftSize = 1024
let currentGain = 0.25
let currentFrequencies = [440, 1000, 2000]

const sampleRateRadioButtons = UH.createRadioButtons(
  'sampleRates',
  'sampleRate',
  sampleRateValues)

const fftSizeRadioButtons = UH.createRadioButtons(
  'fftSizes',
  'fftSize',
  fftSizeValues)

const gainRadioButtons = UH.createRadioButtons(
  'gains',
  'gain',
  gainValues)

const frequencyCheckboxes = UH.createCheckboxes(
  'frequencies',
  'frequency',
  frequencyValues)

const onSampleRateChange = () => {
  currentSampleRate = UH.getCheckedRadioButton(sampleRateRadioButtons)
  drawCharts(currentSampleRate, currentFftSize, currentGain, currentFrequencies)
}

const onFFtSizeChange = () => {
  currentFftSize = UH.getCheckedRadioButton(fftSizeRadioButtons)
  drawCharts(currentSampleRate, currentFftSize, currentGain, currentFrequencies)
}

const onGainChange = () => {
  currentGain = UH.getCheckedRadioButton(gainRadioButtons)
  drawCharts(currentSampleRate, currentFftSize, currentGain, currentFrequencies)
}

const onFrequencyChange = () => {
  currentFrequencies = UH.getCheckedCheckboxes(frequencyCheckboxes)
  drawCharts(currentSampleRate, currentFftSize, currentGain, currentFrequencies)
}

UH.setCheckedRadioButton(sampleRateRadioButtons, currentSampleRate)
UH.setCheckedRadioButton(fftSizeRadioButtons, currentFftSize)
UH.setCheckedRadioButton(gainRadioButtons, currentGain)
UH.setCheckedCheckboxes(frequencyCheckboxes, currentFrequencies)

UH.buttonsOnChange(sampleRateRadioButtons, onSampleRateChange)
UH.buttonsOnChange(fftSizeRadioButtons, onFFtSizeChange)
UH.buttonsOnChange(gainRadioButtons, onGainChange)
UH.buttonsOnChange(frequencyCheckboxes, onFrequencyChange)

const makeOscillatorNode = (audioContext, gainNode) => frequency => {
  const oscillatorNode = new OscillatorNode(audioContext, { frequency })
  oscillatorNode.connect(gainNode)
  return oscillatorNode
}

const startOscillator = when => oscillator => oscillator.start(when)
const stopOscillator = when => oscillator => oscillator.stop(when)

const drawCharts = async (sampleRate, fftSize, gain, frequencies) => {
  const CHANNELS = 1
  const DURATION = 1
  const audioContext = new OfflineAudioContext(CHANNELS, CHANNELS * DURATION * sampleRate, sampleRate)
  const gainNode = new GainNode(audioContext, { gain })
  const oscillators = frequencies.map(makeOscillatorNode(audioContext, gainNode))
  gainNode.connect(audioContext.destination)
  const analyserNode = new AnalyserNode(audioContext, { fftSize })
  gainNode.connect(analyserNode)
  oscillators.forEach(startOscillator(0))
  oscillators.forEach(stopOscillator(DURATION))
  const audioBuffer = await audioContext.startRendering()
  const channelData = audioBuffer.getChannelData(0)
  const timeDomainData = new Uint8Array(analyserNode.frequencyBinCount)
  const frequencyData = new Uint8Array(analyserNode.frequencyBinCount)
  analyserNode.getByteTimeDomainData(timeDomainData)
  analyserNode.getByteFrequencyData(frequencyData)
  UC.drawChart('chart1', channelData)
  UC.drawChart('chart2', timeDomainData)
  UC.drawChart('chart3', frequencyData)
  UW.visualiseSliver(audioBuffer, 12, 'chart4', 'chart5')
}

drawCharts(currentSampleRate, currentFftSize, currentGain, currentFrequencies)
