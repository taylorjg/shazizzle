# Shazizzle Preparation

I want to create a very basic music matching app similar to [Shazam](https://www.shazam.com/).
This repo contains various experiments to help:

* understand some of the concepts
* get some experience using the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

# Database Tracks

* [Strauss: Vier letzte Lieder, Die Nacht, Allerseelen / Morgen, Op. 27, No. 4](https://www.youtube.com/watch?v=FdJEiCEy7bQ)
* [Walton: Henry V - A Musical Scenario after Shakespeare / Henry V: IV. Interlude: Touch Her Soft Lips and Part](https://www.youtube.com/watch?v=va_ePnLbr10)
* [Cecilia Bartoli - Arie Antiche: Se tu m'ami / Caro mio ben](https://www.youtube.com/watch?v=1Gu8oi8eJSg)

# TODO

* ~~Copy collections from the local Docker instance of MongoDB to the Heroku instance of MongoDB~~
* Add more tracks to the database
* Store more track metadata e.g. artist(s) and album artwork
* Create a new experiment that is a copy of experiment4 but without all the charting
    * i.e. a slimmed-down test page 
* Add a web page to list/edit/delete the tracks in the database
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

# Test Signals

* [Audio Test Tones (Spotify)](https://open.spotify.com/album/1LKEucZzo7uRT2fgujHJGj)

# Links

* [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
* [Fourier - Math.NET Numerics Documentation](https://numerics.mathdotnet.com/api/MathNet.Numerics.IntegralTransforms/Fourier.htm)
* [An Industrial-Strength Audio Search Algorithm](https://www.ee.columbia.edu/~dpwe/papers/Wang03-shazam.pdf)
* [How does Shazam work](http://coding-geek.com/how-shazam-works/)
