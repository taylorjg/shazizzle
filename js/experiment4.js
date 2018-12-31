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

const onRecord = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mediaRecorder = new MediaRecorder(stream)
  const chunks = []
  mediaRecorder.ondataavailable = e => {
    chunks.push(e.data)
  }
  mediaRecorder.onstop = async () => {
    const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' })
    const url = URL.createObjectURL(blob)
    const config = { responseType: 'arraybuffer' }
    const response = await axios.get(url, config)
    const data = response.data
    const audioContext = new OfflineAudioContext({ length: 44100, sampleRate: 44100 })
    const audioBuffer = await audioContext.decodeAudioData(data)
    visualiseSliver(audioBuffer, 10)
  }
  mediaRecorder.start()
  await U.delay(1000)
  mediaRecorder.stop()
}

document.getElementById('record').addEventListener('click', onRecord)
