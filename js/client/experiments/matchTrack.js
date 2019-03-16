import * as U from './utils/utils.js'
import * as UH from './utils/utilsHtml.js'
import * as UW from './utils/utilsWebAudioApi.js'
import * as F from './logic/fingerprinting.js'

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
const matchingSpinner = document.getElementById('matchingSpinner')
const progressRow = document.getElementById('progressRow')
const progressBar = progressRow.querySelector('.progress-bar')
const albumRow = document.getElementById('albumRow')
const noMatchFoundRow = document.getElementById('noMatchFoundRow')

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
    try {
      showMatchingSpinner()
      const matchResponse = await axios.post('/api/match', hashes)
      const album = matchResponse.data
      album ? showAlbumDetails(album) : showNoMatchFound()
    } catch (error) {
      // eslint-disable-next-line
      console.error(`[mediaRecorder.onstop] ERROR: ${error}`)
    } finally {
      hideMatchingSpinner()
    }
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
  if (state === RECORDING) {
    hideMatchingSpinner()
    noMatchFoundRow.style.display = 'none'
    albumRow.style.display = 'none'
  }
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

const showMatchingSpinner = () => {
  matchingSpinner.style.display = 'inline'
}

const hideMatchingSpinner = () => {
  matchingSpinner.style.display = 'none'
}

const showNoMatchFound = () => {
  noMatchFoundRow.style.display = 'block'
  const noMatchFoundParagraph = albumRow.querySelector('.no-match-found p')
  noMatchFoundParagraph.innerHTML = 'No match found'
}

const showAlbumDetails = album => {
  albumRow.style.display = 'block'
  const artwork = albumRow.querySelector('.album-artwork')
  const trackTitle = albumRow.querySelector('.album-track-title')
  const artist = albumRow.querySelector('.album-artist')
  const albumTitle = albumRow.querySelector('.album-title span')
  const sampleStartTime = albumRow.querySelector('.sample-start-time span')
  artwork.src = album.artwork
  trackTitle.innerHTML = album.trackTitle
  artist.innerHTML = album.artist
  albumTitle.innerHTML = album.albumTitle
  sampleStartTime.innerHTML = album.time
}