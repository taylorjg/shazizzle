/* eslint-disable no-console */

import * as U from './utils.js'
import * as UH from './utilsHtml.js'
import * as UW from './utilsWebAudioApi.js'
import * as F from './fingerprinting.js'

let currentDuration = 5
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
const resultsRow = document.getElementById('resultsRow')
const resultsPre = resultsRow.querySelector('pre')

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
    U.defer(500, updateUiState, FINISHED_RECORDING)
    const hashes = await F.getHashes(resampledAudioBuffer)
    const matchResponse = await axios.post('/api/match', hashes)
    resultsPre.innerHTML = JSON.stringify(matchResponse.data, null, 2)
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
    if (value.currentTime >= (duration + 0.1)) {
      mediaRecorder.stop()
    }
  }
})

const RECORDING = Symbol('RECORDING')
const FINISHED_RECORDING = Symbol('FINISHED_RECORDING')

const updateUiState = state => {
  recordButton.disabled = state === RECORDING
  progressRow.style.display = state === RECORDING ? 'block' : 'none'
  resultsRow.style.display = state === FINISHED_RECORDING ? 'block' : 'none'
  state === RECORDING && updateProgressBar(0)
}

recordButton.addEventListener('click', onRecord)

const updateProgressBar = percent => {
  const currentPercent = Number(progressBar.getAttribute('aria-valuenow'))
  if (percent !== currentPercent) {
    progressBar.setAttribute('aria-valuenow', percent)
    progressBar.style.width = `${percent}%`
  }
}
