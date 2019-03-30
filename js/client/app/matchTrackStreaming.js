/* eslint-disable no-console */

import { showErrorPanel, hideErrorPanel } from './errorPanel.js'
import * as C from '../common/constants.js'
import * as UH from '../common/utils/utilsHtml.js'
import * as UW from '../common/utils/utilsWebAudioApi.js'
import * as F from '../common/logic/fingerprinting.js'

const { flatMap } = rxjs.operators

// hamsters.init() /* eslint-disable-line no-undef */

// const hamstersTestPromise = async numThreads => {
//   try {
//     const params = {
//       array: Float32Array.from([1, 2, 3, 4]),
//       threads: numThreads,
//       aggregate: true,
//       dataType: 'Float32'
//     }
//     console.log(`[hamstersTestPromise] params: ${JSON.stringify(params)}`)
//     /* eslint-disable no-undef */
//     const results = await hamsters.promise(params, function () {
//       console.dir(params)
//       rtn.data = params.array.map(n => n * 4)
//     })
//     /* eslint-enable no-undef */
//     console.log(`[hamstersTestPromise] results: ${JSON.stringify(results)}`)
//     if (numThreads === 1) {
//       console.log(`[hamstersTestPromise] results: ${JSON.stringify(Array.from(results.data[0].values()))}`)
//     } else {
//       console.log(`[hamstersTestPromise] results: ${JSON.stringify(Array.from(results.data.values()))}`)
//     }
//   } catch (error) {
//     console.log(`[hamstersTestPromise] error: ${error}`)
//   }
// }

// const hamstersTests = async () => {
//   await hamstersTestPromise(1)
//   await hamstersTestPromise(2)
//   await hamstersTestPromise(4)
// }

// hamstersTests()

let currentDuration = 5

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
    let gotMatch = false
    const wsUrl = location.origin
      .replace(/^http:/, 'ws:')
      .replace(/^https:/, 'wss:')
      .concat('/streamingMatch')
    const ws = new WebSocket(wsUrl)
    ws.onclose = () => {
      console.log(`[ws onclose]`)
      stopRecording()
      !gotMatch && showNoMatchFound()
    }
    ws.onmessage = e => {
      console.log(`[ws onmessage] e.data: ${e.data}`)
      stopRecording()
      gotMatch = true
      showAlbumDetails(e.data)
    }
    ws.onerror = error => {
      console.log(`[ws onerror] e.message: ${error.message}`)
      stopRecording()
      showErrorPanel(error)
    }

    const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mediaRecorder = new MediaRecorder(mediaStream)

    const stopRecording = () => {
      mediaRecorder.stop()
      mediaStream.getTracks().forEach(track => track.stop())
      updateUiState(FINISHED_RECORDING)
      hideMatchingSpinner()
    }

    const observable = UW.createMediaStreamObservable(mediaRecorder, mediaStream).pipe(
      flatMap(audioBuffer => UW.resample(audioBuffer, C.TARGET_SAMPLE_RATE))
    )
    observable.subscribe({
      next: async audioBuffer => {
        try {
          console.dir(audioBuffer)
          // TODO: we need to employ RxJS windowing/buffering because of TARGET_ZONE_SLIVER_GAP
          const hashes = await F.getHashes(audioBuffer)
          console.log(`hashes.length: ${hashes.length}`)
          // TODO: ws.send(hashes)
        } catch (error) {
          showErrorPanel(error)
        }
      }
    })

    updateUiState(RECORDING)
    mediaRecorder.start()
    showMatchingSpinner()
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
