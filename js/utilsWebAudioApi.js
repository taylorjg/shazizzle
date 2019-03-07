import * as C from './constants.js'

export const decodeChunks = async (chunks, sampleRate) => {
  const blob = new Blob(chunks)
  const url = URL.createObjectURL(blob)
  try {
    const config = { responseType: 'arraybuffer' }
    const response = await axios.get(url, config)
    const data = response.data
    const options = {
      length: sampleRate,
      sampleRate
    }
    const audioContext = new OfflineAudioContext(options)
    const audioBuffer = await audioContext.decodeAudioData(data)
    return audioBuffer
  } finally {
    URL.revokeObjectURL(url)
  }
}

const copySliver = (srcBuffer, dstBuffer, sliverIndex) => {
  const startOffset = Math.floor(srcBuffer.sampleRate * sliverIndex * C.SLIVER_DURATION)
  const channelIndices = R.range(0, srcBuffer.numberOfChannels)
  channelIndices.forEach(channelIndex => {
    const dstChannelData = dstBuffer.getChannelData(channelIndex)
    srcBuffer.copyFromChannel(dstChannelData, channelIndex, startOffset)
  })
}

const copySliver2 = (srcBuffer, dstBuffer, sliverIndex) => {
  const sliverLength = srcBuffer.sampleRate * C.SLIVER_DURATION
  const startOffset = sliverIndex * sliverLength
  const channelIndices = R.range(0, srcBuffer.numberOfChannels)
  channelIndices.forEach(channelIndex => {
    const srcChannelData = srcBuffer.getChannelData(channelIndex)
    const slice = srcChannelData.slice(startOffset, startOffset + sliverLength - C.FFT_SIZE)
    dstBuffer.copyToChannel(slice, 0)
  })
}

export const getSliverData = async (inputBuffer, sliverIndex) => {
  const options = {
    numberOfChannels: inputBuffer.numberOfChannels,
    length: Math.ceil(inputBuffer.sampleRate * C.SLIVER_DURATION),
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

export const getSliverData2 = async (inputBuffer, sliverIndex) => {
  const options = {
    numberOfChannels: inputBuffer.numberOfChannels,
    length: C.FFT_SIZE,
    sampleRate: inputBuffer.sampleRate
  }
  const sliverBuffer = new AudioBuffer(options)
  copySliver2(inputBuffer, sliverBuffer, sliverIndex)
  console.dir(sliverBuffer)
  const audioContext = new OfflineAudioContext(options)
  const sourceNode = new AudioBufferSourceNode(audioContext, { buffer: sliverBuffer })
  const analyserNode = new AnalyserNode(audioContext, { fftSize: C.FFT_SIZE, smoothingTimeConstant: 0 })
  sourceNode.connect(audioContext.destination)
  sourceNode.connect(analyserNode)
  sourceNode.start()
  await audioContext.startRendering()
  const timeDomainData = new Float32Array(analyserNode.frequencyBinCount)
  const frequencyData = new Float32Array(analyserNode.frequencyBinCount)
  analyserNode.getFloatTimeDomainData(timeDomainData)
  analyserNode.getFloatFrequencyData(frequencyData)
  return {
    timeDomainData,
    frequencyData
  }
}

export const createLiveVisualisationObservable = (mediaRecorder, mediaStream) => {

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

    const currentTime = audioContext.currentTime
    const timeDomainData = new Uint8Array(analyser.frequencyBinCount)
    const frequencyData = new Uint8Array(analyser.frequencyBinCount)

    analyser.getByteTimeDomainData(timeDomainData)
    analyser.getByteFrequencyData(frequencyData)

    observers.forEach(observer => observer.next({
      timeDomainData,
      frequencyData,
      sampleRate,
      currentTime
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

export const resample = async (srcBuffer, targetSampleRate) => {
  const options = {
    numberOfChannels: srcBuffer.numberOfChannels,
    length: srcBuffer.duration * targetSampleRate,
    sampleRate: targetSampleRate
  }
  const audioContext = new OfflineAudioContext(options)
  const source = audioContext.createBufferSource()
  source.buffer = srcBuffer
  source.connect(audioContext.destination)
  source.start()
  const dstBuffer = await audioContext.startRendering()
  return dstBuffer
}

export const steroToMono = async srcBuffer => {
  if (srcBuffer.numberOfChannels === 1) return srcBuffer
  const options = {
    numberOfChannels: 1,
    length: srcBuffer.length,
    sampleRate: srcBuffer.sampleRate
  }
  const audioContext = new OfflineAudioContext(options)
  const source = audioContext.createBufferSource()
  source.buffer = srcBuffer
  source.connect(audioContext.destination)
  source.start()
  const dstBuffer = await audioContext.startRendering()
  return dstBuffer
}
