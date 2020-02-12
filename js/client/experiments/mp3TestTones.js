import '../AudioContextMonkeyPatch.js'
import * as UH from '../common/utils/utilsHtml.js'
import * as UC from '../common/utils/utilsChart.js'
import * as UW from '../common/utils/utilsWebAudioApi.js'

const SAMPLE_RATES = [44100, 22050, 8000]
const FFT_SIZES = [256, 512, 1024, 2048, 4096, 8192]
const TEST_TONES_TO_URLS_MAP = new Map([
  [100, '/signals/100Hz_44100Hz_16bit_05sec.mp3'],
  [250, '/signals/250Hz_44100Hz_16bit_05sec.mp3'],
  [440, '/signals/440Hz_44100Hz_16bit_05sec.mp3'],
  [1000, '/signals/1kHz_44100Hz_16bit_05sec.mp3']
])

const DEFAULT_SAMPLE_RATE = SAMPLE_RATES[0]
const DEFAULT_FFT_SIZE = FFT_SIZES[2]
const DEFAULT_TEST_TONE = 440

let currentSampleRate = DEFAULT_SAMPLE_RATE
let currentFftSize = DEFAULT_FFT_SIZE
let currentTestTone = DEFAULT_TEST_TONE

const sampleRateSelect = UH.createSelect(
  'sampleRates',
  SAMPLE_RATES.map(value => ({ value })))

const fftSizesSelect = UH.createSelect(
  'fftSizes',
  FFT_SIZES.map(value => ({ value })))

const testToneRadioButtons = UH.createRadioButtons(
  'testTones',
  'testTone',
  [...TEST_TONES_TO_URLS_MAP.keys()])

const onSampleRateChange = () => {
  currentSampleRate = Number(UH.getSelectedValue(sampleRateSelect))
  updateCharts()
}

const onFftSizeChange = () => {
  currentFftSize = Number(UH.getSelectedValue(fftSizesSelect))
  updateCharts()
}

const onTestToneChange = () => {
  currentTestTone = Number(UH.getCheckedRadioButton(testToneRadioButtons))
  updateCharts()
}

UH.setSelectedValue(sampleRateSelect, currentSampleRate)
UH.setSelectedValue(fftSizesSelect, currentFftSize)
UH.setCheckedRadioButton(testToneRadioButtons, currentTestTone)

UH.selectOnChange(sampleRateSelect, onSampleRateChange)
UH.selectOnChange(fftSizesSelect, onFftSizeChange)
UH.radioButtonsOnChange(testToneRadioButtons, onTestToneChange)

const updateCharts = () =>
  drawCharts(
    currentSampleRate,
    currentFftSize,
    currentTestTone)

const drawCharts = async (sampleRate, fftSize, testTone) => {
  try {
    UH.hideErrorPanel()
    const config = { responseType: 'arraybuffer' }
    const { data } = await axios.get(TEST_TONES_TO_URLS_MAP.get(testTone), config)
    const numberOfChannels = 1
    const length = sampleRate
    const audioContext = new OfflineAudioContext(numberOfChannels, length, sampleRate)
    const audioBuffer = await UW.decodeAudioDataPromise(audioContext, data)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = fftSize
    const source = audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(analyser)
    source.start(0)
    source.stop(1)
    await UW.startRenderingPromise(audioContext)
    const timeDomainData = new Uint8Array(analyser.frequencyBinCount)
    const frequencyData = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteTimeDomainData(timeDomainData)
    analyser.getByteFrequencyData(frequencyData)
    UC.drawByteTimeDomainChart('timeDomainChart', timeDomainData)
    UC.drawFFTChart('fftChart', frequencyData, sampleRate)
    const binSize = sampleRate / fftSize
    showBins(binSize, 1, frequencyData)
  } catch (error) {
    UH.showErrorPanel(error.message)
  }
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

updateCharts()
