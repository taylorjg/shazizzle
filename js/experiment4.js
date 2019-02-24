import * as C from './constants.js'
import * as UC from './utilsChart.js'
import * as UH from './utilsHtml.js'
import * as UW from './utilsWebAudioApi.js'
import * as F from './fingerprinting.js'

let currentDuration = 5
let currentSliver = 0
let maxSliver = 0
let resampledAudioBuffer = null

const durationValues = [5, 10, 15, 20]

const durationRadioButtons = UH.createRadioButtons(
  'durations',
  'duration',
  durationValues)

const onDurationChange = () => {
  currentDuration = UH.getCheckedRadioButton(durationRadioButtons)
}

UH.setCheckedRadioButton(durationRadioButtons, currentDuration)
UH.buttonsOnChange(durationRadioButtons, onDurationChange)

const recordButton = document.getElementById('record')
const progressRow = document.getElementById('progressRow')
const progressBar = progressRow.querySelector('.progress-bar')
const buttonsRow = document.getElementById('buttonsRow')
const sliderRow = document.getElementById('sliderRow')
const fastBackwardButton = document.getElementById('fastBackward')
const stepBackwardButton = document.getElementById('stepBackward')
const stepForwardButton = document.getElementById('stepForward')
const fastForwardButton = document.getElementById('fastForward')
const currentSliverLabel = document.getElementById('currentSliverLabel')
const maxSliverLabel = document.getElementById('maxSliverLabel')
const slider = document.getElementById('slider')
const spectrogramRow = document.getElementById('spectrogramRow')
const detailsRow = document.getElementById('detailsRow')
const detailsPre = detailsRow.querySelector('pre')

const onRecord = async () => {

  const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mediaRecorder = new MediaRecorder(mediaStream)

  const chunks = []
  mediaRecorder.ondataavailable = e => chunks.push(e.data)

  mediaRecorder.onstart = () => {
    const liveVisualisationObservable = UW.createLiveVisualisationObservable(mediaRecorder, mediaStream)
    liveVisualisationObservable.subscribe(makeLiveChartingObserver(mediaRecorder, currentDuration))
  }

  mediaRecorder.onstop = async () => {
    const track = R.head(mediaStream.getTracks())
    track.stop()
    const mediaTrackSettings = track.getSettings()
    const decodedAudioBuffer = await UW.decodeChunks(chunks, mediaTrackSettings.sampleRate)
    resampledAudioBuffer = decodedAudioBuffer.sampleRate > 16000
      ? await UW.resample(decodedAudioBuffer, 16000)
      : decodedAudioBuffer
    currentSliver = 0
    maxSliver = Math.floor(resampledAudioBuffer.duration / C.SLIVER_DURATION)
    slider.min = 0
    slider.max = maxSliver - 1
    setCurrentSliver(0)()
    drawSpectrogram(resampledAudioBuffer)

    showDetails(decodedAudioBuffer, resampledAudioBuffer)
    setTimeout(updateUiState, 500, FINISHED_RECORDING)

    const prominentFrequencies = await F.getProminentFrequencies(resampledAudioBuffer)
    /* eslint-disable-next-line */
    console.dir(prominentFrequencies)
  }

  updateUiState(RECORDING)
  mediaRecorder.start()
}

const makeLiveChartingObserver = (mediaRecorder, duration) => ({
  next: value => {
    if (value.currentTime % 1 < 0.5) {
      const percent = R.clamp(0, 100, Math.round(value.currentTime / duration * 100))
      updateProgressBar(percent)
    }
    UC.drawTimeDomainChart('timeDomainChart', value.timeDomainData)
    UC.drawFFTChart('fftChart', value.frequencyData, value.sampleRate)
    if (value.currentTime >= duration) {
      mediaRecorder.stop()
    }
  }
})

const drawSpectrogram = async audioBuffer => {
  const sliverCount = Math.floor(audioBuffer.duration / C.SLIVER_DURATION)
  const sliverIndices = R.range(0, sliverCount)
  const promises = sliverIndices.map(async sliverIndex => {
    const { frequencyData } = await UW.getSliverData(audioBuffer, sliverIndex)
    return frequencyData
  })
  const data = await Promise.all(promises)
  UC.drawSpectrogram('spectrogram', data, audioBuffer.duration, audioBuffer.sampleRate)
}

const RECORDING = Symbol('RECORDING')
const FINISHED_RECORDING = Symbol('FINISHED_RECORDING')

const updateUiState = state => {
  recordButton.disabled = state === RECORDING
  progressRow.style.display = state === RECORDING ? 'block' : 'none'
  buttonsRow.style.display = state === FINISHED_RECORDING ? 'block' : 'none'
  sliderRow.style.display = state === FINISHED_RECORDING ? 'block' : 'none'
  spectrogramRow.style.display = state === FINISHED_RECORDING ? 'block' : 'none'
  detailsRow.style.display = state === FINISHED_RECORDING ? 'block' : 'none'
  state === RECORDING && updateProgressBar(0)
}

const updateSliverControlsState = () => {
  fastBackwardButton.disabled = currentSliver < 10
  stepBackwardButton.disabled = currentSliver < 1
  stepForwardButton.disabled = currentSliver >= (maxSliver - 1)
  fastForwardButton.disabled = currentSliver >= (maxSliver - 10)
}

const setCurrentSliver = adjustment => async () => {
  currentSliver += adjustment
  slider.value = currentSliver
  updateSliverControlsState()
  currentSliverLabel.innerText = `${currentSliver + 1}`
  maxSliverLabel.innerText = `${maxSliver}`
  const { timeDomainData, frequencyData } = await UW.getSliverData(resampledAudioBuffer, currentSliver)
  UC.drawTimeDomainChart('timeDomainChart', timeDomainData)
  UC.drawFFTChart('fftChart', frequencyData, resampledAudioBuffer.sampleRate)
}

const onSliverSliderChange = e => {
  currentSliver = e.target.valueAsNumber
  setCurrentSliver(0)()
}

fastBackwardButton.addEventListener('click', setCurrentSliver(-10))
stepBackwardButton.addEventListener('click', setCurrentSliver(-1))
stepForwardButton.addEventListener('click', setCurrentSliver(+1))
fastForwardButton.addEventListener('click', setCurrentSliver(+10))

slider.addEventListener('click', onSliverSliderChange)
// TODO: use RxJS's debounceTime ?
slider.addEventListener('input', onSliverSliderChange)

recordButton.addEventListener('click', onRecord)

const updateProgressBar = percent => {
  const currentPercent = Number(progressBar.getAttribute('aria-valuenow'))
  if (percent !== currentPercent) {
    progressBar.setAttribute('aria-valuenow', percent)
    progressBar.style.width = `${percent}%`
  }
}

const showDetails = (decodedAudioBuffer, resampledAudioBuffer) => {

  const formatAudioBuffer = (label, audioBuffer) => `
${label}:
  duration:         ${audioBuffer.duration}
  length:           ${audioBuffer.length}
  numberOfChannels: ${audioBuffer.numberOfChannels}
  sampleRate:       ${audioBuffer.sampleRate}
`.trim()

  const bufferDetails1 = formatAudioBuffer('Decoded buffer', decodedAudioBuffer)
  const bufferDetails2 = formatAudioBuffer('Resampled buffer', resampledAudioBuffer)

  detailsPre.innerHTML = decodedAudioBuffer === resampledAudioBuffer
    ? bufferDetails1
    : [bufferDetails1, '', bufferDetails2].join('\n')
}
