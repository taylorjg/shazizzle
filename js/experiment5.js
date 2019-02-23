/* eslint-disable no-console */

import { getColourMap } from './colourMaps.js'
import * as C from './constants.js'
import * as U from './utils.js'
import * as UC from './utilsChart.js'
import * as UH from './utilsHtml.js'
import * as UW from './utilsWebAudioApi.js'

hamsters.init()

// const hamstersTestPromise = async numThreads => {
//   try {
//     const params = {
//       array: Uint8Array.from([1, 2, 3, 4]),
//       threads: numThreads,
//       aggregate: numThreads > 1,
//       dataType: 'Uint8'
//     }
//     console.log(`[hamstersTestPromise] params: ${JSON.stringify(params)}`)
//     const results = await hamsters.promise(params, function () {
//       rtn.data = params.array.map(n => n * 4)
//     })
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
let currentSliver = 0
let maxSliver = 0
let mediaTrackSettings = null
let audioBuffer = null

const durationValues = [1, 2, 5, 10, 15]

const SCRIPT_PROCESSOR_BUFFER_SIZE = 1024

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
const controlPanel1 = document.getElementById('controlPanel1')
const controlPanel2 = document.getElementById('controlPanel2')
const fastBackward44 = document.getElementById('fastBackward44')
const fastBackward10 = document.getElementById('fastBackward10')
const stepBackward = document.getElementById('stepBackward')
const stepForward = document.getElementById('stepForward')
const fastForward10 = document.getElementById('fastForward10')
const fastForward44 = document.getElementById('fastForward44')
const currentSliverLabel = document.getElementById('currentSliverLabel')
const maxSliverLabel = document.getElementById('maxSliverLabel')
const sliverSlider = document.getElementById('sliverSlider')

const onRecord = async () => {

  initialiseSpectrogram('spectrogram1')
  initialiseSpectrogram('spectrogram2')
  updateRecordingState(true)

  const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })

  const track = R.head(mediaStream.getTracks())
  mediaTrackSettings = track.getSettings()
  console.log(`mediaTrackSettings: ${JSON.stringify(mediaTrackSettings, null, 2)}`)
  const sliverCount = (mediaTrackSettings.sampleRate / SCRIPT_PROCESSOR_BUFFER_SIZE) * currentDuration
  console.log(`sliverCount: ${sliverCount}`)

  const chunks = []
  const mediaRecorder = new MediaRecorder(mediaStream)

  mediaRecorder.ondataavailable = e => chunks.push(e.data)

  mediaRecorder.onstart = () => {
    createLiveAnalysisObservable(mediaRecorder, mediaStream, mediaTrackSettings.sampleRate)

    const chart = document.getElementById('spectrogram2')
    const ctx = chart.getContext('2d')
    const cw = chart.clientWidth
    const ch = chart.clientHeight
    const spectrogramContext = { ctx, cw, ch }
    createMediaStreamObservable(mediaRecorder, mediaStream, onNext, spectrogramContext)
  }

  mediaRecorder.onstop = async () => {
    const blob = new Blob(chunks)
    const url = URL.createObjectURL(blob)
    try {
      const config = { responseType: 'arraybuffer' }
      const response = await axios.get(url, config)
      const data = response.data
      const audioContext = new OfflineAudioContext({ length: 1, sampleRate: mediaTrackSettings.sampleRate })
      audioBuffer = await audioContext.decodeAudioData(data)
      currentSliver = 0
      maxSliver = Math.ceil(audioBuffer.duration / C.SLIVER_DURATION)
      sliverSlider.min = 0
      sliverSlider.max = maxSliver - 1
      setCurrentSliver(0)()
      updateRecordingState(false)
      drawSpectrogram(audioBuffer)
    } finally {
      URL.revokeObjectURL(url)
      mediaStream && mediaStream.getTracks().forEach(track => track.stop())
    }
  }

  mediaRecorder.start()
  await U.delay(currentDuration * 1000)
  mediaRecorder.stop()
}

