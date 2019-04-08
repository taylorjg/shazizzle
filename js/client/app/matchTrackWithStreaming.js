/* eslint-disable no-console */

import { showErrorPanel, hideErrorPanel } from './errorPanel.js'
// import * as C from '../common/constants.js'
// import * as UW from '../common/utils/utilsWebAudioApi.js'
// import * as F from '../common/logic/fingerprinting.js'

// const { flatMap } = rxjs.operators

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

    const audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(mediaStream)
    await audioContext.audioWorklet.addModule('pcmInterceptor.js')
    const workletNode = new PcmInterceptorWorkletNode(audioContext)
    source.connect(workletNode)
    workletNode.connect(audioContext.destination)
    mediaRecorder.onstop = () => {
      audioContext.close()
      console.log(`[mediaRecorder.onstop] audioContext.currentTime: ${audioContext.currentTime}`)
    }
  
    updateUiState(RECORDING)
    mediaRecorder.start()
    showMatchingSpinner()
  } catch (error) {
    showErrorPanel(error)
  }
}

class PcmInterceptorWorkletNode extends AudioWorkletNode {
  constructor(context, options) {
    console.log(`[PcmInterceptorWorkletNode#constructor]`)
    super(context, 'PcmInterceptor', options)
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
