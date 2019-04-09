/* eslint-disable no-console */

import { showErrorPanel, hideErrorPanel } from './errorPanel.js'
import * as C from '../common/constants.js'
import * as UW from '../common/utils/utilsWebAudioApi.js'
import * as UC from '../common/utils/utilsChart.js'
import * as F from '../common/logic/fingerprinting.js'

const { bufferCount, filter, flatMap, map, tap } = rxjs.operators

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
      console.log(`[ws.onclose]`)
      stopRecording()
      !gotMatch && showNoMatchFound()
    }
    ws.onmessage = e => {
      console.log(`[ws.onmessage] e.data: ${e.data}`)
      stopRecording()
      gotMatch = true
      showAlbumDetails(e.data)
    }
    ws.onerror = error => {
      console.log(`[ws.onerror] e.message: ${error.message}`)
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

    // Create observable of PCM data in multiples of sliver duration.
    const pcmObservable = await UW.createPcmObservable(mediaRecorder, mediaStream, 5)

    const hashesObservable = pcmObservable
      .pipe(
        map(toAudioBuffer),
        flatMap(resample),
        tap(visualise),
        flatMap(getProminentFrequenciesWithIndices()),
        flatMap(flatten),
        filter(notEmpty),
        bufferCount(10, 5)
        // TODO: getHashes
      )

    hashesObservable.subscribe({
      next: hashes => {
        console.dir(hashes)
        // console.log(`[observable.next] hashes.length: ${JSON.stringify(hashes.length)}`)
        // TODO: ws.send(hashes)
      },
      complete: () => {
        console.log(`[observable.complete]`)
      },
      error: error => {
        console.log(`[observable.error] ${error.message}`)
      }
    })

    updateUiState(RECORDING)
    mediaRecorder.start()
    showMatchingSpinner()
  } catch (error) {
    showErrorPanel(error)
  }
}

const toAudioBuffer = ({ channelData, sampleRate }) => {
  console.log(`[toAudioBuffer] channelData.length: ${channelData.length}; sampleRate: ${sampleRate}`)
  return UW.createAudioBuffer(channelData, sampleRate)
}

const resample = audioBuffer => {
  console.log(`[resample] audioBuffer.duration: ${audioBuffer.duration}`)
  return UW.resample(audioBuffer, C.TARGET_SAMPLE_RATE)
}

const getProminentFrequenciesWithIndices = () => {
  let index = 0
  return async audioBuffer => {
    console.log(`[getProminentFrequencies] audioBuffer.duration: ${audioBuffer.duration}`)
    const values = await F.getProminentFrequencies(audioBuffer)
    return values.map(value => ({
      value,
      index: index++
    }))
  }
}

const flatten = value => rxjs.of(...value)

const notEmpty = value => value.value.length > 0

const visualise = async audioBuffer => {
  console.log(`[visualise] audioBuffer.duration: ${audioBuffer.duration}`)
  const frequencyData = await UW.getSliverFrequencyData(audioBuffer, 0)
  UC.drawFFTChart('fftChart', frequencyData, C.TARGET_SAMPLE_RATE)
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
