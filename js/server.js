/* eslint-env node */
/* eslint-disable no-console */

const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const tracksApi = require('./tracksApi')

const PORT = process.env.PORT || 3002
const MONGODB_URI = process.env.MONGODB_URI

const main = async () => {
  const app = express()
  app.use(cors())
  app.use('/', express.static(__dirname))
  app.use(bodyParser.json())
  app.use('/api', await tracksApi.configureRouter(MONGODB_URI))
  app.listen(PORT, () => console.log(`Listening on port ${PORT}`))
}

main()