function webWorkerGetFrequencyData() {
  const channelData = params.array // eslint-disable-line
  console.log(`[webWorkerGetFFT] channelData.length: ${channelData.length}`)
  rtn.data = Uint8Array.from([1, 2, 3, 4]) // eslint-disable-line

  // const options = {
  //   numberOfChannels: inputBuffer.numberOfChannels,
  //   length: Math.ceil(inputBuffer.numberOfChannels * inputBuffer.sampleRate * SLIVER_DURATION),
  //   sampleRate: inputBuffer.sampleRate
  // }
  // const sliverBuffer = new AudioBuffer(options)
  // copySliver(inputBuffer, sliverBuffer, sliverIndex)
  // const audioContext = new OfflineAudioContext(options)
  // const sourceNode = new AudioBufferSourceNode(audioContext, { buffer: sliverBuffer })
  // const analyserNode = new AnalyserNode(audioContext, { fftSize: FFT_SIZE })
  // sourceNode.connect(audioContext.destination)
  // sourceNode.connect(analyserNode)
  // sourceNode.start()
  // await audioContext.startRendering()
  // const frequencyData = new Uint8Array(analyserNode.frequencyBinCount)
  // analyserNode.getByteFrequencyData(frequencyData)
}

const onNext = async (audioBuffer, index, spectrogramContext) => {
  console.log(`[onNext] sliverCount: index: ${index}`)

  // drawIncrementalSpectrogram('spectrogram2', audioBuffer, index, spectrogramContext)

  // TODO:
  // - get channel data from audioBuffer
  // - use hamsters.js to run FFT of the channel data
  // - https://stackoverflow.com/questions/21957824/manually-put-pcm-data-into-audiobuffer
  // - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/set
  // - await the FFT results
  // - plot the FFT results

  const channelData = audioBuffer.getChannelData(0)
  const params = {
    array: channelData
  }
  const { data: frequencyData } = await hamsters.promise(params, webWorkerGetFrequencyData)
  console.log(`[onNext] frequencyData: ${JSON.stringify(Array.from(frequencyData[0].values()))}`)
}

const initialiseSpectrogram = chartId => {
  const chart = document.getElementById(chartId)
  const cw = chart.clientWidth
  const ch = chart.clientHeight
  chart.width = cw
  chart.height = ch
}

const toRgb = ([r, g, b]) => `rgb(${r * 255}, ${g * 255}, ${b * 255})`
const colourMap = getColourMap('CMRmap').map(toRgb)

const drawIncrementalSpectrogram = async (chartId, audioBuffer, index, spectrogramContext) => {
  // const chart = document.getElementById(chartId)
  // const ctx = chart.getContext('2d')
  // const cw = chart.clientWidth
  // const ch = chart.clientHeight
  const ctx = spectrogramContext.ctx
  const cw = spectrogramContext.cw
  const ch = spectrogramContext.ch

  // const sliverCount = currentDuration / C.SLIVER_DURATION
  const sliverCount = (audioBuffer.sampleRate / SCRIPT_PROCESSOR_BUFFER_SIZE) * currentDuration
  console.log(`[drawIncrementalSpectrogram] sliverCount: ${sliverCount}; index: ${index}`)
  const w = cw / sliverCount
  const { frequencyData } = await UW.getSliverData(audioBuffer, 0)
  const binCount = frequencyData.length
  const h = ch / binCount

  frequencyData.forEach((binValue, binIndex) => {
    // Since frequencyData is a Uint8Array and the colour map has 256 entries,
    // we can use bin values to index directly into the colour map.
    ctx.fillStyle = colourMap[binValue]
    ctx.fillRect(index * w, ch - binIndex * h, w, -h)
  })
}

