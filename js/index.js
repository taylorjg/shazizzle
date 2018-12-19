const SAMPLE_RATE = 44100
const SECONDS = 1

// const response = await axios.get('440Hz_44100Hz_16bit_05sec.mp3')

const findBound = (xs, f) => xs.reduce((acc, x) => f(x, acc) ? x : acc, 0)

const main = async () => {
  const audioContext = new OfflineAudioContext(1, SAMPLE_RATE * SECONDS, SAMPLE_RATE)

  const makeOscillator = (ctx, hz) => {
    const oscillator = new OscillatorNode(ctx, { frequency: hz })
    oscillator.connect(ctx.destination)
    return oscillator
  }

  const oscillators = [
    makeOscillator(audioContext, 2),
    makeOscillator(audioContext, 4),
    makeOscillator(audioContext, 6),
    makeOscillator(audioContext, 8)
  ]

  const startOscillator = when => oscillator => oscillator.start(when)
  const stopOscillator = when => oscillator => oscillator.stop(when)

  oscillators.forEach(startOscillator(0.25))
  oscillators.forEach(stopOscillator(0.75))

  const audioBuffer = await audioContext.startRendering()
  const data = audioBuffer.getChannelData(0)
  console.dir(data)

  const config = {
    type: 'line',
    data: {
      labels: data.map((_, index) => index),
      datasets: [{
        borderColor: 'orange',
        bordeWidth: 0.25,
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
            min: findBound(data, R.lt),
            max: findBound(data, R.gt)
          }
        }]
      }
    }
  }

  const chartContext = document.getElementById('canvas').getContext('2d')
  new Chart(chartContext, config)
}

main()
