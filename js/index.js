const SECONDS = 1

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
const frequencyValues = [1, 2, 4, 6, 8, 440, 1000, 2000]

let currentSampleRate = R.head(sampleRateValues)
let currentFftSize = R.head(fftSizeValues)
let currentFrequencies = R.take(1, frequencyValues)

const sampleRateRadioButtons = createRadioButtons(
  'sampleRates',
  'sampleRate',
  sampleRateValues)

const fftSizeRadioButtons = createRadioButtons(
  'fftSizes',
  'fftSize',
  fftSizeValues)

const frequencyCheckboxes = createCheckboxes(
  'frequencies',
  'frequency',
  frequencyValues)

const onSampleRateChange = () => {
  currentSampleRate = getCheckedRadioButton(sampleRateRadioButtons)
  drawCharts(currentSampleRate, currentFftSize, currentFrequencies)
}

const onFFtSizeChange = () => {
  currentFftSize = getCheckedRadioButton(fftSizeRadioButtons)
  drawCharts(currentSampleRate, currentFftSize, currentFrequencies)
}

const onFrequencyChange = () => {
  currentFrequencies = getCheckedCheckboxes(frequencyCheckboxes)
  drawCharts(currentSampleRate, currentFftSize, currentFrequencies)
}

setCheckedRadioButton(sampleRateRadioButtons, currentSampleRate)
setCheckedRadioButton(fftSizeRadioButtons, currentFftSize)
setCheckedCheckboxes(frequencyCheckboxes, currentFrequencies)

buttonsOnChange(sampleRateRadioButtons, onSampleRateChange)
buttonsOnChange(fftSizeRadioButtons, onFFtSizeChange)
buttonsOnChange(frequencyCheckboxes, onFrequencyChange)

const findBound = (xs, f) => xs.reduce((acc, x) => f(x, acc) ? x : acc)
const upperBound = xs => Math.ceil(findBound(xs, R.gt))
const lowerBound = xs => Math.floor(findBound(xs, R.lt))
const getIndices = xs => xs.map((_, index) => index)
const range = n => Array.from(Array(n).keys())

const makeOscillator = context => frequency => {
  const oscillator = new OscillatorNode(context, { frequency })
  oscillator.connect(context.destination)
  return oscillator
}

const startOscillator = when => oscillator => oscillator.start(when)
const stopOscillator = when => oscillator => oscillator.stop(when)

const drawCharts = async (sampleRate, fftSize, frequencies) => {
  const audioContext = new OfflineAudioContext(1, sampleRate * SECONDS, sampleRate)
  const oscillators = frequencies.map(makeOscillator(audioContext))
  const analyser = new AnalyserNode(audioContext, { fftSize })
  oscillators.forEach(oscillator => oscillator.connect(analyser))
  oscillators.forEach(startOscillator(audioContext.currentTime + 0))
  oscillators.forEach(stopOscillator(audioContext.currentTime + 1))
  const audioBuffer = await audioContext.startRendering()
  const channelData = audioBuffer.getChannelData(0)
  const timeDomainData = new Uint8Array(analyser.frequencyBinCount)
  const frequencyData = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteTimeDomainData(timeDomainData)
  analyser.getByteFrequencyData(frequencyData)
  drawChart('chart1', channelData)
  drawChart('chart2', timeDomainData)
  drawChart('chart3', frequencyData)
}

const drawChart = (elementId, data) => {
  const indices = getIndices(data)
  // const indices = range(data.length)
  // console.log(`data: ${JSON.stringify(data, null, 2)}`)
  console.log(`[drawChart] elementId: ${elementId}; indices: ${R.head(indices)} - ${R.last(indices)}; data.length: ${data.length}`)
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

drawCharts(currentSampleRate, currentFftSize, currentFrequencies)

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
