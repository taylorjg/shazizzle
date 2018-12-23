const SECONDS = 1

let currentSampleRate = 4096
let currentFrequencies = [2, 8]

// const sampleRate3000 = document.getElementById('sampleRate3000')
// const sampleRate4096 = document.getElementById('sampleRate4096')

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

// const onSampleRateChange = e => {
//   currentSampleRate = Number(e.target.value)
//   drawCharts(currentSampleRate, currentFrequencies)
// }

const onFrequencyCheckboxChange = e => {
  currentFrequencies = getFrequencyCheckboxes()
  drawCharts(currentSampleRate, currentFrequencies)
}

// sampleRate3000.addEventListener('change', onSampleRateChange)
// sampleRate4096.addEventListener('change', onSampleRateChange)

frequencyCheckboxes.forEach(checkbox =>
  checkbox.addEventListener('change', onFrequencyCheckboxChange))

// const setSampleRateCheckboxes = sampleRate => {
//   sampleRate3000.checked = sampleRate === Number(sampleRate3000.value)
//   sampleRate4096.checked = sampleRate === Number(sampleRate4096.value)
// }

const setFrequencyCheckboxes = frequencies =>
  frequencyCheckboxes.forEach(checkbox =>
    checkbox.checked = frequencies.includes(Number(checkbox.value)))

const getFrequencyCheckboxes = () =>
  frequencyCheckboxes
    .map(checkbox => checkbox.checked ? Number(checkbox.value) : undefined)
    .filter(R.identity)

// setSampleRateCheckboxes(currentSampleRate)
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
