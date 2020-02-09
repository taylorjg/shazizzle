import '../AudioContextMonkeyPatch.js'
import * as UC from '../common/utils/utilsChart.js'
import * as UH from '../common/utils/utilsHtml.js'
import * as UW from '../common/utils/utilsWebAudioApi.js'

const DURATIONS = [1, 2, 5, 10, 15, 20]

let currentDuration = DURATIONS[2]

const durationRadioButtons = UH.createRadioButtons(
  'durations',
  'duration',
  DURATIONS)

const onDurationChange = () => {
  currentDuration = Number(UH.getCheckedRadioButton(durationRadioButtons))
}

UH.setCheckedRadioButton(durationRadioButtons, currentDuration)
UH.radioButtonsOnChange(durationRadioButtons, onDurationChange)

const recordButton = document.getElementById('record')
const binsRow = document.getElementById('binsRow')

class StreamWorklet extends AudioWorkletNode {
  constructor(audioContext, name, bufferSize) {
    console.log(`[StreamWorklet#constructor] name: ${name}; sampleRate: ${audioContext.sampleRate}`)
    const options = {
      processorOptions: {
        bufferSize
      }
    }
    super(audioContext, name, options)
    this.allBuffers = []
    this.port.onmessage = message => {
      const buffers = message.data
      console.log(`[StreamWorklet#onMessage] buffers.length: ${buffers.length}; buffers[0].length: ${buffers[0].length}`)
      this.allBuffers.push(buffers)
    }
  }
}

const createAudioBuffer = (offlineAudioContext, channels) => {
  const numberOfChannels = channels.length
  const length = channels[0].length
  const sampleRate = offlineAudioContext.sampleRate
  const audioBuffer = offlineAudioContext.createBuffer(numberOfChannels, length, sampleRate)
  channels.forEach((srcChannelData, channelIndex) => {
    const destChannelData = audioBuffer.getChannelData(channelIndex)
    destChannelData.set(srcChannelData)
  })
  return audioBuffer
}

// [-1, 1] => [0, 255]
const floatToByte = v => Math.round((v + 1) / 2 * 255)

/* -------------------------------------------------------------------------- */

// https://stackoverflow.com/questions/53150556/accessing-microphone-with-the-help-of-getusermedia-on-ios-safari

if (navigator.mediaDevices === undefined) {
  navigator.mediaDevices = {}
}

if (navigator.mediaDevices.getUserMedia === undefined) {
  navigator.mediaDevices.getUserMedia = constraints => {
    const getUserMedia = (
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia
    )

    if (!getUserMedia) {
      return Promise.reject(new Error('getUserMedia is not implemented in this browser'))
    }

    return new Promise((resolve, reject) =>
      getUserMedia.call(navigator, constraints, resolve, reject))
  }
}

/* -------------------------------------------------------------------------- */

const onRecord = async () => {

  const FFT_SIZE = 4096

  let mediaStream
  let audioContext
  let streamWorklet

  try {
    UH.hideErrorPanel()
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    audioContext = new AudioContext()
    const sourceNode = audioContext.createMediaStreamSource(mediaStream)
    const moduleUrl = `${location.origin}/experiments/stream-processor.js`
    await audioContext.audioWorklet.addModule(moduleUrl)
    streamWorklet = new StreamWorklet(audioContext, 'stream-processor', FFT_SIZE)
    sourceNode.connect(streamWorklet)
    streamWorklet.connect(audioContext.destination)
    updateUiState(RECORDING)
  } catch (error) {
    UH.showErrorPanel((error.message + '\n' + error.stack).replace('\n', '<br />'))
  }

  setTimeout(async () => {
    try {
      mediaStream.getTracks().forEach(track => track.stop())
      await audioContext.close()
      updateUiState(FINISHED_RECORDING)
      console.dir(`streamWorklet.allBuffers.length: ${streamWorklet.allBuffers.length}`)

      const numberOfChannels = streamWorklet.allBuffers[0].length
      const length = FFT_SIZE
      const sampleRate = audioContext.sampleRate
      const offlineAudioContext = new OfflineAudioContext(numberOfChannels, length, sampleRate)

      const channels = streamWorklet.allBuffers[3]
      const audioBuffer = createAudioBuffer(offlineAudioContext, channels)

      const analyserNode = offlineAudioContext.createAnalyser()
      analyserNode.fftSize = FFT_SIZE
      const sourceNode = offlineAudioContext.createBufferSource()
      sourceNode.buffer = audioBuffer
      sourceNode.connect(analyserNode)
      sourceNode.connect(offlineAudioContext.destination)
      sourceNode.start()
      await UW.startRenderingPromise(offlineAudioContext)

      // const timeDomainData = new Uint8Array(analyserNode.frequencyBinCount)
      // analyserNode.getByteTimeDomainData(timeDomainData)
      // UC.drawTimeDomainChart('timeDomainChart', timeDomainData)
      UC.drawTimeDomainChart('timeDomainChart', channels[0].map(floatToByte))

      const frequencyData = new Uint8Array(analyserNode.frequencyBinCount)
      analyserNode.getByteFrequencyData(frequencyData)

      UC.drawFFTChart('fftChart', frequencyData, sampleRate)
      const binSize = sampleRate / FFT_SIZE
      showBins(binSize, frequencyData)
    } catch (error) {
      UH.showErrorPanel((error.message + '\n' + error.stack).replace('\n', '<br />'))
    }
  }, currentDuration * 1000)
}

const RECORDING = Symbol('RECORDING')
const FINISHED_RECORDING = Symbol('FINISHED_RECORDING')

const updateUiState = state => {
  recordButton.disabled = state === RECORDING
  binsRow.style.display = state === FINISHED_RECORDING ? 'block' : 'none'
}

recordButton.addEventListener('click', onRecord)

const findTopBins = frequencyData => {
  const binValues = Array.from(frequencyData)
  const zipped = binValues.map((value, bin) => ({ value, bin }))
  return zipped.sort((a, b) => b.value - a.value)
}

const showBins = (binSize, frequencyData) => {
  const topBins = findTopBins(frequencyData)
  const topFewBins = R.take(4, topBins)
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
