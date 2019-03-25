import { showErrorPanel, hideErrorPanel } from './errorPanel.js'
import * as C from '../common/constants.js'
import * as U from '../common/utils/utils.js'
import * as UH from '../common/utils/utilsHtml.js'
import * as UW from '../common/utils/utilsWebAudioApi.js'
import * as F from '../common/logic/fingerprinting.js'

let currentDuration = 5
let resampledAudioBuffer = null

const durationValues = [1, 2, 5, 10, 15, 20]

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
const albumRow = document.getElementById('albumRow')
const noMatchFoundRow = document.getElementById('noMatchFoundRow')

const onRecord = async () => {
  try {
    let intervalId = undefined
    let count = 0
    const wsUrl = location.origin
      .replace(/^http:/, 'ws:')
      .replace(/^https:/, 'wss:')
      .concat('/streamingMatch')
    console.log(`wsUrl: ${wsUrl}`)
    const ws = new WebSocket(wsUrl)
    ws.onopen = () => {
      console.log(`[ws onopen]`)
    }
    ws.onclose = () => {
      console.log(`[ws onclose]`)
      intervalId && clearInterval(intervalId)
      intervalId = undefined
    }
    ws.onmessage = e => {
      console.log(`[ws onmessage] e.data: ${e.data}`)
    }
    ws.onerror = e => {
      console.log(`[ws onerror] e.message: ${e.message}`)
      intervalId && clearInterval(intervalId)
      intervalId = undefined
    }

    intervalId = setInterval(() => {
      ws.send(`Message ${++count}`)
    }, 500)

    // const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    // const mediaRecorder = new MediaRecorder(mediaStream)
    // const chunks = []

    // mediaRecorder.ondataavailable = e => chunks.push(e.data)

    // mediaRecorder.onstop = async () => {
    //   try {
    //     const track = R.head(mediaStream.getTracks())
    //     track.stop()
    //     const mediaTrackSettings = track.getSettings()
    //     const decodedAudioBuffer = await UW.decodeChunks(chunks, mediaTrackSettings.sampleRate)
    //     resampledAudioBuffer = decodedAudioBuffer.sampleRate > C.TARGET_SAMPLE_RATE
    //       ? await UW.resample(decodedAudioBuffer, C.TARGET_SAMPLE_RATE)
    //       : decodedAudioBuffer
    //     const hashes = await F.getHashes(resampledAudioBuffer)
    //     showMatchingSpinner()
    //     const matchResponse = await axios.post('/api/match', hashes)
    //     const album = matchResponse.data
    //     album ? showAlbumDetails(album) : showNoMatchFound()
    //   } catch (error) {
    //     showErrorPanel(error)
    //   } finally {
    //     hideMatchingSpinner()
    //     U.defer(500, updateUiState, FINISHED_RECORDING)
    //   }
    // }

    // updateUiState(RECORDING)
    // mediaRecorder.start()
  } catch (error) {
    showErrorPanel(error)
  }
}

const RECORDING = Symbol('RECORDING')
const FINISHED_RECORDING = Symbol('FINISHED_RECORDING')

const updateUiState = state => {
  state === RECORDING && hideErrorPanel()
  recordButton.disabled = state === RECORDING
  if (state === RECORDING) {
    hideMatchingSpinner()
    noMatchFoundRow.style.display = 'none'
    albumRow.style.display = 'none'
  }
}

recordButton.addEventListener('click', onRecord)

const showMatchingSpinner = () => {
  matchingSpinner.style.display = 'inline'
}

const hideMatchingSpinner = () => {
  matchingSpinner.style.display = 'none'
}

const showNoMatchFound = () => {
  noMatchFoundRow.style.display = 'block'
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
