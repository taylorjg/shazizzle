const UC = {};

(function (exports) {

  const findBound = (xs, f) => xs.reduce((acc, x) => f(x, acc) ? x : acc)
  const upperBound = xs => Math.ceil(findBound(xs, R.gt))
  const lowerBound = xs => Math.floor(findBound(xs, R.lt))

  const formatFrequency = f => f >= Number.isInteger(f) ? f : f.toFixed(1)
  const formatFrequencyTick = f => `${formatFrequency(f)} ${f >= 1000 ? 'k' : ''}`
  const formatFrequencyTickWithHz = f => `${formatFrequencyTick(f)}Hz`

  const categoryTickCallbackFrequency = (sampleRate, binCount) => bin =>
    bin % 16 === 0
      ? formatFrequencyTickWithHz(bin / binCount * sampleRate / 2)
      : null

  const drawTimeDomainChart = (canvasId, data) => {
    const xAxis = {
      type: 'category',
      labels: R.range(0, data.length + 1),
      ticks: {
        fontSize: 8,
        autoSkip: false,
        callback: x => x % 16 === 0 ? x : null
      }
    }
    const yAxis = {
      type: 'linear',
      ticks: {
        fontSize: 8,
        min: 0,
        max: 255,
        stepSize: 32
      }
    }
    drawChartInternal(canvasId, data, xAxis, yAxis)
  }

  const drawFFTChart = (canvasId, data, sampleRate) => {
    const binCount = data.length
    const xAxis = {
      type: 'category',
      labels: R.range(0, binCount + 1),
      ticks: {
        fontSize: 8,
        autoSkip: false,
        callback: categoryTickCallbackFrequency(sampleRate, binCount)
      }
    }
    const yAxis = {
      type: 'linear',
      ticks: {
        fontSize: 8,
        min: 0,
        max: 255,
        stepSize: 32
      }
    }
    drawChartInternal(canvasId, data, xAxis, yAxis)
  }

  const drawChart = (canvasId, data) => {
    const yAxis = {
      type: 'linear',
      ticks: {
        min: lowerBound(data),
        max: upperBound(data)
      }
    }
    drawChartInternal(canvasId, data, null, yAxis)
  }

  const drawChartInternal = (canvasId, data, xAxis, yAxis) => {
    const config = {
      type: 'line',
      data: {
        labels: R.range(0, data.length),
        datasets: [{
          data,
          borderColor: 'orange',
          borderWidth: 0.5,
          pointStyle: 'line',
          radius: 1,
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
          xAxes: xAxis ? [xAxis] : [],
          yAxes: yAxis ? [yAxis] : []
        }
      }
    }

    const canvas = document.getElementById(canvasId)
    new Chart(canvas, config)
  }

  const drawSpectrogram = async (canvasId, audioBuffer) => {

    const sliverCount = Math.floor(audioBuffer.duration / C.SLIVER_DURATION)
    const sliverIndices = R.range(0, sliverCount)
    const promises = sliverIndices.map(async sliverIndex => {
      const { frequencyData } = await UW.getSliverData(audioBuffer, sliverIndex)
      return frequencyData
    })
    const data = await Promise.all(promises)

    const xAxis = {
      type: 'category',
      scaleLabel: {
        display: true,
        labelString: 'Time (s)'
      },
      labels: R.range(0, audioBuffer.duration * 2),
      ticks: {
        fontSize: 8,
        autoSkip: false,
        callback: (_, index) => `${index / 2}`
      }
    }

    const yAxis = {
      type: 'category',
      scaleLabel: {
        display: true,
        labelString: 'Frequency (kHz)'
      },
      labels: R.reverse(R.range(0, 1 + audioBuffer.sampleRate / 2 / 1000)),
      ticks: {
        fontSize: 8,
        autoSkip: false,
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
          xAxes: [xAxis],
          yAxes: [yAxis]
        }
      }
    }

    const canvas = document.getElementById(canvasId)
    new Chart(canvas, config)
  }

  exports.drawChart = drawChart
  exports.drawTimeDomainChart = drawTimeDomainChart
  exports.drawFFTChart = drawFFTChart
  exports.drawSpectrogram = drawSpectrogram
})(UC)
