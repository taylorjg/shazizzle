const SECONDS = 2

const createCheckboxes = (parentId, name, values) => {
  const parent = document.getElementById(parentId)
  return values.map(value => {
    const label = document.createElement('label')
    label.setAttribute('class', 'checkbox-inline')
    const input = document.createElement('input')
    input.setAttribute('type', 'checkbox')
    input.setAttribute('id', `${name}${value}`)
    input.setAttribute('value', value)
    const text = document.createTextNode(value)
    label.appendChild(input)
    label.appendChild(text)
    parent.appendChild(label)
    return input
  })
}

const createRadioButtons = (parentId, name, values) => {
  const parent = document.getElementById(parentId)
  return values.map(value => {
    const label = document.createElement('label')
    label.setAttribute('class', 'radio-inline')
    const input = document.createElement('input')
    input.setAttribute('type', 'radio')
    input.setAttribute('name', name)
    input.setAttribute('id', `${name}${value}`)
    input.setAttribute('value', value)
    const text = document.createTextNode(value)
    label.appendChild(input)
    label.appendChild(text)
    parent.appendChild(label)
    return input
  })
}

const setCheckedRadioButton = (buttons, value) =>
  buttons.forEach(button =>
    button.checked = value === Number(button.value))

const getCheckedRadioButton = buttons =>
  buttons
    .map(button => button.checked ? Number(button.value) : undefined)
    .filter(R.identity)[0]

const setCheckedCheckboxes = (buttons, values) =>
  buttons.forEach(button =>
    button.checked = values.includes(Number(button.value)))

const getCheckedCheckboxes = buttons =>
  buttons
    .map(button => button.checked ? Number(button.value) : undefined)
    .filter(R.identity)

const buttonsOnChange = (buttons, fn) =>
  buttons.forEach(button => button.addEventListener('change', fn))

const sampleRateValues = [4096, 8192, 16384, 32768]
const fftSizeValues = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768]
const gainValues = [0.125, 0.25, 0.5, 0.75, 1.0]
const frequencyValues = [1, 2, 4, 6, 8, 440, 1000, 2000]

let currentSampleRate = 4096
let currentFftSize = 1024
let currentGain = 0.5
let currentFrequencies = [440, 1000, 2000]

const sampleRateRadioButtons = createRadioButtons(
  'sampleRates',
  'sampleRate',
  sampleRateValues)

const fftSizeRadioButtons = createRadioButtons(
  'fftSizes',
  'fftSize',
  fftSizeValues)

const gainRadioButtons = createRadioButtons(
  'gains',
  'gain',
  gainValues)

const frequencyCheckboxes = createCheckboxes(
  'frequencies',
  'frequency',
  frequencyValues)

const onSampleRateChange = () => {
  currentSampleRate = getCheckedRadioButton(sampleRateRadioButtons)
  drawCharts(currentSampleRate, currentFftSize, currentGain, currentFrequencies)
}

const onFFtSizeChange = () => {
  currentFftSize = getCheckedRadioButton(fftSizeRadioButtons)
  drawCharts(currentSampleRate, currentFftSize, currentGain, currentFrequencies)
}

const onGainChange = () => {
  currentGain = getCheckedRadioButton(gainRadioButtons)
  drawCharts(currentSampleRate, currentFftSize, currentGain, currentFrequencies)
}

const onFrequencyChange = () => {
  currentFrequencies = getCheckedCheckboxes(frequencyCheckboxes)
  drawCharts(currentSampleRate, currentFftSize, currentGain, currentFrequencies)
}

setCheckedRadioButton(sampleRateRadioButtons, currentSampleRate)
setCheckedRadioButton(fftSizeRadioButtons, currentFftSize)
setCheckedRadioButton(gainRadioButtons, currentGain)
setCheckedCheckboxes(frequencyCheckboxes, currentFrequencies)

buttonsOnChange(sampleRateRadioButtons, onSampleRateChange)
buttonsOnChange(fftSizeRadioButtons, onFFtSizeChange)
buttonsOnChange(gainRadioButtons, onGainChange)
buttonsOnChange(frequencyCheckboxes, onFrequencyChange)

const findBound = (xs, f) => xs.reduce((acc, x) => f(x, acc) ? x : acc)
const upperBound = xs => Math.ceil(findBound(xs, R.gt))
const lowerBound = xs => Math.floor(findBound(xs, R.lt))
const getIndices = xs => xs.map((_, index) => index)
const range = n => Array.from(Array(n).keys())

const makeOscillatorNode = (audioContext, gainNode) => frequency => {
  const oscillatorNode = new OscillatorNode(audioContext, { frequency })
  oscillatorNode.connect(gainNode)
  return oscillatorNode
}

const startOscillator = when => oscillator => oscillator.start(when)
const stopOscillator = when => oscillator => oscillator.stop(when)

const drawCharts = async (sampleRate, fftSize, gain, frequencies) => {
  const audioContext = new OfflineAudioContext(1, sampleRate * SECONDS, sampleRate)
  const gainNode = new GainNode(audioContext, { gain })
  const oscillators = frequencies.map(makeOscillatorNode(audioContext, gainNode))
  gainNode.connect(audioContext.destination)
  const analyserNode = new AnalyserNode(audioContext, { fftSize })
  gainNode.connect(analyserNode)
  oscillators.forEach(startOscillator(audioContext.currentTime + 1))
  oscillators.forEach(stopOscillator(audioContext.currentTime + 2))
  const audioBuffer = await audioContext.startRendering()
  const channelData = audioBuffer.getChannelData(0)
  const timeDomainData = new Uint8Array(analyserNode.frequencyBinCount)
  const frequencyData = new Uint8Array(analyserNode.frequencyBinCount)
  analyserNode.getByteTimeDomainData(timeDomainData)
  analyserNode.getByteFrequencyData(frequencyData)
  drawChart('chart1', channelData)
  drawChart('chart2', timeDomainData)
  drawChart('chart3', frequencyData)
}

const drawChart = (elementId, data) => {
  // const indices = getIndices(data)
  const indices = range(data.length)
  // console.log(`data: ${JSON.stringify(data, null, 2)}`)
  // console.log(`[drawChart] elementId: ${elementId}; indices: ${R.head(indices)} - ${R.last(indices)}; data.length: ${data.length}`)
  const config = {
    type: 'line',
    data: {
      labels: indices,
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
      events: [],
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

drawCharts(currentSampleRate, currentFftSize, currentGain, currentFrequencies)

// document.getElementById('go').addEventListener('click', () => {
//   drawCharts(currentSampleRate, currentFftSize, currentFrequencies)
// })

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
