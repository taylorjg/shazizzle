const visualiseSliver = async (inputBuffer, sliverIndex) => {
  const options = {
    numberOfChannels: inputBuffer.numberOfChannels,
    length: Math.ceil(inputBuffer.numberOfChannels * inputBuffer.sampleRate * U.SLIVER_SIZE),
    sampleRate: inputBuffer.sampleRate
  }
  const sliverBuffer = new AudioBuffer(options)
  U.copySliver(inputBuffer, sliverBuffer, sliverIndex)
  const audioContext = new OfflineAudioContext(options)
  const sourceNode = new AudioBufferSourceNode(audioContext, { buffer: sliverBuffer })
  const analyserNode = new AnalyserNode(audioContext, { fftSize: 1024 })
  sourceNode.connect(audioContext.destination)
  sourceNode.connect(analyserNode)
  sourceNode.start()
  await audioContext.startRendering()
  const timeDomainData = new Uint8Array(analyserNode.frequencyBinCount)
  const frequencyData = new Uint8Array(analyserNode.frequencyBinCount)
  analyserNode.getByteTimeDomainData(timeDomainData)
  analyserNode.getByteFrequencyData(frequencyData)
  U.drawChart('chart1', timeDomainData)
  U.drawChart('chart2', frequencyData)
}

const main = async () => {
  const config = { responseType: 'arraybuffer' }
  const response = await axios.get('signals/440Hz_44100Hz_16bit_05sec.mp3', config)
  const data = response.data
  const audioContext = new OfflineAudioContext({ length: 44100, sampleRate: 44100 })
  const audioBuffer = await audioContext.decodeAudioData(data)
  visualiseSliver(audioBuffer, 10)
}

main()
