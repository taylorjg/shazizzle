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
const sliverSlider = document.getElementById('sliverSlider')

const onRecord = async () => {

  updateRecordingState(true)

  const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })

  const track = R.head(mediaStream.getTracks())
  mediaTrackSettings = track.getSettings()
  console.log(`mediaTrackSettings: ${JSON.stringify(mediaTrackSettings, null, 2)}`)

  const chunks = []
  const mediaRecorder = new MediaRecorder(mediaStream)

  mediaRecorder.ondataavailable = e => chunks.push(e.data)

  mediaRecorder.onstart = () => {
    const liveVisualisationObservable = U.createLiveVisualisationObservable(mediaRecorder, mediaStream)
    liveVisualisationObservable.subscribe(liveChartingObserver)
    // liveVisualisationObservable.subscribe(throbbingCircleObserver)
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
      sliverSlider.min = 0
      sliverSlider.max = maxSliver - 1
      setCurrentSliver(0)()
      updateRecordingState(false)
      drawSpectrogram('spectrogram', audioBuffer)
    } finally {
      URL.revokeObjectURL(url)
      mediaStream && mediaStream.getTracks().forEach(track => track.stop())
    }
  }

  mediaRecorder.start()
  await U.delay(currentDuration * 1000)
  mediaRecorder.stop()
}

const liveChartingObserver = {
  next: value => {
    U.drawTimeDomainChart('timeDomainChart', value.timeDomainData)
    U.drawFFTChart('fftChart', value.frequencyData, value.sampleRate)
  }
}

// const throbbingCircleObserver = {
//   next: value => {
//   }
// }

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

const setCurrentSliver = adjustment => () => {
  currentSliver += adjustment
  sliverSlider.value = currentSliver
  updateSliverControlsState()
  currentSliverLabel.innerText = `${currentSliver + 1}`
  maxSliverLabel.innerText = `${maxSliver}`
  U.visualiseSliver(audioBuffer, currentSliver, 'timeDomainChart', 'fftChart')
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

const drawSpectrogram = async (canvasId, audioBuffer) => {

  const sliverCount = Math.floor(audioBuffer.duration / U.SLIVER_DURATION)
  const sliverIndices = R.range(0, sliverCount)
  const promises = sliverIndices.map(async sliverIndex => {
    const { frequencyData } = await U.getSliverData(audioBuffer, sliverIndex)
    return frequencyData
  })
  const data = await Promise.all(promises)

  const binCount = data[0].length
  const labels = R.reverse(R.range(0, binCount + 1))
  const yAxis = {
    type: 'category',
    labels,
    ticks: {
      autoSkip: false,
      callback: U.categoryTickCallbackFrequency(audioBuffer.sampleRate, binCount)
    }
  }

  const config = {
    type: 'spectrogram',
    data: {
      labels: sliverIndices,
      datasets: [{ data }]
    },
    options: {
      events: [],
      animation: {
        duration: 0
      },
      legend: {
        display: false
      },
      scales: {
        yAxes: [yAxis]
      }
    }
  }

  const canvas = document.getElementById(canvasId)
  new Chart(canvas, config)
}
