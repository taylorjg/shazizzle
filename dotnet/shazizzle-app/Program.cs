using System;
using ShazizzleLib;

namespace ShazizzleApp
{
    class Program
    {
        static void Main(string[] args)
        {
            // Analyser.AnalysePcmFile(440, "../js/signals/440.pcm");
            // Analyser.AnalyseGenerated(440);
            // Fingerprinting.GetProminentFrequencies("../js/signals/tune.pcm");
            Fingerprinting.GetProminentFrequencies2("tune.json");
        }
    }
}
