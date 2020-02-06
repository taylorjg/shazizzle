import '../AudioContextMonkeyPatch.js'
import * as C from '../common/constants.js'
import * as UW from '../common/utils/utilsWebAudioApi.js'
import * as F from '../common/logic/fingerprinting.js'
import { it_multiple } from './it_multiple.js'

describe('Shazizzle tests', () => {
  it_multiple(
    [
      ['macOS_Chrome_bach_5sec.dat', 'Cantata No. 170, BWV 170: I. Aria "Vergnügte Ruh! Beliebte Seelenlust!"', '2:06'],
      ['macOS_Chrome_monk_5sec.dat', 'Ellis Island for Two Pianos', '0:07'],
      ['macOS_Firefox_bach_5sec.dat', 'Cantata No. 170, BWV 170: I. Aria "Vergnügte Ruh! Beliebte Seelenlust!"', '4:50'],
      ['macOS_Firefox_monk_5sec.dat', 'Ellis Island for Two Pianos', '1:22']
    ],
    'match track from recorded sample',
    async (sample, trackTitle, time) => {
      const config = { responseType: 'arraybuffer' }
      const { data } = await axios.get(`/samples/${sample}`, config)
      const length = 1
      const audioContext = new OfflineAudioContext(1, length, C.TARGET_SAMPLE_RATE)
      const audioBuffer = await UW.decodeAudioDataPromise(audioContext, data)
      const hashes = await F.getHashes(audioBuffer)
      const matchResponse = await axios.post('/api/match', hashes)
      const match = matchResponse.data
      chai.expect(match.trackTitle).to.equal(trackTitle)
      chai.expect(match.time).to.equal(time)
    })
})
