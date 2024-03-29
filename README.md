# Shazizzle

I ~~want to create~~ have written a very basic music matching app similar to [Shazam](https://www.shazam.com/).
This repo contains various experiments to help:

* understand some of the concepts
* get some experience using the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

# Supported Browsers

I have tried it successfully on the following browsers:

* Chrome on macOS
* Firefox on macOS
* Chrome on Android

> **NOTE:** [matchTrackWithStreaming.html](https://shazizzle.herokuapp.com/app/matchTrackWithStreaming.html) does not work on Firefox because it doesn't seem to
support `AudioWorkletNode`:

```
ReferenceError: AudioWorkletNode is not defined [Learn More] pcmObservable.js:1:1
    <anonymous> http://localhost:3002/common/utils/pcmObservable.js:1
    InnerModuleEvaluation self-hosted:4364
    InnerModuleEvaluation self-hosted:4353
    evaluation self-hosted:4317
```

# Database Tracks

You can try it out by playing one of the YouTube links below and clicking `Record` on one of these pages:

* [matchTrack.html](https://shazizzle.herokuapp.com/app/matchTrack.html)
  * _capture chosen length of sample then send to server for matching_
* [matchTrackWithDiagnostics.html](https://shazizzle.herokuapp.com/app/matchTrackWithDiagnostics.html)
  * _as above but with various diagnostic charts_
* [matchTrackWithStreaming.html](https://shazizzle.herokuapp.com/app/matchTrackWithStreaming.html)
  * _stream fingerprinted data to the server over a web socket for progressive matching_

I have fingerprinted 12 tracks. I bought them all from iTunes. The .m4a files are not in the repo.
However, you can play the tracks on YouTube:

* [Walton: Henry V - A Musical Scenario after Shakespeare / Henry V: IV. Interlude: Touch Her Soft Lips and Part](https://www.youtube.com/watch?v=va_ePnLbr10)
* [Cecilia Bartoli - Arie Antiche: Se tu m'ami / Caro mio ben](https://www.youtube.com/watch?v=1Gu8oi8eJSg)
* [Strauss: Vier letzte Lieder, Die Nacht, Allerseelen / Morgen, Op. 27, No. 4](https://www.youtube.com/watch?v=FdJEiCEy7bQ)
* [Stämning (feat. Eric Ericson) [22 Swedish songs] / I Seraillets Have (feat. Eric Ericson)](https://www.youtube.com/watch?v=TJjLlDxh7AM)
* [Bridge: Piano Music, Vol. 3 / 3 Lyrics: No. 1, Heart's Ease. Andante tranquillo – Lento](https://www.youtube.com/watch?v=SlU5rdKcFZM)
* [Minimal Piano Collection, Vol. X-XX / Ellis Island for Two Pianos](https://www.youtube.com/watch?v=XR1UR2fkiYQ)
* [Fantasie / Après un rêve](https://www.youtube.com/watch?v=tUM7seSQorM)
* [Victoria: Requiem (Officium defunctorum). Lobo: Versa est in luctum / Taedet animam meam: I. Taedet animam meam](https://www.youtube.com/watch?v=AWkoedsVtEY)
* [Too Hot to Handle / Boogie Nights](https://www.youtube.com/watch?v=nFAuXLEa31s)
* [Reflections / Gun](https://www.youtube.com/watch?v=wOeUpKCCSVQ)
* [Bach: Cantatas for Alto Solo / Cantata No. 170, BWV 170: I. Aria "Vergnügte Ruh! Beliebte Seelenlust!"](https://www.youtube.com/watch?v=nIf-2mCKLqI)
* [Haydn: Strings Quartets Op. 71 / Griogal Cridhe "Gregor’s Lament"](https://www.youtube.com/watch?v=cE1oMU27Jus)
  * _this is actually a live performance but some of it still matches against the fingerprinted iTunes track!_

# Buildless Client

Just being lazy really. The client-side code does not need to be built - no `Babel`, `Browserify`, `webpack`, `npm run build`, etc. This is achieved using the `type=module` attribute of the `<script>` tag. Here is an example:

```
<script type="module" src="matchTrack.js"></script>
```

# Running Locally

After cloning the repo, do the following to run everything locally. This assumes that you have Node.js, npm and Docker installed.

```
# restore npm packages
npm install

# create a .env file
cat << 'EOF' >> .env
PGSSLMODE=disable
DATABASE_URL=postgres://postgres:mypassword@localhost:5432/postgres
EOF

# run PostgreSQL in a Docker container
scripts/db.sh run

# create database schema
scripts/db.sh create

# restore the database
scripts/db.sh restore

# (optional) show summary of restored database
scripts/db.sh show

# start the Express server
npm start
```

Then, open a browser to http://localhost:3002.

Or, you can specify a different port number e.g.:

```
PORT=3200 npm start
```

# TODO

* ~~Copy data from the local Docker database instance to the Heroku database instance~~
* ~~Store more track metadata e.g. artist and album artwork~~
* ~~Add more tracks to the database~~
* ~~Create a new experiment that is a copy of experiment4 but without all the charting~~
    * ~~i.e. a slimmed-down test page~~
* ~~Extend experiment4 to include visualisations of the hash matching (more charts!)~~
    * ~~see Fig 3A and Fig 3B in the original paper~~
* ~~Add a web page to list the tracks in the database~~
* Tune the app to perform better.
Concentrate on reducing the amount of stored data whilst increasing the ability to find a match.
Some of the settings that can be adjusted are:
    * Sample rate (currently 16 kHz)
    * FFT size (currently 1024)
    * Frequency bands (currently 0-100 Hz, 100-200 Hz, 200-400 Hz, 400-800 Hz, 800-1600 Hz, 1600-8000 Hz)
    * Number of slivers (currently 20 per second)
    * Size of the target zone (currently 5 points)
* Write a back end console tool in C# or F# to fingerprint a track and add it to the database
    * Reconcile the FFT & fingerprint data calculated by JavaScript & `Web Audio API` vs C#/F# & `Math.NET Numerics`
        * Currently, I am getting results that don't quite match
        * Consequently, I am currently having to use `seedTracks.html` to fingerprint a track and store it in the database
    * Call out to ffmpeg to convert the track from an mp3/m4a file to pcm
    * Calculate the fingerprint data
    * Store the fingerprint data and track metadata in the database
* Investigate hosting on AWS
    * Load static resources from an Amazon S3 bucket configured for static website hosting
    * Move the `match` web api endpoint to AWS Lambda
    * Store the track data in Amazon RDS for PostgreSQL
* ~~Implement streaming-based match~~
    * ~~Rather than capture a 5 second sample and then send it to the server for matching,
    stream data to the server and return a match as soon as possible e.g. after 2 seconds.~~

# Test Signals

* [Audio Test Tones (Spotify)](https://open.spotify.com/album/1LKEucZzo7uRT2fgujHJGj)

# Links

* [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
* [MediaStream Recording API](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API)
* [Enter Audio Worklet](https://developers.google.com/web/updates/2017/12/audio-worklet)
* [An Industrial-Strength Audio Search Algorithm](https://www.ee.columbia.edu/~dpwe/papers/Wang03-shazam.pdf)
* [How does Shazam work](http://coding-geek.com/how-shazam-works/)
* [Fourier - Math.NET Numerics Documentation](https://numerics.mathdotnet.com/api/MathNet.Numerics.IntegralTransforms/Fourier.htm)
