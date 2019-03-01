using System;
using System.Linq;
using System.IO;
using MathNet.Numerics;
using MathNet.Numerics.IntegralTransforms;

namespace ShazizzleLib
{
    public static class Analyzer
    {
        public static void analyze(int frequency, string path)
        {
            var bytes = File.ReadAllBytes(path);
            var samples = bytes
                .Skip(1024 * 40)
                .Take(1024)
                .Select(by => new Complex32(by, 0))
                .ToArray();
            Fourier.Forward(samples);
            Console.WriteLine($"After FFT: {FormatSamples(samples)}");
            Console.WriteLine(new String('-', 80));
            SaveToCsvFile($"../js/signals/{frequency}.csv", samples);
        }

        private static void SaveToCsvFile(string path, Complex32[] samples)
        {
            var headings = new[] { "x,y" };
            var rows = samples.Skip(1).Take(512).Select((c, i) => $"{i},{Complex32.Abs(c)}");
            var contents = string.Join(Environment.NewLine, headings.Concat(rows));
            File.WriteAllText(path, contents);
        }

        private static string FormatSamples(Complex32[] samples)
        {
            var strings = samples.Select((c, i) => $"[{i}]: {c}");
            return string.Join(Environment.NewLine, strings);
        }
    }
}
