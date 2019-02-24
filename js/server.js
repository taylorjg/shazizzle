/* eslint-env node */

const express = require('express')
const cors = require('cors')

const port = process.env.PORT || 3002

const app = express()

app.use(cors())
app.use('/', express.static(__dirname))

// eslint-disable-next-line
app.listen(port, () => console.log(`Listening on port ${port}`))