// TODO: create a hot Observable<AudioBuffer>
const createMediaStreamObservable = (mediaRecorder, mediaStream, onNext, context) => {
  const audioContext = new AudioContext()
  const source = audioContext.createMediaStreamSource(mediaStream)

  const scriptProcessor = audioContext.createScriptProcessor(SCRIPT_PROCESSOR_BUFFER_SIZE, 1, 1)
  let index = 0
  scriptProcessor.onaudioprocess = e => onNext(e.inputBuffer, index++, context)
  source.connect(scriptProcessor)
  scriptProcessor.connect(audioContext.destination)

  mediaRecorder.addEventListener('stop', () => {
    audioContext.close()
  })
}

// TODO: create a hot Observable<{timeDomainData, frequencyData}>
const createLiveAnalysisObservable = (mediaRecorder, mediaStream, sampleRate) => {
  const audioContext = new AudioContext()
  const source = audioContext.createMediaStreamSource(mediaStream)

  const analyser = new AnalyserNode(audioContext, { fftSize: C.FFT_SIZE })
  source.connect(analyser)
  const timeDomainData = new Uint8Array(analyser.frequencyBinCount)
  const frequencyData = new Uint8Array(analyser.frequencyBinCount)

  let keepVisualising = true

  const draw = () => {
    analyser.getByteTimeDomainData(timeDomainData)
    analyser.getByteFrequencyData(frequencyData)

    UC.drawTimeDomainChart('timeDomainChart', timeDomainData)
    UC.drawFFTChart('fftChart', frequencyData, sampleRate)

    if (keepVisualising) {
      requestAnimationFrame(draw)
    }
  }

  mediaRecorder.addEventListener('stop', () => {
    keepVisualising = false
  })

  requestAnimationFrame(draw)
}

const updateRecordingState = inProgress => {
  recordButton.disabled = inProgress
  controlPanel1.style.display = inProgress ? 'none' : 'block'
  controlPanel2.style.display = inProgress ? 'none' : 'block'
}

const updateSliverControlsState = () => {
  fastBackward44.disabled = currentSliver < 44
  fastBackward10.disabled = currentSliver < 10
  stepBackward.disabled = currentSliver < 1
  stepForward.disabled = currentSliver >= (maxSliver - 1)
  fastForward10.disabled = currentSliver >= (maxSliver - 10)
  fastForward44.disabled = currentSliver >= (maxSliver - 44)
}

const setCurrentSliver = adjustment => async () => {
  currentSliver += adjustment
  sliverSlider.value = currentSliver
  updateSliverControlsState()
  currentSliverLabel.innerText = `${currentSliver + 1}`
  maxSliverLabel.innerText = `${maxSliver}`
  const { timeDomainData, frequencyData } = await UW.getSliverData(audioBuffer, currentSliver)
  UC.drawTimeDomainChart('timeDomainChart', timeDomainData)
  UC.drawFFTChart('fftChart', frequencyData, audioBuffer.sampleRate)
}

const onSliverSliderChange = e => {
  currentSliver = e.target.valueAsNumber
  setCurrentSliver(0)()
}

fastBackward44.addEventListener('click', setCurrentSliver(-44))
fastBackward10.addEventListener('click', setCurrentSliver(-10))
stepBackward.addEventListener('click', setCurrentSliver(-1))
stepForward.addEventListener('click', setCurrentSliver(+1))
fastForward10.addEventListener('click', setCurrentSliver(+10))
fastForward44.addEventListener('click', setCurrentSliver(+44))
sliverSlider.addEventListener('click', onSliverSliderChange)
sliverSlider.addEventListener('input', onSliverSliderChange)

recordButton.addEventListener('click', onRecord)

const drawSpectrogram = async audioBuffer => {
  const sliverCount = Math.floor(audioBuffer.duration / C.SLIVER_DURATION)
  const sliverIndices = R.range(0, sliverCount)
  const promises = sliverIndices.map(async sliverIndex => {
    const { frequencyData } = await UW.getSliverData(audioBuffer, sliverIndex)
    return frequencyData
  })
  const data = await Promise.all(promises)
  UC.drawSpectrogram('spectrogram1', data, audioBuffer.duration, audioBuffer.sampleRate)
}
