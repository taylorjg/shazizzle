import '../AudioContextMonkeyPatch.js'
import * as UH from '../common/utils/utilsHtml.js'
import * as UW from '../common/utils/utilsWebAudioApi.js'

const onPlay = async () => {
  try {
    UH.hideErrorPanel()
    const config = { responseType: 'arraybuffer' }
    // const { data } = await axios.get('/music/almost-blue.mp3', config)
    const { data } = await axios.get('/samples/macOS_Chrome_monk_5sec.dat', config)
    const audioContext = new AudioContext({ sampleRate: 48000 })
    const audioBuffer = await UW.decodeAudioDataPromise(audioContext, data)
    const bufferSourceNode = audioContext.createBufferSource()
    bufferSourceNode.buffer = audioBuffer
    bufferSourceNode.connect(audioContext.destination)
    bufferSourceNode.start()
  } catch (error) {
    UH.showErrorPanel(error.message)
  }
}

const playBtn = document.getElementById('play-btn')
playBtn.addEventListener('click', onPlay)
