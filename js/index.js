const SAMPLE_RATE = 4096
const SECONDS = 1

const findBound = (xs, f) => xs.reduce((acc, x) => f(x, acc) ? x : acc)
const upperBound = xs => Math.ceil(findBound(xs, R.gt))
const lowerBound = xs => Math.floor(findBound(xs, R.lt))

const makeOscillator = (context, hz) => {
  const oscillator = new OscillatorNode(context, { frequency: hz })
  oscillator.connect(context.destination)
  return oscillator
}

const startOscillator = when => oscillator => oscillator.start(when)
const stopOscillator = when => oscillator => oscillator.stop(when)

const main = async () => {

  const audioContext = new OfflineAudioContext(1, SAMPLE_RATE * SECONDS, SAMPLE_RATE)

  const oscillators = [
    makeOscillator(audioContext, 2),
    makeOscillator(audioContext, 4),
    makeOscillator(audioContext, 6),
    makeOscillator(audioContext, 8)
    // makeOscillator(audioContext, 200),
    // makeOscillator(audioContext, 440),
    // makeOscillator(audioContext, 1000)
  ]

  const analyser = new AnalyserNode(audioContext, { fftSize: SAMPLE_RATE })
  oscillators.forEach(oscillator => oscillator.connect(analyser))

  oscillators.forEach(startOscillator(0))
  oscillators.forEach(stopOscillator(1))

  const audioBuffer = await audioContext.startRendering()
  const data = audioBuffer.getChannelData(0)

  const frequencyData = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteFrequencyData(frequencyData)

  const chart1Config = {
    type: 'line',
    data: {
      labels: data.map((_, index) => index),
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
      responsive: false,
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
      },
      tooltips: {
        enabled: false
      }
    }
  }

  const chart1 = document.getElementById('chart1')
  new Chart(chart1, chart1Config)

  const chart2Config = {
    type: 'line',
    data: {
      labels: frequencyData.map((_, index) => index),
      datasets: [{
        borderColor: 'orange',
        borderWidth: 0.5,
        pointStyle: 'line',
        radius: 1,
        data: frequencyData,
        fill: false,
      }]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      animation: {
        duration: 0
      },
      legend: {
        display: false
      },
      scales: {
        yAxes: [{
          ticks: {
            min: lowerBound(frequencyData),
            max: upperBound(frequencyData)
          }
        }]
      },
      tooltips: {
        enabled: false
      }
    }
  }

  const chart2 = document.getElementById('chart2')
  new Chart(chart2, chart2Config)
}

main()
