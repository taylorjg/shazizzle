const U = {};

(function (exports) {

  const SLIVER_DURATION = 1 / 44
  const SAMPLE_RATE = 44100
  const FFT_SIZE = 1024

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

    const sliverCount = Math.floor(audioBuffer.duration / U.SLIVER_DURATION)
    const sliverIndices = R.range(0, sliverCount)
    const promises = sliverIndices.map(async sliverIndex => {
      const { frequencyData } = await U.getSliverData(audioBuffer, sliverIndex)
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

  const copySliver = (srcBuffer, dstBuffer, sliverIndex) => {
    const srcDataStartIndex = Math.floor(srcBuffer.sampleRate * sliverIndex * SLIVER_DURATION)
    const srcDataEndIndex = Math.floor(srcBuffer.sampleRate * (sliverIndex + 1) * SLIVER_DURATION)
    const srcDataRange = R.range(srcDataStartIndex, srcDataEndIndex)
    const channelRange = R.range(0, srcBuffer.numberOfChannels)
    channelRange.forEach(channelIndex => {
      const srcChannelData = srcBuffer.getChannelData(channelIndex)
      const dstChannelData = dstBuffer.getChannelData(channelIndex)
      srcDataRange.forEach(srcDataIndex => {
        const dstDataIndex = srcDataIndex - srcDataStartIndex
        dstChannelData[dstDataIndex] = srcChannelData[srcDataIndex]
      })
    })
  }

  const getSliverData = async (inputBuffer, sliverIndex) => {
    const options = {
      numberOfChannels: inputBuffer.numberOfChannels,
      length: Math.ceil(inputBuffer.numberOfChannels * inputBuffer.sampleRate * SLIVER_DURATION),
      sampleRate: inputBuffer.sampleRate
    }
    const sliverBuffer = new AudioBuffer(options)
    copySliver(inputBuffer, sliverBuffer, sliverIndex)
    const audioContext = new OfflineAudioContext(options)
    const sourceNode = new AudioBufferSourceNode(audioContext, { buffer: sliverBuffer })
    const analyserNode = new AnalyserNode(audioContext, { fftSize: FFT_SIZE })
    sourceNode.connect(audioContext.destination)
    sourceNode.connect(analyserNode)
    sourceNode.start()
    await audioContext.startRendering()
    const timeDomainData = new Uint8Array(analyserNode.frequencyBinCount)
    const frequencyData = new Uint8Array(analyserNode.frequencyBinCount)
    analyserNode.getByteTimeDomainData(timeDomainData)
    analyserNode.getByteFrequencyData(frequencyData)
    return {
      timeDomainData,
      frequencyData
    }
  }

  const visualiseSliver = async (inputBuffer, sliverIndex, timeDomainChartId, fftChartId) => {
    const { timeDomainData, frequencyData } = await getSliverData(inputBuffer, sliverIndex)
    drawTimeDomainChart(timeDomainChartId, timeDomainData)
    drawFFTChart(fftChartId, frequencyData, inputBuffer.sampleRate)
  }

  const createLiveVisualisationObservable = (mediaRecorder, mediaStream) => {

    const track = R.head(mediaStream.getTracks())
    const sampleRate = track.getSettings().sampleRate

    const observers = []

    const addObserver = observer => {
      observers.push(observer)
    }

    const removeObserver = observer => {
      const index = observers.findIndex(value => value === observer)
      index >= 0 && observers.splice(index, 1)
    }

    const audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(mediaStream)

    const analyser = new AnalyserNode(audioContext, { fftSize: U.FFT_SIZE })
    source.connect(analyser)

    let keepVisualising = true

    const rafCallback = () => {

      const timeDomainData = new Uint8Array(analyser.frequencyBinCount)
      const frequencyData = new Uint8Array(analyser.frequencyBinCount)

      analyser.getByteTimeDomainData(timeDomainData)
      analyser.getByteFrequencyData(frequencyData)

      observers.forEach(observer => observer.next({
        sampleRate,
        timeDomainData,
        frequencyData
      }))

      if (keepVisualising) {
        requestAnimationFrame(rafCallback)
      }
    }

    mediaRecorder.addEventListener('stop', () => {
      keepVisualising = false
      observers.forEach(observer => observer.complete())
    })

    requestAnimationFrame(rafCallback)

    return new rxjs.Observable(observer => {
      addObserver(observer)
      return () => removeObserver(observer)
    })
  }

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

  exports.createCheckboxes = createCheckboxes
  exports.createRadioButtons = createRadioButtons
  exports.getCheckedCheckboxes = getCheckedCheckboxes
  exports.setCheckedCheckboxes = setCheckedCheckboxes
  exports.getCheckedRadioButton = getCheckedRadioButton
  exports.setCheckedRadioButton = setCheckedRadioButton
  exports.buttonsOnChange = buttonsOnChange
  exports.delay = delay
  exports.drawChart = drawChart
  exports.drawTimeDomainChart = drawTimeDomainChart
  exports.drawFFTChart = drawFFTChart
  exports.drawSpectrogram = drawSpectrogram
  exports.copySliver = copySliver
  exports.getSliverData = getSliverData
  exports.visualiseSliver = visualiseSliver
  exports.createLiveVisualisationObservable = createLiveVisualisationObservable
  exports.SLIVER_DURATION = SLIVER_DURATION
  exports.SAMPLE_RATE = SAMPLE_RATE
  exports.FFT_SIZE = FFT_SIZE
})(U)
