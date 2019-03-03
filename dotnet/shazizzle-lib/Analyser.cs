using System;
using System.Linq;
using System.Collections.Generic;
using System.IO;
using MathNet.Numerics;
using MathNet.Numerics.IntegralTransforms;

namespace ShazizzleLib
{
    public static class Analyser
    {
        public static void AnalyseGenerated(int frequency)
        {
            var samples = Generate.Sinusoidal(1024, 44100, frequency, 1.0)
                .Select(sample => new Complex32((float)sample, 0))
                .ToArray();
            Fourier.Forward(samples);
            var results = samples.Take(256).Select(result => result.Magnitude);
            Console.WriteLine($"FFT results: {FormatResults(results)}");
            Console.WriteLine(new String('-', 80));
            SaveResultsToCsvFile($"../js/signals/{frequency}_from_generated_data.csv", results);
        }

        public static void AnalysePcmFile(int frequency, string path)
        {
            var bytes = File.ReadAllBytes(path);
            var samples = bytes
                .Skip(1024 * 40)
                .Take(1024)
                .Select(by => new Complex32(by, 0))
                .ToArray();
            Fourier.Forward(samples);
            var results = samples.Take(256).Select(result => result.Magnitude);
            Console.WriteLine($"FFT results: {FormatResults(results)}");
            Console.WriteLine(new String('-', 80));
            SaveResultsToCsvFile($"../js/signals/{frequency}_from_pcm_file.csv", results);
        }

        private static void SaveResultsToCsvFile(string path, IEnumerable<float> results)
        {
            var headings = new[] { "x,y" };
            var rows = results.Select((result, index) => $"{index},{result}");
            var contents = string.Join(Environment.NewLine, headings.Concat(rows));
            File.WriteAllText(path, contents);
        }

        private static string FormatResults(IEnumerable<float> results)
        {
            var strings = results.Select((result, index) => $"[{index}]: {result}");
            return string.Join(Environment.NewLine, strings);
        }
    }
}
