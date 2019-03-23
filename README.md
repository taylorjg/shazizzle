# Shazizzle Preparation

I want to create a very basic music matching app similar to [Shazam](https://www.shazam.com/).
This repo contains various experiments to help:

* understand some of the concepts
* get some experience using the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

# Database Tracks

* [Walton: Henry V - A Musical Scenario after Shakespeare / Henry V: IV. Interlude: Touch Her Soft Lips and Part](https://www.youtube.com/watch?v=va_ePnLbr10)
* [Cecilia Bartoli - Arie Antiche: Se tu m'ami / Caro mio ben](https://www.youtube.com/watch?v=1Gu8oi8eJSg)
* [Strauss: Vier letzte Lieder, Die Nacht, Allerseelen / Morgen, Op. 27, No. 4](https://www.youtube.com/watch?v=FdJEiCEy7bQ)
* [Stämning (feat. Eric Ericson) [22 Swedish songs] / I Seraillets Have (feat. Eric Ericson)](https://www.youtube.com/watch?v=TJjLlDxh7AM)
* [Bridge: Piano Music, Vol. 3 / 3 Lyrics: No. 1, Heart's Ease. Andante tranquillo – Lento](https://www.youtube.com/watch?v=SlU5rdKcFZM)
* [Minimal Piano Collection, Vol. X-XX / Ellis Island for Two Pianos](https://www.youtube.com/watch?v=XR1UR2fkiYQ)
* [Fantasie / Après un rêve](https://www.youtube.com/watch?v=tUM7seSQorM)
* [Victoria: Requiem (Officium defunctorum). Lobo: Versa est in luctum / Taedet animam meam: I. Taedet animam meam]()
* [Too Hot to Handle / Boogie Nights](https://www.youtube.com/watch?v=nFAuXLEa31s)
* [Reflections / Gun](https://www.youtube.com/watch?v=wOeUpKCCSVQ)

# TODO

* ~~Copy collections from the local Docker instance of MongoDB to the Heroku instance of MongoDB~~
* ~~Store more track metadata e.g. artist and album artwork~~
* ~~Add more tracks to the database~~
* ~~Create a new experiment that is a copy of experiment4 but without all the charting~~
    * ~~i.e. a slimmed-down test page~~
* ~~Extend experiment4 to include visualisations of the hash matching (more charts!)~~
    * ~~see Fig 3A and Fig 3B in the original paper~~
* ~~Add a web page to list the tracks in the database~~
* Write a back end console tool in C# or F# to fingerprint a track and add it to the MongoDB database
    * Reconcile the FFT & fingerprint data calculated by JavaScript & `Web Audio API` vs C#/F# & `Math.NET Numerics`
        * Currently, I am getting results that don't quite match
        * Consequently, I am currently having to use experiment8 to fingerprint a track and store it in the database
    * Call out to ffmpeg to convert the track from an mp3/m4a file to pcm
    * Calculate the fingerprint data
    * Store the fingerprint data and track metadata in the MongoDB database
* Investigate hosting on AWS
    * Load static resources from an Amazon S3 bucket configured for static website hosting
    * Move the `match` web api endpoint to AWS Lambda
    * Store the track data in Amazon DocumentDB

## Stretch Goals

* Implement a React Native client
* Implement streaming-based match
    * Rather than capture a 5 second sample and then send it to the server for matching,
    stream data to the server and return a match as soon as possible e.g. after 2 seconds.

# Test Signals

* [Audio Test Tones (Spotify)](https://open.spotify.com/album/1LKEucZzo7uRT2fgujHJGj)

# Links

* [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
* [Fourier - Math.NET Numerics Documentation](https://numerics.mathdotnet.com/api/MathNet.Numerics.IntegralTransforms/Fourier.htm)
* [An Industrial-Strength Audio Search Algorithm](https://www.ee.columbia.edu/~dpwe/papers/Wang03-shazam.pdf)
* [How does Shazam work](http://coding-geek.com/how-shazam-works/)
