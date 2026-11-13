/*
 * 思想长廊 · 选卡纯函数模块（无网络、无 DOM 依赖）
 * 实现技术规格 §四 的五步算法：
 *   粗筛 top20 → 相对门槛（0.45 绝对保底）→ 平局实词裁判 → MMR(λ=0.75) 选最多5张 → 时间升序
 *
 * 输入 posts：[{ id, date, source, text, v:Float32Array(512) }]
 * 所有向量均为归一化向量，余弦即点积。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CorridorSelect = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TOP_N = 20;          // 粗筛余量
  var FLOOR = 0.45;        // 绝对保底
  var TIE_EPS = 0.02;      // 并列阈值（归一化分差）
  var LAMBDA = 0.75;       // MMR 相关性权重
  var MAX_CARDS = 5;

  function dot(a, b) {
    var s = 0;
    for (var i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  // 轻量实词信号：英文单词 + 中文字二元组（仅用于平局裁判）
  var STOP = { '的': 1, '了': 1, '是': 1, '我': 1, '你': 1, '他': 1, '她': 1, '它': 1, '在': 1, '和': 1, '都': 1, '也': 1, '就': 1, '很': 1, '不': 1, '有': 1, '这': 1, '那': 1, '吧': 1, '吗': 1, '呢': 1, '啊': 1 };
  function contentTokens(text) {
    var set = Object.create(null);
    if (!text) return set;
    var en = text.toLowerCase().match(/[a-z]+/g) || [];
    en.forEach(function (w) { if (w.length > 1) set[w] = 1; });
    var runs = text.match(/[\u4e00-\u9fa5]+/g) || [];
    runs.forEach(function (run) {
      for (var i = 0; i < run.length - 1; i++) {
        var bg = run.slice(i, i + 2);
        if (STOP[bg[0]] && STOP[bg[1]]) continue;
        set[bg] = 1;
      }
    });
    return set;
  }
  function sharedCount(a, b) {
    var n = 0, k;
    for (k in a) if (b[k]) n++;
    return n;
  }

  // 日期可比较键：YYYY-MM-DD 直接用字符串；其余回退 Date
  function dateKey(d) {
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    var t = d ? Date.parse(d) : NaN;
    return isNaN(t) ? '9999-99-99' : String(t);
  }

  /**
   * 主入口
   * @param {Array} posts 全量帖子（含向量）
   * @param {number} targetIndex 目标帖在 posts 中的下标
   * @param {Object} [opts]
   * @param {number|null} [opts.excludeId] 直接来源帖 id（仅剔一层）
   * @returns {Array} 入选帖子下标数组（已按时间升序）；空数组表示安静不出卡
   */
  function selectCorridor(posts, targetIndex, opts) {
    opts = opts || {};
    var T = posts[targetIndex];
    if (!T || !T.v) return [];

    // 步骤 1：粗筛 top20（排除自身、排除直接来源）
    var scored = [];
    for (var i = 0; i < posts.length; i++) {
      if (i === targetIndex) continue;
      var p = posts[i];
      if (!p.v) continue;
      if (opts.excludeId != null && p.id === opts.excludeId) continue;
      scored.push({ idx: i, score: dot(T.v, p.v) });
    }
    scored.sort(function (a, b) { return b.score - a.score; });
    scored = scored.slice(0, TOP_N);
    if (!scored.length) return [];

    // 步骤 2：绝对保底 + 相对门槛（最大落差截断）
    var s0 = scored[0].score;
    if (s0 < FLOOR) return [];
    var rel = scored.map(function (x) { return x.score / s0; });
    var bestGap = -1, bestGapVal = -1;
    for (var g = 0; g < rel.length - 1; g++) {
      var gap = rel[g] - rel[g + 1];
      if (gap > bestGapVal) { bestGapVal = gap; bestGap = g; }
    }
    var kept = scored.slice(0, bestGap + 1); // 保留落差之前（含落差上沿）

    // 步骤 3：平局裁判（仅在归一化分差 < 0.02 时用实词重叠）
    var tTokens = contentTokens(T.text);
    kept.sort(function (a, b) {
      if (Math.abs(a.score / s0 - b.score / s0) < TIE_EPS) {
        var oa = sharedCount(tTokens, contentTokens(posts[a.idx].text));
        var ob = sharedCount(tTokens, contentTokens(posts[b.idx].text));
        if (ob !== oa) return ob - oa;
      }
      return b.score - a.score;
    });

    // 步骤 4：MMR 多样性，选最多 5 张
    var selected = [];
    var remain = kept.slice();
    while (selected.length < MAX_CARDS && remain.length) {
      var best = null, bestMmr = -Infinity;
      for (var r = 0; r < remain.length; r++) {
        var c = remain[r];
        var penalty = 0;
        if (selected.length) {
          for (var q = 0; q < selected.length; q++) {
            var d = dot(posts[c.idx].v, posts[selected[q].idx].v);
            if (d > penalty) penalty = d;
          }
        }
        var mmr = LAMBDA * c.score - (1 - LAMBDA) * penalty;
        if (mmr > bestMmr) { bestMmr = mmr; best = r; }
      }
      selected.push(remain.splice(best, 1)[0]);
    }

    // 步骤 5：按时间从早到晚
    var result = selected.map(function (x) { return x.idx; });
    result.sort(function (ia, ib) {
      var ka = dateKey(posts[ia].date), kb = dateKey(posts[ib].date);
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
    return result;
  }

  return {
    selectCorridor: selectCorridor,
    dot: dot,
    contentTokens: contentTokens,
    _params: { TOP_N: TOP_N, FLOOR: FLOOR, TIE_EPS: TIE_EPS, LAMBDA: LAMBDA, MAX_CARDS: MAX_CARDS }
  };
});
