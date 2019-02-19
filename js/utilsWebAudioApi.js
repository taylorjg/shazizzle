const UW = {};

(function (exports) {

  const decodeChunks = async (chunks, sampleRate) => {
    const blob = new Blob(chunks)
    const url = URL.createObjectURL(blob)
    try {
      const config = { responseType: 'arraybuffer' }
      const response = await axios.get(url, config)
      const data = response.data
      const options = {
        length: 1,
        sampleRate
      }
      const audioContext = new OfflineAudioContext(options)
      audioBuffer = await audioContext.decodeAudioData(data)
      return audioBuffer
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  const copySliver = (srcBuffer, dstBuffer, sliverIndex) => {
    const srcDataStartIndex = Math.floor(srcBuffer.sampleRate * sliverIndex * C.SLIVER_DURATION)
    const srcDataEndIndex = Math.floor(srcBuffer.sampleRate * (sliverIndex + 1) * C.SLIVER_DURATION)
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
      length: Math.ceil(inputBuffer.numberOfChannels * inputBuffer.sampleRate * C.SLIVER_DURATION),
      sampleRate: inputBuffer.sampleRate
    }
    const sliverBuffer = new AudioBuffer(options)
    copySliver(inputBuffer, sliverBuffer, sliverIndex)
    const audioContext = new OfflineAudioContext(options)
    const sourceNode = new AudioBufferSourceNode(audioContext, { buffer: sliverBuffer })
    const analyserNode = new AnalyserNode(audioContext, { fftSize: C.FFT_SIZE })
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
    UC.drawTimeDomainChart(timeDomainChartId, timeDomainData)
    UC.drawFFTChart(fftChartId, frequencyData, inputBuffer.sampleRate)
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

    const analyser = new AnalyserNode(audioContext, { fftSize: C.FFT_SIZE })
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

  exports.decodeChunks = decodeChunks
  exports.getSliverData = getSliverData
  exports.visualiseSliver = visualiseSliver
  exports.createLiveVisualisationObservable = createLiveVisualisationObservable
})(UW)
