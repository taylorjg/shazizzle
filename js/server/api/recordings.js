const express = require('express')
const fs = require('fs').promises
const path = require('path')

const DAT_EXT = '.dat'

const configureRouter = RECORDINGS_FOLDER => {

  const numberToFileName = n =>
    `${n.toString().padStart(5, 0)}${DAT_EXT}`

  const getNextFileName = async folder => {
    const fileNames = await fs.readdir(folder)
    const numbers = fileNames
      .filter(fileName => fileName.endsWith(DAT_EXT))
      .map(fileName => path.basename(fileName, DAT_EXT))
      .map(Number)
      .filter(Number.isInteger)
    const biggestNumber = numbers.length ? Math.max(...numbers) : 0
    const nextNumber = biggestNumber + 1
    return path.resolve(folder, numberToFileName(nextNumber))
  }

  const saveRecording = async (req, res) => {
    try {
      console.log(`[recordingsApi#saveRecording] req.body.length: ${req.body.length}`)
      const fileName = await getNextFileName(RECORDINGS_FOLDER)
      await fs.writeFile(fileName, req.body)
      res.json({ fileName })
    } catch (error) {
      console.log(`[recordingsApi#saveRecording] ${error}`)
      res.status(500).send(error.message || 'Internal Server Error')
    }
  }

  const router = express.Router()
  router.post('/recordings', saveRecording)

  return router
}

module.exports = configureRouter
