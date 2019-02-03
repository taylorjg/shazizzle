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

let currentSliver = 0
let maxSliver = 0
let audioBuffer = null

const onRecord = async () => {
  recordButton.disabled = true
  controlPanel.style.display = 'none'
  const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mediaRecorder = new MediaRecorder(mediaStream)
  const chunks = []
  mediaRecorder.ondataavailable = e => chunks.push(e.data)
  mediaRecorder.onstop = async () => {
    const blob = new Blob(chunks)
    const url = URL.createObjectURL(blob)
    try {
      const config = { responseType: 'arraybuffer' }
      const response = await axios.get(url, config)
      const data = response.data
      const audioContext = new OfflineAudioContext({ length: 44100, sampleRate: 44100 })
      audioBuffer = await audioContext.decodeAudioData(data)
      currentSliver = 0
      maxSliver = Math.ceil(audioBuffer.duration / U.SLIVER_SIZE)
      changeSliver(0)()
      recordButton.disabled = false
      mediaStream.getTracks().forEach(track => track.stop())
      controlPanel.style.display = 'block'
      drawWaterfallPlot('waterfallPlot', audioBuffer, maxSliver)
    } finally {
      URL.revokeObjectURL(url)
    }
  }
  startLiveVisualisation(mediaRecorder, mediaStream)
  mediaRecorder.start()
  await U.delay(2000)
  mediaRecorder.stop()
}

const startLiveVisualisation = (mediaRecorder, mediaStream) => {
  const audioContext = new AudioContext()
  const source = audioContext.createMediaStreamSource(mediaStream)
  const analyser = new AnalyserNode(audioContext, { fftSize: 1024 })
  source.connect(analyser)
  const timeDomainData = new Uint8Array(analyser.frequencyBinCount)
  const frequencyData = new Uint8Array(analyser.frequencyBinCount)
  const draw = () => {
    analyser.getByteTimeDomainData(timeDomainData)
    analyser.getByteFrequencyData(frequencyData)
    U.drawChart('timeDomainChart', timeDomainData)
    U.drawChart('fftChart', frequencyData)
    if (mediaRecorder.state === 'recording') {
      requestAnimationFrame(draw)
    }
  }
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

const changeSliver = adjustment => () => {
  currentSliver += adjustment
  updateControls()
  currentSliverLabel.innerText = `${currentSliver + 1}`
  maxSliverLabel.innerText = `${maxSliver}`
  U.visualiseSliver(audioBuffer, currentSliver, 'chart1', 'chart2')
}

fastBackward44.addEventListener('click', changeSliver(-44))
fastBackward10.addEventListener('click', changeSliver(-10))
stepBackward.addEventListener('click', changeSliver(-1))
stepForward.addEventListener('click', changeSliver(+1))
fastForward10.addEventListener('click', changeSliver(+10))
fastForward44.addEventListener('click', changeSliver(+44))

recordButton.addEventListener('click', onRecord)

const toRgb = ([r, g, b]) => `rgb(${r * 255}, ${g * 255}, ${b * 255})`

const colourMap = CM.getColourMap('CMRmap').map(toRgb)

const drawWaterfallPlot = (chartId, audioBuffer, sliverCount) => {
  const chart = document.getElementById(chartId)
  const ctx = chart.getContext('2d')
  const cw = chart.clientWidth
  const ch = chart.clientHeight
  chart.width = cw
  chart.height = ch
  const binCount = 512
  const w = cw / sliverCount
  const h = ch / binCount
  const sliverIndices = R.range(0, sliverCount)
  sliverIndices.forEach(async sliverIndex => {
    const { frequencyData } = await U.getSliverData(audioBuffer, sliverIndex)
    frequencyData.forEach((binValue, binIndex) => {
      // Since frequencyData is a Uint8Array and the colour map has 256 entries,
      // we can use bin values to index directly into the colour map.
      ctx.fillStyle = colourMap[binValue]
      ctx.fillRect(sliverIndex * w, ch - binIndex * h, w, -h)
    })
  })
}
