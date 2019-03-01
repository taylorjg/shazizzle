using System;
using ShazizzleLib;

namespace ShazizzleApp
{
    class Program
    {
        static void Main(string[] args)
        {
            Analyzer.analyze(440, "../js/signals/440.pcm");
            Analyzer.analyze(1000, "../js/signals/1000.pcm");
            Analyzer.analyze(10000, "../js/signals/10000.pcm");
        }
    }
}
