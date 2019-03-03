using System;
using System.Collections.Generic;

namespace ShazizzleLib
{
    public static class EnumerableExtensions
    {
        // https://stackoverflow.com/a/19545932/6104386
        public static IEnumerable<Tuple<T, T>> Pairwise<T>(this IEnumerable<T> enumerable)
        {
            var previous = default(T);

            using (var e = enumerable.GetEnumerator())
            {
                if (e.MoveNext())
                    previous = e.Current;

                while (e.MoveNext())
                    yield return Tuple.Create(previous, previous = e.Current);
            }
        }
    }
}
