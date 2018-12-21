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
    makeOscillator(audioContext, 20),
    makeOscillator(audioContext, 200),
    makeOscillator(audioContext, 440),
    makeOscillator(audioContext, 1000)
  ]

  const analyser = new AnalyserNode(audioContext, { fftSize: SAMPLE_RATE })
  oscillators.forEach(oscillator => oscillator.connect(analyser))

  oscillators.forEach(startOscillator(0))
  oscillators.forEach(stopOscillator(1))

  const audioBuffer = await audioContext.startRendering()
  const data = audioBuffer.getChannelData(0)

  const frequencyData = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteFrequencyData(frequencyData)

  const config1 = {
    type: 'line',
    data: {
      labels: data.map((_, index) => index),
      datasets: [{
        borderColor: 'orange',
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

  const chartContext1 = document.getElementById('canvas1').getContext('2d')
  new Chart(chartContext1, config1)

  const config2 = {
    type: 'line',
    data: {
      labels: frequencyData.map((_, index) => index),
      datasets: [{
        borderColor: 'orange',
        data: frequencyData,
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
            min: lowerBound(frequencyData),
            max: upperBound(frequencyData)
          }
        }]
      }
    }
  }

  const chartContext2 = document.getElementById('canvas2').getContext('2d')
  new Chart(chartContext2, config2)
}

main()
