// TODO:
// * add a <pre> element to show message log
// * combine channels in the AudioWorkletProcessor
// * accumulate combined channels into a singe pre-allocated buffer in the AudioWorkletNode
// * add live visualisation of data (time domain and frequency domain)
//  * using requestAnimationFrame
//  * use the last FFT_SIZE elements of the accumulated channel data
//   * skip if we don't have enough data yet
//   * skip if we don't have any new data yet
// - allow selection of sliver to show data for (full slivers only)
//  - index 0: first FFT_SIZE elements
//  - index 1: second FFT_SIZE elements
//  - etc.
// - add radio buttons to select FFT_SIZE
// * have separate time domain chart functions for Float32Array [-1, 1] and Uint8Array [0, 255]
// - improve labels on charts
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
  console.log(message)
  const oldText = messageLog.innerText
  const newText = oldText ? `${oldText}\n${message}` : message
  messageLog.innerText = newText
}

class StreamWorklet extends AudioWorkletNode {
  constructor(audioContext, name, bufferSize, duration) {
    logMessage(`[StreamWorklet#constructor] name: ${name}`)
    const options = {
      processorOptions: {
        bufferSize
      }
    }
    super(audioContext, name, options)
    this.accumulatedChannelData = new Float32Array(audioContext.sampleRate * duration)
    this.offset = 0
    this.port.onmessage = message => {
      const channelData = message.data
      const channelDataLength = channelData.length
      logMessage(`[StreamWorklet#onMessage] channelDataLength: ${channelDataLength}`)
      if (this.offset + channelDataLength <= this.accumulatedChannelData.length) {
        this.accumulatedChannelData.set(channelData, this.offset)
        this.offset += channelDataLength
      }
    }
  }
}

const doLiveVisualisation = (mediaStream, streamWorklet, sampleRate, fftSize) => {
  const track = mediaStream.getTracks()[0]
  let lastBegin = -1
  const render = async () => {
    if (streamWorklet.offset >= fftSize) {
      const begin = streamWorklet.offset - fftSize
      const end = streamWorklet.offset
      if (begin > lastBegin) {
        const channelData = streamWorklet.accumulatedChannelData.slice(begin, end)
        UC.drawFloatTimeDomainChart('timeDomainChart', channelData)
        const frequencyData = await getFrequencyData(channelData)
        UC.drawFFTChart('fftChart', frequencyData, sampleRate)
        lastBegin = begin
      }
    }
    if (track.enabled) {
      requestAnimationFrame(render)
    }
  }
  requestAnimationFrame(render)
}

const formatError = error =>
  `${error.message}\n${error.stack}`.replace('\n', '<br />')

const getFrequencyData = async channelData => {
  const real = tf.tensor1d(channelData)
  const imag = tf.zerosLike(real)
  const x = tf.complex(real, imag)
  const X = x.fft()
  const reX = await tf.real(X).data()
  return reX.slice(0, reX.length / 2)
}

const onRecord = async () => {

  const FFT_SIZE = 4096

  let mediaStream
  let audioContext
  let streamWorklet

  try {
    UH.hideErrorPanel()
    clearMessages()

    audioContext = new AudioContext()
    logMessage(`audioContext.sampleRate: ${audioContext.sampleRate}`)
    const moduleUrl = `${location.origin}/experiments/stream-processor.js`
    await audioContext.audioWorklet.addModule(moduleUrl)

    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const sourceNode = audioContext.createMediaStreamSource(mediaStream)
    streamWorklet = new StreamWorklet(audioContext, 'stream-processor', FFT_SIZE, currentDuration)
    sourceNode.connect(streamWorklet)
    streamWorklet.connect(audioContext.destination)
    updateUiState(RECORDING)
    if (audioContext.audioWorklet.$$context === undefined) {
      doLiveVisualisation(mediaStream, streamWorklet, audioContext.sampleRate, 1024)
    }
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
      logMessage(`[setTimeout callback] streamWorklet.accumulatedChannelData.length: ${streamWorklet.accumulatedChannelData.length}`)
      logMessage(`[setTimeout callback] streamWorklet.offset: ${streamWorklet.offset}`)

      if (streamWorklet.offset >= FFT_SIZE) {
        const begin = streamWorklet.offset - FFT_SIZE
        const end = streamWorklet.offset
        const channelData = streamWorklet.accumulatedChannelData.slice(begin, end)
        UC.drawFloatTimeDomainChart('timeDomainChart', channelData)
        const sampleRate = audioContext.sampleRate
        const frequencyData = await getFrequencyData(channelData)
        UC.drawFFTChart('fftChart', frequencyData, sampleRate)
        const binSize = sampleRate / FFT_SIZE
        showBins(binSize, frequencyData)
      }
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
