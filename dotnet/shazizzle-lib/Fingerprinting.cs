using System;
using System.Linq;
using System.Collections.Generic;
using System.IO;
using System.Numerics;
using MathNet.Numerics;
using MathNet.Numerics.IntegralTransforms;
using Newtonsoft.Json;

namespace ShazizzleLib
{
    public static class Fingerprinting
    {
        private const double SLIVER_DURATION = 1.0 / 20.0;
        private const int FFT_SIZE = 1024;
        private const int SAMPLE_RATE = 44100;

        private static readonly int[] FREQUENCY_BANDS = {
            0,
            100,
            200,
            400,
            800,
            1600,
            8000
        };
        private const int MIN_BIN_VALUE = 0;

        public static void GetProminentFrequencies(string path)
        {
            var bytes = File.ReadAllBytes(path);
            Console.WriteLine($"bytes.Length: {bytes.Length}");
            var duration = bytes.Length / SAMPLE_RATE;
            Console.WriteLine($"duration: {duration}");
            var sliverCount = (int)Math.Floor(duration / SLIVER_DURATION);
            Console.WriteLine($"sliverCount: {sliverCount}");

            var sliverlength = (int)Math.Floor(SAMPLE_RATE * SLIVER_DURATION);
            var binsPerSliver = Enumerable.Range(0, sliverCount)
                .Select(index => bytes.Skip(index * sliverlength).Take(sliverlength).ToArray())
                .Select(Analyse).ToArray();

            var maxFrequency = SAMPLE_RATE / 2;
            var binCount = FFT_SIZE / 2;
            var binSize = maxFrequency / binCount;
            var binBands = FREQUENCY_BANDS
                .Select(f => (int)Math.Round((double)f / binSize))
                .Pairwise();
            Console.WriteLine(JsonConvert.SerializeObject(binBands));

            var pfs = binsPerSliver.Take(20).Select(bins => FindTopBinIndices(bins, binBands));
            Console.WriteLine(String.Join(Environment.NewLine, pfs.Select((pf, index) =>
                $"[{index}]: {String.Join(",", pf.Select(f => f.ToString()))}")));
        }

        public static IEnumerable<IEnumerable<int>> GetProminentFrequencies(double[] samples, int sampleRate)
        {
            var duration = samples.Length / sampleRate;
            var sliverCount = (int)Math.Floor(duration / SLIVER_DURATION);

            var sliverlength = (int)Math.Floor(sampleRate * SLIVER_DURATION);
            var binsPerSliver = Enumerable.Range(0, sliverCount)
                .Select(index => samples.Skip(index * sliverlength).Take(sliverlength).ToArray())
                .Select(Analyse).ToArray();

            var maxFrequency = SAMPLE_RATE / 2;
            var binCount = FFT_SIZE / 2;
            var binSize = maxFrequency / binCount;
            var binBands = FREQUENCY_BANDS
                .Select(f => (int)Math.Round((double)f / binSize))
                .Pairwise();

            var pfs = binsPerSliver.Take(20).Select(bins => FindTopBinIndices(bins, binBands));
            return pfs;
        }

        private static double[] Analyse(byte[] sliver)
        {
            var extra = sliver.Length - FFT_SIZE;
            var samples = sliver.Skip(extra).Select(sample => new Complex(sample, 0)).ToArray();
            Fourier.Forward(samples);
            var results = samples.Select(result => result.Magnitude).Take(FFT_SIZE / 2).ToArray();
            // The first result always looks massive and skews everything else so force it to 0.
            // TODO: figure out why
            // - something to do with the ffmpeg conversion from .mp3 to .pcm ?
            // - as comparison, FFT of generated sine wave looks fine
            results[0] = 0;
            return results;
        }

        private static double[] Analyse(double[] sliver)
        {
            var extra = sliver.Length - FFT_SIZE;
            var samples = sliver.Skip(extra).Select(sample => new Complex(sample, 0)).ToArray();
            Fourier.Forward(samples);
            var results = samples.Select(result => result.Magnitude).Take(FFT_SIZE / 2).ToArray();
            // The first result always looks massive and skews everything else so force it to 0.
            // TODO: figure out why
            // - something to do with the ffmpeg conversion from .mp3 to .pcm ?
            // - as comparison, FFT of generated sine wave looks fine
            // results[0] = 0;
            return results;
        }

        private static Tuple<double, int> FindTopBinPairInBand(double[] frequencyData, Tuple<int, int> binBand)
        {
            var lb = binBand.Item1;
            var ub = binBand.Item2;
            var zipped = frequencyData.Select((binValue, index) => Tuple.Create(binValue, index));
            var sliced = zipped.Skip(lb).Take(ub - lb);
            var sorted = sliced.OrderByDescending(pair => pair.Item1);
            return sorted.First();
        }

        private static IEnumerable<int> FindTopBinIndices(double[] frequencyData, IEnumerable<Tuple<int, int>> binBands)
        {
            var topBinsPairs = binBands.Select(binBand => FindTopBinPairInBand(frequencyData, binBand));
            var meanBinValue = topBinsPairs.Average(pair => pair.Item1);
            var threshold = Math.Max(meanBinValue, MIN_BIN_VALUE);
            return topBinsPairs
                .Where(pair => pair.Item1 >= threshold)
                .Select(pair => pair.Item2);
        }
    }
}
