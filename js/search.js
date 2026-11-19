// Fuzzy matcher: returns {score, hits} or null. `hits` are character indexes to highlight.
// Scoring favours, in order: exact prefix, whole substring, then a subsequence whose
// letters fall on word starts or run consecutively.
window.FxSearch = (function () {
  "use strict";

  function isWordStart(text, i) {
    if (i === 0) return true;
    var prev = text.charAt(i - 1), ch = text.charAt(i);
    return /[\s\-_&/().]/.test(prev) || (prev === prev.toLowerCase() && ch !== ch.toLowerCase());
  }

  function range(from, len) {
    var out = [];
    for (var i = 0; i < len; i++) out.push(from + i);
    return out;
  }

  function match(query, text) {
    if (!query) return { score: 0, hits: [] };
    var q = query.toLowerCase(), t = text.toLowerCase();

    var at = t.indexOf(q);
    if (at === 0) return { score: 1000 - t.length, hits: range(0, q.length) };
    if (at > 0) {
      // Prefer a substring that starts a word ("blur" in "Gaussian Blur").
      var wordAt = at;
      while (wordAt >= 0 && !isWordStart(text, wordAt)) wordAt = t.indexOf(q, wordAt + 1);
      if (wordAt > 0) return { score: 800 - wordAt - t.length * 0.5, hits: range(wordAt, q.length) };
      return { score: 600 - at - t.length * 0.5, hits: range(at, q.length) };
    }

    // Subsequence, greedy with a preference for word starts.
    var hits = [], score = 0, ti = 0, prevHit = -2;
    for (var qi = 0; qi < q.length; qi++) {
      var c = q.charAt(qi), found = -1;
      for (var k = ti; k < t.length; k++) {
        if (t.charAt(k) !== c) continue;
        if (found < 0) found = k;
        if (isWordStart(text, k)) { found = k; break; }
        if (k === prevHit + 1) break;
      }
      if (found < 0) return null;
      score += isWordStart(text, found) ? 30 : (found === prevHit + 1 ? 18 : 4);
      score -= Math.min(found - ti, 10);
      hits.push(found);
      prevHit = found;
      ti = found + 1;
    }
    return { score: score - t.length * 0.3, hits: hits };
  }

  return { match: match };
})();
