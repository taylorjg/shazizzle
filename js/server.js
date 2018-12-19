const express = require('express')

const port = process.env.PORT || 3002

const app = express()
app.use('/', express.static(__dirname))

app.listen(port, () => console.log(`Listening on port ${port}`))
