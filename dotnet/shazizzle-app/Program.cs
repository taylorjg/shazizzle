using System;
using ShazizzleLib;

namespace ShazizzleApp
{
    class Program
    {
        static void Main(string[] args)
        {
            Analyser.analysePcmFile(440, "../js/signals/440.pcm");
            Analyser.analyseGenerated(440);
        }
    }
}
