// TODO:
// * add a <pre> element to show message log
// * combine channels in the AudioWorkletProcessor
// * accumulate combined channels into a singe pre-allocated buffer in the AudioWorkletNode
// * add live visualisation of data (time domain and frequency domain)
//  * using requestAnimationFrame
//  * use the last FFT_SIZE elements of the accumulated channel data
//   * skip if we don't have enough data yet
//   * skip if we don't have any new data yet
// - add a checkbox to enable/disable live visualisation
// - add a dropdown to control FFT_SIZE used for live visualisation
// - on finished recording: allow choice of which chunk of FFT_SIZE elements to show graphs for
// - on finished recording: add radio buttons to select FFT_SIZE
// * have separate time domain chart functions for Float32Array [-1, 1] and Uint8Array [0, 255]
// - improve the x-axis labels on the charts (e.g. only show a maximum of 32 labels - unreadable when there are more)
//  - time domain
//  - frequency domain
// - provide ability to playback the captured PCM data
//  - useful to check whether there are any gaps i.e. did any data get lost ?

import '../AudioContextMonkeyPatch.js'
import * as U from '../common/utils/utils.js'
import * as UC from '../common/utils/utilsChart.js'
import * as UH from '../common/utils/utilsHtml.js'
import * as UW from '../common/utils/utilsWebAudioApi.js'
import * as UTF from '../common/utils/utilsTensorFlow.js'

const DURATIONS = [1, 2, 5, 10, 15, 20]

let currentDuration = DURATIONS[2]
let audioBuffer = undefined

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
const playButton = document.getElementById('play')
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

class StreamWorkletNode extends AudioWorkletNode {
  constructor(audioContext, name, bufferSize, duration) {
    logMessage(`[StreamWorkletNode#constructor] name: ${name}`)
    const options = {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      processorOptions: {
        bufferSize
      }
    }
    super(audioContext, name, options)
    this.accumulatedChannelData = new Float32Array(audioContext.sampleRate * duration)
    this.offset = 0
    this.messagesReceived = 0
    this.port.onmessage = message => {
      this.messagesReceived++
      if (this.messagesReceived < 3) {
        return
      }
      const channelData = message.data
      const channelDataLength = channelData.length
      logMessage(`[StreamWorkletNode#onMessage] channelDataLength: ${channelDataLength}; messagesReceived: ${this.messagesReceived}`)
      const remaining = this.accumulatedChannelData.length - this.offset
      if (remaining >= channelDataLength) {
        this.accumulatedChannelData.set(channelData, this.offset)
        this.offset += channelDataLength
      } else {
        const channelDataSlice = channelData.slice(0, remaining)
        this.accumulatedChannelData.set(channelDataSlice, this.offset)
        this.offset += remaining
      }
    }
  }
}

const formatError = error =>
  `${error.message}\n${error.stack}`.replace('\n', '<br />')

const liveChartingObserver = ({
  next: value => {
    UC.drawByteTimeDomainChart('timeDomainChart', value.timeDomainData)
    UC.drawFFTChart('fftChart', value.frequencyData, value.sampleRate)
  }
})

const createAudioBuffer = (audioContext, srcChannelData, length) => {
  const audioBuffer = audioContext.createBuffer(1, length, audioContext.sampleRate)
  const srcChannelDataSlice = srcChannelData.slice(0, length)
  const destChannelData = audioBuffer.getChannelData(0)
  destChannelData.set(srcChannelDataSlice)
  return audioBuffer
}

const onRecord = async () => {

  const FFT_SIZE = 4096

  let mediaStream
  let audioContext
  let streamWorkletNode
  let sampleRate

  try {
    UH.hideErrorPanel()
    clearMessages()

    audioContext = new AudioContext()
    sampleRate = audioContext.sampleRate
    logMessage(`sampleRate: ${sampleRate}`)
    const moduleUrl = `${location.origin}/experiments/stream-processor.js`
    await audioContext.audioWorklet.addModule(moduleUrl)

    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate
      },
      video: false
    })

    const track = mediaStream.getTracks()[0]
    console.log('track', track)
    console.log('track.getSettings()', track.getSettings())

    const mediaStreamSourceNode = audioContext.createMediaStreamSource(mediaStream)
    streamWorkletNode = new StreamWorkletNode(audioContext, 'stream-processor', FFT_SIZE, currentDuration)
    mediaStreamSourceNode.connect(streamWorkletNode)
    streamWorkletNode.connect(audioContext.destination)

    if (!audioContext.$$audioWorklet) {
      const liveVisualisationObservable = UW.createLiveVisualisationObservable2(mediaStreamSourceNode, 1024)
      liveVisualisationObservable.subscribe(liveChartingObserver)
    }

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
      logMessage(`[setTimeout callback] streamWorkletNode.accumulatedChannelData.length: ${streamWorkletNode.accumulatedChannelData.length}`)
      logMessage(`[setTimeout callback] streamWorkletNode.offset: ${streamWorkletNode.offset}`)

      if (streamWorkletNode.offset >= FFT_SIZE) {
        U.defer(100, async () => {
          const begin = streamWorkletNode.offset - FFT_SIZE
          const end = begin + FFT_SIZE
          const channelData = streamWorkletNode.accumulatedChannelData.slice(begin, end)
          UC.drawFloatTimeDomainChart('timeDomainChart', channelData)
          const frequencyData = await UTF.getFrequencyData(channelData)
          UC.drawFFTChart('fftChart', frequencyData, sampleRate)
          const binSize = sampleRate / FFT_SIZE
          showBins(binSize, frequencyData)
          {
            const audioContext2 = new AudioContext({ sampleRate })
            audioBuffer = createAudioBuffer(
              audioContext2,
              streamWorkletNode.accumulatedChannelData,
              streamWorkletNode.offset)
          }
        })
      }
    } catch (error) {
      UH.showErrorPanel(formatError(error))
    }
  }, currentDuration * 1000 + 250)
}

const onPlay = async () => {
  if (!audioBuffer) return
  console.dir(audioBuffer)
  const audioContext = new AudioContext({ sampleRate: audioBuffer.sampleRate })
  const bufferSourceNode = audioContext.createBufferSource()
  bufferSourceNode.buffer = audioBuffer
  bufferSourceNode.connect(audioContext.destination)
  bufferSourceNode.start()
  setTimeout(() => audioContext.close(), audioBuffer.duration * 1000)
}

const RECORDING = Symbol('RECORDING')
const FINISHED_RECORDING = Symbol('FINISHED_RECORDING')

const updateUiState = state => {
  recordButton.disabled = state === RECORDING
  binsRow.style.display = state === FINISHED_RECORDING ? 'block' : 'none'
}

recordButton.addEventListener('click', onRecord)
playButton.addEventListener('click', onPlay)

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
