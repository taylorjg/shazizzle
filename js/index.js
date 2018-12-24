const SECONDS = 1

let currentSampleRate = 4096
let currentFrequencies = [2, 8]

const sampleRate4096 = document.getElementById('sampleRate4096')
const sampleRate8192 = document.getElementById('sampleRate8192')

const sampleRateRadioButtons = [
  sampleRate4096,
  sampleRate8192
]

const frequency2 = document.getElementById('frequency2')
const frequency4 = document.getElementById('frequency4')
const frequency6 = document.getElementById('frequency6')
const frequency8 = document.getElementById('frequency8')
const frequency440 = document.getElementById('frequency440')
const frequency1000 = document.getElementById('frequency1000')

const frequencyCheckboxes = [
  frequency2,
  frequency4,
  frequency6,
  frequency8,
  frequency440,
  frequency1000
]

const onSampleRateChange = e => {
  currentSampleRate = Number(e.target.value)
  drawCharts(currentSampleRate, currentFrequencies)
}

const onFrequencyChange = () => {
  currentFrequencies = getFrequencyCheckboxes()
  drawCharts(currentSampleRate, currentFrequencies)
}

sampleRate4096.addEventListener('change', onSampleRateChange)
sampleRate8192.addEventListener('change', onSampleRateChange)

frequencyCheckboxes.forEach(checkbox =>
  checkbox.addEventListener('change', onFrequencyChange))

const setSampleRateRadioButtons = sampleRate =>
  sampleRateRadioButtons.forEach(radioButton =>
    radioButton.checked = sampleRate === Number(radioButton.value))

const setFrequencyCheckboxes = frequencies =>
  frequencyCheckboxes.forEach(checkbox =>
    checkbox.checked = frequencies.includes(Number(checkbox.value)))

const getFrequencyCheckboxes = () =>
  frequencyCheckboxes
    .map(checkbox => checkbox.checked ? Number(checkbox.value) : undefined)
    .filter(R.identity)

setSampleRateRadioButtons(currentSampleRate)
setFrequencyCheckboxes(currentFrequencies)

const findBound = (xs, f) => xs.reduce((acc, x) => f(x, acc) ? x : acc)
const upperBound = xs => Math.ceil(findBound(xs, R.gt))
const lowerBound = xs => Math.floor(findBound(xs, R.lt))
const indices = xs => xs.map((_, index) => index)

const makeOscillator = context => frequency => {
  const oscillator = new OscillatorNode(context, { frequency })
  oscillator.connect(context.destination)
  return oscillator
}

const startOscillator = when => oscillator => oscillator.start(when)
const stopOscillator = when => oscillator => oscillator.stop(when)

const drawCharts = async (sampleRate, frequencies) => {
  const audioContext = new OfflineAudioContext(1, sampleRate * SECONDS, sampleRate)
  const oscillators = frequencies.map(makeOscillator(audioContext))
  const analyser = new AnalyserNode(audioContext, { fftSize: sampleRate })
  oscillators.forEach(oscillator => oscillator.connect(analyser))
  oscillators.forEach(startOscillator(audioContext.currentTime + 0))
  oscillators.forEach(stopOscillator(audioContext.currentTime + 1))
  const audioBuffer = await audioContext.startRendering()
  const channelData = audioBuffer.getChannelData(0)
  const frequencyData = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteFrequencyData(frequencyData)
  drawChart('chart1', channelData)
  drawChart('chart2', frequencyData)
}

const drawChart = (elementId, data) => {
  const config = {
    type: 'line',
    data: {
      labels: indices(data),
      datasets: [{
        borderColor: 'orange',
        borderWidth: 0.5,
        pointStyle: 'line',
        radius: 1,
        data,
        fill: false,
      }]
    },
    options: {
      animation: {
        duration: 0
      },
      legend: {
        display: false
      },
      scales: {
        yAxes: [{
          ticks: {
            min: lowerBound(data),
            max: upperBound(data)
          }
        }]
      }
    }
  }

  const chart = document.getElementById(elementId)
  new Chart(chart, config)
}

drawCharts(currentSampleRate, currentFrequencies)

const recordSample = async duration => {
  const SAMPLE_RATE = 4096
  const constraints = {
    audio: {
      sampleRate: {
        exact: SAMPLE_RATE
      }
    }
  }
  const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
  const mediaRecorder = new MediaRecorder(mediaStream, { audioBitsPerSecond: SAMPLE_RATE })
  const chunks = []
  mediaRecorder.ondataavailable = e => {
    console.error(`[mediaRecorder.ondataavailable] e.data.length: ${e.data.length}`)
    chunks.push(e.data)
  }
  mediaRecorder.onerror = e => {
    console.error(`[mediaRecorder.onerror] ${e}`)
  }
  mediaRecorder.start()
  await new Promise(resolve => setTimeout(resolve, duration))
  mediaRecorder.stop()
}
