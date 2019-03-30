import * as UH from '../common/utils/utilsHtml.js'
import * as UC from '../common/utils/utilsChart.js'

const TEST_TONES_TO_URLS_MAP = new Map([
  [100, '/signals/100Hz_44100Hz_16bit_05sec.mp3'],
  [250, '/signals/250Hz_44100Hz_16bit_05sec.mp3'],
  [440, '/signals/440Hz_44100Hz_16bit_05sec.mp3'],
  [1000, '/signals/1kHz_44100Hz_16bit_05sec.mp3']
])

let currentTestTone = 440

const testToneRadioButtons = UH.createRadioButtons(
  'testTones',
  'testTone',
  [...TEST_TONES_TO_URLS_MAP.keys()])

const onTestToneChange = () => {
  currentTestTone = UH.getCheckedRadioButton(testToneRadioButtons)
  drawCharts(currentTestTone)
}

UH.setCheckedRadioButton(testToneRadioButtons, currentTestTone)

UH.buttonsOnChange(testToneRadioButtons, onTestToneChange)

const drawCharts = async testTone => {
  const SAMPLE_RATE = 8000
  const FFT_SIZE = 1024
  const config = { responseType: 'arraybuffer' }
  const { data } = await axios.get(TEST_TONES_TO_URLS_MAP.get(testTone), config)
  const options = {
    length: SAMPLE_RATE,
    sampleRate: SAMPLE_RATE
  }
  const audioContext = new OfflineAudioContext(options)
  const audioBuffer = await audioContext.decodeAudioData(data)
  const analyser = audioContext.createAnalyser()
  analyser.fftSize = FFT_SIZE
  const source = audioContext.createBufferSource()
  source.buffer = audioBuffer
  source.connect(analyser)
  source.connect(audioContext.destination)
  source.start()
  await audioContext.startRendering()
  const timeDomainData = new Uint8Array(analyser.frequencyBinCount)
  const frequencyData = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteTimeDomainData(timeDomainData)
  analyser.getByteFrequencyData(frequencyData)
  UC.drawTimeDomainChart('timeDomainChart', timeDomainData)
  UC.drawFFTChart('fftChart', frequencyData, SAMPLE_RATE)
  const binSize = SAMPLE_RATE / FFT_SIZE
  showBins(binSize, 1, frequencyData)
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

drawCharts(currentTestTone)
