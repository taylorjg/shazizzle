import * as C from '../constants.js'

export const decodeChunks = async (chunks, sampleRate = 44100) => {
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
    const audioBuffer = await audioContext.decodeAudioData(data)
    return audioBuffer
  } finally {
    URL.revokeObjectURL(url)
  }
}

const copySliver = (srcBuffer, dstBuffer, sliverIndex) => {
  const startOffset = Math.floor(srcBuffer.sampleRate * sliverIndex * C.SLIVER_DURATION)
  const endOffset = Math.floor(srcBuffer.sampleRate * (sliverIndex + 1) * C.SLIVER_DURATION)
  const channelIndices = R.range(0, srcBuffer.numberOfChannels)
  channelIndices.forEach(channelIndex => {
    const srcChannelData = srcBuffer.getChannelData(channelIndex)
    const dstChannelData = dstBuffer.getChannelData(channelIndex)
    const sliverOfData = srcChannelData.subarray(startOffset, endOffset)
    dstChannelData.set(sliverOfData)
  })
}

export const createAudioBuffer = (channelData, sampleRate) => {
  const options = {
    numberOfChannels: 1,
    length: channelData.length,
    sampleRate
  }
  const audioBuffer = new AudioBuffer(options)
  audioBuffer.copyToChannel(channelData, 0)
  return audioBuffer
}

export const TIME_DOMAIN_DATA_ONLY = Symbol('TIME_DOMAIN_DATA_ONLY')
export const FREQUENCY_DATA_ONLY = Symbol('FREQUENCY_DATA_ONLY')
export const BOTH = Symbol('BOTH')

export const getSliverTimeDomainData = async (inputBuffer, sliverIndex) => {
  const { timeDomainData } = await getSliverData(
    inputBuffer,
    sliverIndex,
    TIME_DOMAIN_DATA_ONLY)
  return timeDomainData
}

export const getSliverFrequencyData = async (inputBuffer, sliverIndex) => {
  const { frequencyData } = await getSliverData(
    inputBuffer,
    sliverIndex,
    FREQUENCY_DATA_ONLY)
  return frequencyData
}

export const getSliverData = async (inputBuffer, sliverIndex, flags = BOTH) => {
  const numberOfChannels = inputBuffer.numberOfChannels
  // TODO: should length calculation include numberOfChannels factor ?
  const length = Math.ceil(inputBuffer.sampleRate * C.SLIVER_DURATION)
  const sampleRate = inputBuffer.sampleRate
  const audioContext = new OfflineAudioContext(numberOfChannels, length, sampleRate)
  const sliverBuffer = audioContext.createBuffer(numberOfChannels, length, sampleRate)
  copySliver(inputBuffer, sliverBuffer, sliverIndex)
  const sourceNode = audioContext.createBufferSource()
  const analyserNode = audioContext.createAnalyser()
  analyserNode.fftSize = C.FFT_SIZE
  sourceNode.buffer = sliverBuffer
  sourceNode.connect(audioContext.destination)
  sourceNode.connect(analyserNode)
  sourceNode.start()
  await startRenderingPromise(audioContext)

  const timeDomainData = flags === TIME_DOMAIN_DATA_ONLY || flags === BOTH
    ? new Uint8Array(analyserNode.frequencyBinCount)
    : undefined
  timeDomainData && analyserNode.getByteTimeDomainData(timeDomainData)

  const frequencyData = flags === FREQUENCY_DATA_ONLY || flags === BOTH
    ? new Uint8Array(analyserNode.frequencyBinCount)
    : undefined
  frequencyData && analyserNode.getByteFrequencyData(frequencyData)

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
  const numberOfChannels = srcBuffer.numberOfChannels
  const length = srcBuffer.duration * targetSampleRate
  const audioContext = new OfflineAudioContext(numberOfChannels, length, targetSampleRate)
  const sourceNode = audioContext.createBufferSource()
  sourceNode.buffer = srcBuffer
  sourceNode.connect(audioContext.destination)
  sourceNode.start()
  return startRenderingPromise(audioContext)
}

export const steroToMono = async srcBuffer => {
  if (srcBuffer.numberOfChannels === 1) return srcBuffer
  const numberOfChannels = 1
  const length = srcBuffer.length
  const sampleRate = srcBuffer.sampleRate
  const audioContext = new OfflineAudioContext(numberOfChannels, length, sampleRate)
  const sourceNode = audioContext.createBufferSource()
  sourceNode.buffer = srcBuffer
  sourceNode.connect(audioContext.destination)
  sourceNode.start()
  return startRenderingPromise(audioContext)
}

export const startRenderingPromise = offlineAudioContext =>
  new Promise(resolve => {
    offlineAudioContext.oncomplete = e => resolve(e.renderedBuffer)
    offlineAudioContext.startRendering()
  })

export const decodeAudioDataPromise = (baseAudioContext, data) =>
  new Promise((resolve, reject) =>
    baseAudioContext.decodeAudioData(data, resolve, reject))
