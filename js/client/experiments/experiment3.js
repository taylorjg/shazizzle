import * as UC from './utils/utilsChart.js'
import * as UW from './utils/utilsWebAudioApi.js'

const main = async () => {
  const config = { responseType: 'arraybuffer' }
  const response = await axios.get('/signals/440Hz_44100Hz_16bit_05sec.mp3', config)
  const data = response.data
  const audioContext = new OfflineAudioContext({ length: 44100, sampleRate: 44100 })
  const audioBuffer = await audioContext.decodeAudioData(data)
  const { timeDomainData, frequencyData } = await UW.getSliverData(audioBuffer, 10)
  UC.drawTimeDomainChart('chart1', timeDomainData)
  UC.drawFFTChart('chart2', frequencyData, audioBuffer.sampleRate)
}

main()
