// TODO:
// * add message area <pre> element
// - handle FFT_SIZE < ScriptProcessorNode buffer size
//  - in StreamWorklet#onMessage, accumulate all buffers into a single buffer
//   - with combined channel data
//  - preallocate buffer ?
// - add radio buttons to select FFT_SIZE
// - add live visualisation of data (time domain and frequency domain)
//  - using requestAnimationFrame
//  - use last FFT_SIZE elements of accumulated/combined data
//   - skip if we don't have enough data yet
// allow selection of sliver to show data for (full slivers only)
// - index 0: first FFT_SIZE elements
// - index 1: second FFT_SIZE elements
// - etc.
// have separate time domain chart functions for Float32Array [-1, 1] and Uint8Array [0, 255]
//  - won't need to do floatToByte
// improve labels on charts
//  - time domain
//  - frequency domain

import '../AudioContextMonkeyPatch.js'
import * as UC from '../common/utils/utilsChart.js'
import * as UH from '../common/utils/utilsHtml.js'

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
const messageLog = document.getElementById('messageLog')

const clearMessages = () =>
  messageLog.innerText = ''

const logMessage = message => {
  const oldText = messageLog.innerText
  const newText = oldText ? `${oldText}\n${message}` : message
  messageLog.innerText = newText
}

class StreamWorklet extends AudioWorkletNode {
  constructor(audioContext, name, bufferSize) {
    logMessage(`[StreamWorklet#constructor] name: ${name}`)
    const options = {
      processorOptions: {
        bufferSize
      }
    }
    super(audioContext, name, options)
    this.allBuffers = []
    this.port.onmessage = message => {
      const buffers = message.data
      logMessage(`[StreamWorklet#onMessage] buffers.length: ${buffers.length}; buffers[0].length: ${buffers[0].length}`)
      this.allBuffers.push(buffers)
    }
  }
}

const formatError = error =>
  `${error.message}\n${error.stack}`.replace('\n', '<br />')

const combineChannels = channels => {
  const numberOfChannels = channels.length
  if (numberOfChannels === 1) return channels[0]
  if (numberOfChannels === 2) {
    const [channel0, channel1] = channels
    return channel0.map((value, idx) => 0.5 * (value + channel1[idx]))
  }
  throw new Error(`[combineChannels] expected 1 or 2 channels but got ${numberOfChannels}`)
}

const getFrequencyData = async channelData => {
  const real = tf.tensor1d(channelData)
  const imag = tf.zerosLike(real)
  const x = tf.complex(real, imag)
  const X = x.fft()
  const reX = await tf.real(X).data()
  return reX.slice(0, reX.length / 2)
}

// [-1, 1] => [0, 255]
const floatToByte = v => Math.round((v + 1) / 2 * 255)

const onRecord = async () => {

  const FFT_SIZE = 4096

  let mediaStream
  let audioContext
  let streamWorklet

  try {
    UH.hideErrorPanel()
    clearMessages()
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    audioContext = new AudioContext()
    logMessage(`audioContext.sampleRate: ${audioContext.sampleRate}`)
    const sourceNode = audioContext.createMediaStreamSource(mediaStream)
    const moduleUrl = `${location.origin}/experiments/stream-processor.js`
    await audioContext.audioWorklet.addModule(moduleUrl)
    streamWorklet = new StreamWorklet(audioContext, 'stream-processor', FFT_SIZE)
    sourceNode.connect(streamWorklet)
    streamWorklet.connect(audioContext.destination)
    updateUiState(RECORDING)
  } catch (error) {
    UH.showErrorPanel(formatError(error))
    return
  }

  setTimeout(async () => {
    try {
      logMessage(`[setTimeout callback] stopping tracks`)
      mediaStream.getTracks().forEach(track => track.stop())
      logMessage(`[setTimeout callback] closing audioContext`)
      await audioContext.close()
      updateUiState(FINISHED_RECORDING)
      logMessage(`[setTimeout callback] streamWorklet.allBuffers.length: ${streamWorklet.allBuffers.length}`)

      const channels = streamWorklet.allBuffers.slice(-1)[0]
      const combinedChannel = combineChannels(channels)

      UC.drawTimeDomainChart('timeDomainChart', combinedChannel.map(floatToByte))

      const sampleRate = audioContext.sampleRate
      const frequencyData = await getFrequencyData(combinedChannel)
      UC.drawFFTChart('fftChart', frequencyData, sampleRate)
      const binSize = sampleRate / FFT_SIZE
      showBins(binSize, frequencyData)
    } catch (error) {
      UH.showErrorPanel(formatError(error))
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
  const topFewBins = R.take(1, topBins)
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
  binsPre.innerText = lines.join('\n')
}
