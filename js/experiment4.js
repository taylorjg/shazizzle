const onRecord = async e => {
  e.target.disabled = true
  const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mediaRecorder = new MediaRecorder(mediaStream)
  const chunks = []
  mediaRecorder.ondataavailable = e => chunks.push(e.data)
  mediaRecorder.onstop = async () => {
    const blob = new Blob(chunks)
    const url = URL.createObjectURL(blob)
    const config = { responseType: 'arraybuffer' }
    const response = await axios.get(url, config)
    const data = response.data
    const audioContext = new OfflineAudioContext({ length: 44100, sampleRate: 44100 })
    const audioBuffer = await audioContext.decodeAudioData(data)
    U.visualiseSliver(audioBuffer, 10, 'chart1', 'chart2')
    e.target.disabled = false
    mediaStream.getTracks().forEach(track => track.stop())
  }
  mediaRecorder.start()
  await U.delay(1000)
  mediaRecorder.stop()
}

document.getElementById('record').addEventListener('click', onRecord)
