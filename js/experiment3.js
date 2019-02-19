const main = async () => {
  const config = { responseType: 'arraybuffer' }
  const response = await axios.get('signals/440Hz_44100Hz_16bit_05sec.mp3', config)
  const data = response.data
  const audioContext = new OfflineAudioContext({ length: 44100, sampleRate: 44100 })
  const audioBuffer = await audioContext.decodeAudioData(data)
  UW.visualiseSliver(audioBuffer, 10, 'chart1', 'chart2')
}

main()
