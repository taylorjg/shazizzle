using System;
using System.Linq;
using System.Collections.Generic;
using Xunit;
using MathNet.Numerics;
using MathNet.Numerics.IntegralTransforms;
using ShazizzleLib;

namespace shazizzle_tests
{
    public class FingerprintingTests
    {
        [Theory]
        [InlineData(440)]
        [InlineData(1000)]
        [InlineData(2500)]
        [InlineData(5000)]
        public void GetProminentFrequencies_Single_Frequency(int frequency)
        {
            var sampleRate = 44100;
            var fftSize = 1024;
            var amplitude = 1;
            var samples = Generate.Sinusoidal(sampleRate, sampleRate, frequency, amplitude);

            var prominentFrequencies = Fingerprinting.GetProminentFrequencies(samples, sampleRate);

            var expectedBin = FrequencyToBin(sampleRate, fftSize, frequency);
            var expectedBins = new[] { expectedBin };
            Assert.All(prominentFrequencies, actualBins => Assert.Contains(expectedBin, actualBins));
            Assert.All(prominentFrequencies, actualBins => Assert.Equal(expectedBins, actualBins));
        }

        [Theory]
        [InlineData(440, 1000)]
        [InlineData(1000, 2000)]
        [InlineData(80, 440, 1000)]
        [InlineData(80, 440, 1000, 2500)]
        public void GetProminentFrequencies_Multiple_Frequencies(params int[] frequencies)
        {
            var sampleRate = 44100;
            var fftSize = 1024;
            var amplitude = 1;
            var frequencyIndices = Enumerable.Range(0, frequencies.Length);
            var sineWaves = frequencies
                .Select(frequency => Generate.Sinusoidal(
                    sampleRate,
                    sampleRate,
                    frequency,
                    amplitude)
                .ToList());
            var samples = frequencyIndices
                .Select(index =>
                    sineWaves
                        .Select(sineWave => sineWave[index])
                        .Sum())
                .ToArray();

            var prominentFrequencies = Fingerprinting.GetProminentFrequencies(samples, sampleRate);

            var expectedBins = frequencies.Select(frequency => FrequencyToBin(sampleRate, fftSize, frequency));
            Assert.All(prominentFrequencies, actualBins => Assert.Equal(expectedBins, actualBins));
        }

        private static int FrequencyToBin(int sampleRate, int fftSize, int frequency)
        {
            var binCount = fftSize / 2;
            var frequenciesPerBin = sampleRate / 2 / binCount;
            var bin = (int)Math.Round((double)frequency / frequenciesPerBin);
            return bin;
        }
    }
}
