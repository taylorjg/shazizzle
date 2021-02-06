import '../AudioContextMonkeyPatch.js'
import * as C from '../common/constants.js'
import * as U from '../common/utils/utils.js'
import * as UC from '../common/utils/utilsChart.js'
import * as UH from '../common/utils/utilsHtml.js'
import * as UW from '../common/utils/utilsWebAudioApi.js'
import * as F from '../common/logic/fingerprinting.js'

let currentDuration = 5
let currentSliver = 0
let maxSliver = 0
let audioBuffer = null

const durationValues = [1, 2, 5, 10, 15, 20]

const durationRadioButtons = UH.createRadioButtons(
  'durations',
  'duration',
  durationValues)

const onDurationChange = () => {
  currentDuration = Number(UH.getCheckedRadioButton(durationRadioButtons))
}

UH.setCheckedRadioButton(durationRadioButtons, currentDuration)
UH.buttonsOnChange(durationRadioButtons, onDurationChange)

const recordButton = document.getElementById('record')
const playButton = document.getElementById('play')
const progressRow = document.getElementById('progressRow')
const progressBar = progressRow.querySelector('.progress-bar')
const buttonsRow = document.getElementById('buttonsRow')
const sliderRow = document.getElementById('sliderRow')
const binsRow = document.getElementById('binsRow')
const fastBackwardButton = document.getElementById('fastBackward')
const stepBackwardButton = document.getElementById('stepBackward')
const stepForwardButton = document.getElementById('stepForward')
const fastForwardButton = document.getElementById('fastForward')
const currentSliverLabel = document.getElementById('currentSliverLabel')
const maxSliverLabel = document.getElementById('maxSliverLabel')
const slider = document.getElementById('slider')

const onRecord = async () => {
  let mediaStream
  try {
    UH.hideErrorPanel()

    const tmpAudioContext = new AudioContext()
    const sampleRate = tmpAudioContext.sampleRate
    await tmpAudioContext.close()

    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate
      },
      video: false
    })
    const mediaRecorder = new MediaRecorder(mediaStream)

    const chunks = []
    mediaRecorder.ondataavailable = e => chunks.push(e.data)

    mediaRecorder.onstart = () => {
      const liveVisualisationObservable = UW.createLiveVisualisationObservable(mediaRecorder, mediaStream)
      liveVisualisationObservable.subscribe(makeLiveChartingObserver(mediaRecorder, currentDuration))
    }

    mediaRecorder.onstop = async () => {
      mediaStream.getTracks().forEach(track => track.stop())
      audioBuffer = await UW.decodeChunks(chunks, sampleRate)
      currentSliver = 0
      maxSliver = Math.floor(audioBuffer.duration / C.SLIVER_DURATION)
      slider.min = 0
      slider.max = maxSliver - 1
      setCurrentSliver(0)()
      U.defer(500, () => updateUiState(FINISHED_RECORDING))
    }

    updateUiState(RECORDING)
    setTimeout(() => mediaRecorder.stop(), currentDuration * 1000 + 250)
    mediaRecorder.start()
  } catch (error) {
    UH.showErrorPanel(error.message)
  }
}

const onPlay = async () => {
  if (!audioBuffer) return
  console.dir(audioBuffer)
  const audioContext = new AudioContext({ sampleRate: audioBuffer.sampleRate })
  const bufferSourceNode = audioContext.createBufferSource()
  bufferSourceNode.buffer = audioBuffer
  bufferSourceNode.connect(audioContext.destination)
  bufferSourceNode.start()
  setTimeout(() => audioContext.close(), audioBuffer.duration * 1000)
}

const makeLiveChartingObserver = (mediaRecorder, duration) => ({
  next: value => {
    if (value.currentTime % 1 < 0.5) {
      const percent = R.clamp(0, 100, Math.round(value.currentTime / duration * 100))
      updateProgressBar(percent)
    }
    UC.drawByteTimeDomainChart('timeDomainChart', value.timeDomainData)
    UC.drawFFTChart('fftChart', value.frequencyData, value.sampleRate)
  }
})

const RECORDING = Symbol('RECORDING')
const FINISHED_RECORDING = Symbol('FINISHED_RECORDING')

const updateUiState = state => {
  recordButton.disabled = state === RECORDING
  progressRow.style.display = state === RECORDING ? 'block' : 'none'
  buttonsRow.style.display = state === FINISHED_RECORDING ? 'block' : 'none'
  sliderRow.style.display = state === FINISHED_RECORDING ? 'block' : 'none'
  binsRow.style.display = state === FINISHED_RECORDING ? 'block' : 'none'
  state === RECORDING && updateProgressBar(0)
}

const updateSliverControlsState = () => {
  fastBackwardButton.disabled = currentSliver < 10
  stepBackwardButton.disabled = currentSliver < 1
  stepForwardButton.disabled = currentSliver >= (maxSliver - 1)
  fastForwardButton.disabled = currentSliver >= (maxSliver - 10)
}

const setCurrentSliver = adjustment => async () => {
  currentSliver += adjustment
  slider.value = currentSliver
  updateSliverControlsState()
  currentSliverLabel.innerText = `${currentSliver + 1}`
  maxSliverLabel.innerText = `${maxSliver}`
  const { timeDomainData, frequencyData } = await UW.getSliverData(audioBuffer, currentSliver)
  UC.drawByteTimeDomainChart('timeDomainChart', timeDomainData)
  UC.drawFFTChart('fftChart', frequencyData, audioBuffer.sampleRate)
  const binSize = C.TARGET_SAMPLE_RATE / C.FFT_SIZE
  showBins(binSize, frequencyData)
}

const onSliverSliderChange = e => {
  currentSliver = e.target.valueAsNumber
  setCurrentSliver(0)()
}

fastBackwardButton.addEventListener('click', setCurrentSliver(-10))
stepBackwardButton.addEventListener('click', setCurrentSliver(-1))
stepForwardButton.addEventListener('click', setCurrentSliver(+1))
fastForwardButton.addEventListener('click', setCurrentSliver(+10))

slider.addEventListener('click', onSliverSliderChange)
slider.addEventListener('input', onSliverSliderChange)

recordButton.addEventListener('click', onRecord)
playButton.addEventListener('click', onPlay)

const updateProgressBar = percent => {
  const currentPercent = Number(progressBar.getAttribute('aria-valuenow'))
  if (percent !== currentPercent) {
    progressBar.setAttribute('aria-valuenow', percent)
    progressBar.style.width = `${percent}%`
  }
}

const showBins = async (binSize, frequencyData) => {
  const bins = await F.getProminentFrequenciesOfSliver(audioBuffer, frequencyData)
  const lines = bins.map(bin =>
    `bin: ${bin}; frequency range: ${bin * binSize} - ${(bin + 1) * binSize} Hz`)
  const binsPre = document.getElementById('binsRow').querySelector('pre')
  binsPre.innerHTML = lines.join('\n')
}
