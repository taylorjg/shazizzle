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

const sampleRateValues = [4096, 8192]
const frequencyValues = [1, 2, 4, 6, 8, 440, 1000, 2000]

const sampleRateRadioButtons = createRadioButtons(
  'sampleRates',
  'sampleRate',
  sampleRateValues)

const frequencyCheckboxes = createCheckboxes(
  'frequencies',
  'frequency',
  frequencyValues)

let currentSampleRate = sampleRateValues[0]
let currentFrequencies = frequencyValues.slice(0, 1)

const onSampleRateChange = () => {
  currentSampleRate = getCheckedRadioButton(sampleRateRadioButtons)
  drawCharts(currentSampleRate, currentFrequencies)
}

const onFrequencyChange = () => {
  currentFrequencies = getCheckedCheckboxes(frequencyCheckboxes)
  drawCharts(currentSampleRate, currentFrequencies)
}

sampleRate4096.addEventListener('change', onSampleRateChange)
sampleRate8192.addEventListener('change', onSampleRateChange)

frequencyCheckboxes.forEach(checkbox =>
  checkbox.addEventListener('change', onFrequencyChange))

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

setCheckedRadioButton(sampleRateRadioButtons, currentSampleRate)
setCheckedCheckboxes(frequencyCheckboxes, currentFrequencies)

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
