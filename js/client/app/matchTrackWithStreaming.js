/* eslint-disable no-console */

import { showErrorPanel, hideErrorPanel } from './errorPanel.js'
import * as C from '../common/constants.js'
import * as UW from '../common/utils/utilsWebAudioApi.js'
import * as F from '../common/logic/fingerprinting.js'
import { createPcmObservable } from '../common/utils/pcmObservable.js'

const { bufferCount, filter, flatMap, map } = rxjs.operators

const recordButton = document.getElementById('record')
const matchingSpinner = document.getElementById('matchingSpinner')
const listeningAnimationRow = document.getElementById('listeningAnimationRow')
const listeningAnimation = document.getElementById('listeningAnimation')
const albumRow = document.getElementById('albumRow')
const noMatchFoundRow = document.getElementById('noMatchFoundRow')
const elapsedTimeRow = document.getElementById('elapsedTimeRow')

const onRecord = async () => {
  try {
    const startTime = performance.now()
    let gotMatch = false
    const wsUrl = location.origin
      .replace(/^http:/, 'ws:')
      .replace(/^https:/, 'wss:')
      .concat('/streamingMatch')
    const ws = new WebSocket(wsUrl)
    ws.onclose = () => {
      console.log(`[ws.onclose]`)
      stopRecording()
      !gotMatch && showNoMatchFound()
    }
    ws.onmessage = e => {
      const match = JSON.parse(e.data)
      console.log(`[ws.onmessage] match:\n${JSON.stringify(match, null, 2)}`)
      stopRecording()
      gotMatch = true
      showAlbumDetails(match)
    }
    ws.onerror = error => {
      console.log(`[ws.onerror] ${error.message}`)
      stopRecording()
      showErrorPanel(error)
    }

    const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mediaRecorder = new MediaRecorder(mediaStream)

    const stopRecording = () => {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop()
        mediaStream.getTracks().forEach(track => track.stop())
        updateUiState(FINISHED_RECORDING)
        hideMatchingSpinner()
        const endTime = performance.now()
        const elapsedTime = ((endTime - startTime) / 1000).toFixed(2)
        showElapsedTime(elapsedTime)
      }
    }

    // Create observable of PCM data in multiples of sliver duration.
    const pcmObservable = await createPcmObservable(mediaRecorder, mediaStream, 5)

    const hashesObservable = pcmObservable
      .pipe(
        map(toAudioBuffer),
        flatMap(resample),
        flatMap(F.getProminentFrequencies),
        flatMap(R.identity),
        map(addIndex()),
        filter(nonEmptySliver),
        bufferCount(10, 5),
        flatMap(F.getHashesFromProminentFrequenciesWithIndices)
      )

    hashesObservable.subscribe({
      next: hashes => {
        console.log(`[hashesObservable.next] hashes.length: ${hashes.length}`)
        if (ws.readyState === 1) {
          ws.send(JSON.stringify(hashes))
        }
      },
      complete: () => {
        console.log(`[hashesObservable.complete]`)
      },
      error: error => {
        console.log(`[hashesObservable.error] ${error.message}`)
      }
    })

    updateUiState(RECORDING)
    mediaRecorder.start()
    showMatchingSpinner()
  } catch (error) {
    showErrorPanel(error)
  }
}

const toAudioBuffer = ({ channelData, sampleRate }) =>
  UW.createAudioBuffer(channelData, sampleRate)

const resample = audioBuffer =>
  UW.resample(audioBuffer, C.TARGET_SAMPLE_RATE)

const addIndex = (index = 0) =>
  item => [item, index++]

const nonEmptySliver = ([pfs]) =>
  pfs.length > 0

const RECORDING = Symbol('RECORDING')
const FINISHED_RECORDING = Symbol('FINISHED_RECORDING')

const updateUiState = state => {
  state === RECORDING && hideErrorPanel()
  recordButton.disabled = state === RECORDING
  listeningAnimationRow.style.display = state === RECORDING ? 'block' : 'none'
  if (state === RECORDING) {
    hideMatchingSpinner()
    noMatchFoundRow.style.display = 'none'
    albumRow.style.display = 'none'
    elapsedTimeRow.style.display = 'none'
    listeningAnimation.style.height = listeningAnimation.getBoundingClientRect().width
    const maskRect = document.getElementById('maskRect')
    maskRect.style.width = listeningAnimation.getBoundingClientRect().width
    maskRect.style.height = listeningAnimation.getBoundingClientRect().height
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

const showElapsedTime = elapsedTime => {
  elapsedTimeRow.style.display = 'block'
  const elapsedTimePre = elapsedTimeRow.querySelector('pre')
  elapsedTimePre.innerHTML = `Elapsed time: ${elapsedTime}`
}
