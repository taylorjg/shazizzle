let currentDuration = 5
let currentSliver = 0
let maxSliver = 0
let mediaTrackSettings = null
let audioBuffer = null

const durationValues = [1, 2, 5, 10, 15]

const durationRadioButtons = U.createRadioButtons(
  'durations',
  'duration',
  durationValues)

const onDurationChange = () => {
  currentDuration = U.getCheckedRadioButton(durationRadioButtons)
}

U.setCheckedRadioButton(durationRadioButtons, currentDuration)
U.buttonsOnChange(durationRadioButtons, onDurationChange)

const recordButton = document.getElementById('record')
const controlPanel = document.getElementById('controlPanel')
const fastBackward44 = document.getElementById('fastBackward44')
const fastBackward10 = document.getElementById('fastBackward10')
const stepBackward = document.getElementById('stepBackward')
const stepForward = document.getElementById('stepForward')
const fastForward10 = document.getElementById('fastForward10')
const fastForward44 = document.getElementById('fastForward44')
const currentSliverLabel = document.getElementById('currentSliverLabel')
const maxSliverLabel = document.getElementById('maxSliverLabel')

const onRecord = async () => {

  initialiseWaterfallPlot('waterfallPlot1')
  initialiseWaterfallPlot('waterfallPlot2')

  recordButton.disabled = true
  controlPanel.style.display = 'none'

  const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })

  const track = R.head(mediaStream.getTracks())
  mediaTrackSettings = track.getSettings()
  console.log(`mediaTrackSettings: ${JSON.stringify(mediaTrackSettings, null, 2)}`)

  const chunks = []
  const mediaRecorder = new MediaRecorder(mediaStream)

  mediaRecorder.ondataavailable = e => chunks.push(e.data)

  mediaRecorder.onstart = () => {
    createLiveAnalysisObservable(mediaRecorder, mediaStream)
    createMediaStreamObservable(mediaRecorder, mediaStream, onNext)
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
      maxSliver = Math.ceil(audioBuffer.duration / U.SLIVER_DURATION)
      setCurrentSliver(0)()
      recordButton.disabled = false
      controlPanel.style.display = 'block'
      drawWaterfallPlot('waterfallPlot1', audioBuffer, maxSliver)
    } finally {
      URL.revokeObjectURL(url)
      mediaStream && mediaStream.getTracks().forEach(track => track.stop())
    }
  }

  mediaRecorder.start()
  await U.delay(currentDuration * 1000)
  mediaRecorder.stop()
}

const onNext = (audioBuffer, index) => {
  drawIncrementalWaterfallPlot('waterfallPlot2', audioBuffer, index)
}

const initialiseWaterfallPlot = chartId => {
  const chart = document.getElementById(chartId)
  const cw = chart.clientWidth
  const ch = chart.clientHeight
  chart.width = cw
  chart.height = ch
}

const drawIncrementalWaterfallPlot = async (chartId, audioBuffer, index) => {
  const chart = document.getElementById(chartId)
  const ctx = chart.getContext('2d')
  const cw = chart.clientWidth
  const ch = chart.clientHeight

  const sliverCount = currentDuration / U.SLIVER_DURATION
  const w = cw / sliverCount
  const { frequencyData } = await U.getSliverData(audioBuffer, 0)
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
const createMediaStreamObservable = (mediaRecorder, mediaStream, onNext) => {
  const audioContext = new AudioContext()
  const source = audioContext.createMediaStreamSource(mediaStream)

  const scriptProcessor = audioContext.createScriptProcessor(1024, 1, 1)
  let index = 0
  scriptProcessor.onaudioprocess = e => onNext(e.inputBuffer, index++)
  source.connect(scriptProcessor)
  scriptProcessor.connect(audioContext.destination)

  mediaRecorder.addEventListener('stop', () => {
    audioContext.close()
  })
}

// TODO: create a hot Observable<{timeDomainData, frequencyData}>
const createLiveAnalysisObservable = (mediaRecorder, mediaStream) => {
  const audioContext = new AudioContext()
  const source = audioContext.createMediaStreamSource(mediaStream)

  const analyser = new AnalyserNode(audioContext, { fftSize: U.FFT_SIZE })
  source.connect(analyser)
  const timeDomainData = new Uint8Array(analyser.frequencyBinCount)
  const frequencyData = new Uint8Array(analyser.frequencyBinCount)

  let keepVisualising = true

  const draw = () => {
    analyser.getByteTimeDomainData(timeDomainData)
    analyser.getByteFrequencyData(frequencyData)

    const yBounds = { min: 0, max: 255, stepSize: 32 }
    U.drawChart('timeDomainChart', timeDomainData, yBounds)
    U.drawChart('fftChart', frequencyData, yBounds)

    if (keepVisualising) {
      requestAnimationFrame(draw)
    }
  }

  mediaRecorder.addEventListener('stop', () => {
    keepVisualising = false
  })

  requestAnimationFrame(draw)
}

const updateControls = () => {
  fastBackward44.disabled = currentSliver < 44
  fastBackward10.disabled = currentSliver < 10
  stepBackward.disabled = currentSliver < 1
  stepForward.disabled = currentSliver >= (maxSliver - 1)
  fastForward10.disabled = currentSliver >= (maxSliver - 10)
  fastForward44.disabled = currentSliver >= (maxSliver - 44)
}

const setCurrentSliver = adjustment => () => {
  currentSliver += adjustment
  updateControls()
  currentSliverLabel.innerText = `${currentSliver + 1}`
  maxSliverLabel.innerText = `${maxSliver}`
  U.visualiseSliver(audioBuffer, currentSliver, 'timeDomainChart', 'fftChart')
}

fastBackward44.addEventListener('click', setCurrentSliver(-44))
fastBackward10.addEventListener('click', setCurrentSliver(-10))
stepBackward.addEventListener('click', setCurrentSliver(-1))
stepForward.addEventListener('click', setCurrentSliver(+1))
fastForward10.addEventListener('click', setCurrentSliver(+10))
fastForward44.addEventListener('click', setCurrentSliver(+44))

recordButton.addEventListener('click', onRecord)

const toRgb = ([r, g, b]) => `rgb(${r * 255}, ${g * 255}, ${b * 255})`

const colourMap = CM.getColourMap('CMRmap').map(toRgb)

const drawWaterfallPlot = (chartId, audioBuffer, sliverCount) => {
  const chart = document.getElementById(chartId)
  const ctx = chart.getContext('2d')
  const cw = chart.clientWidth
  const ch = chart.clientHeight

  const w = cw / sliverCount
  const sliverIndices = R.range(0, sliverCount)
  sliverIndices.forEach(async sliverIndex => {
    const { frequencyData } = await U.getSliverData(audioBuffer, sliverIndex)
    const binCount = frequencyData.length
    const h = ch / binCount
    frequencyData.forEach((binValue, binIndex) => {
      // Since frequencyData is a Uint8Array and the colour map has 256 entries,
      // we can use bin values to index directly into the colour map.
      ctx.fillStyle = colourMap[binValue]
      ctx.fillRect(sliverIndex * w, ch - binIndex * h, w, -h)
    })
  })
}
