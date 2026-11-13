/*
 * 思想长廊 · 数据加载模块
 * 负责加载并校验离线向量数据，无第三方依赖。
 *
 * 加载：
 *   data/vectors.bin        帖子向量 Float32（行与 vectors.meta.json 对齐）
 *   data/vectors.meta.json  { model, dim, count, posts:[{id,date,source}] }
 *   data/svec.bin           句子向量 Int8（行与 svec.meta.json 对齐）
 *   data/svec.meta.json     { dim, total, posts:[{id,n}] }
 *
 * 模型一致性铁律：meta.model 必须等于 EXPECTED_MODEL，否则拒绝渲染（控制台错误）。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CorridorData = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var EXPECTED_MODEL = 'Xenova/bge-small-zh-v1.5';
  var DIM = 512;
  var base = (typeof window !== 'undefined' && window.CORRIDOR_BASE) || 'data/';

  var enabled = false;
  var loaded = false;
  var loadError = null;

  var postBin = null;          // Float32Array 全量帖子向量
  var postIndex = Object.create(null); // id -> 行号
  var postRows = [];           // 行号 -> {id,date,source}
  var sentBin = null;          // Int8Array 全量句子向量
  var sentOffset = Object.create(null); // id -> {offset,n}

  // 运行时新增的帖子向量（当场编码，立即生效），id -> Float32Array
  var runtimeVec = Object.create(null);

  function fetchBuf(file, asJson) {
    return fetch(base + file, { cache: 'force-cache' }).then(function (r) {
      if (!r.ok) throw new Error(file + ' HTTP ' + r.status);
      return asJson ? r.json() : r.arrayBuffer();
    });
  }

  function init() {
    return Promise.all([
      fetchBuf('vectors.bin', false),
      fetchBuf('vectors.meta.json', true),
      fetchBuf('svec.bin', false),
      fetchBuf('svec.meta.json', true)
    ]).then(function (res) {
      var vbuf = res[0], vmeta = res[1], sbuf = res[2], smeta = res[3];

      // 模型名校验：不一致即拒绝渲染
      if (vmeta.model !== EXPECTED_MODEL) {
        enabled = false; loaded = true;
        loadError = new Error('模型不一致：期望 ' + EXPECTED_MODEL + '，实际 ' + vmeta.model);
        console.error('[思想长廊] 拒绝渲染：', loadError.message);
        return;
      }
      if (vmeta.dim !== DIM) {
        enabled = false; loaded = true;
        loadError = new Error('维度异常：' + vmeta.dim);
        console.error('[思想长廊] 拒绝渲染：', loadError.message);
        return;
      }

      postRows = vmeta.posts;
      postBin = new Float32Array(vbuf);
      postRows.forEach(function (p, i) { postIndex[p.id] = i; });

      sentBin = new Int8Array(sbuf);
      var off = 0;
      smeta.posts.forEach(function (m) {
        sentOffset[m.id] = { offset: off, n: m.n };
        off += m.n;
      });

      enabled = true; loaded = true;
    }).catch(function (e) {
      // 加载失败：安静禁用，不影响 archive 现有功能
      enabled = false; loaded = true; loadError = e;
      console.warn('[思想长廊] 向量数据不可用，功能已禁用：', e.message);
    });
  }

  // 取帖子向量：优先运行时新帖，其次离线 bin
  function getPostVector(id) {
    if (runtimeVec[id]) return runtimeVec[id];
    var row = postIndex[id];
    if (row == null) return null;
    return postBin.subarray(row * DIM, (row + 1) * DIM);
  }

  // 取某帖的句子向量（Int8 视图数组）
  function getSentenceVectors(id) {
    var info = sentOffset[id];
    if (!info || !info.n) return [];
    var out = [];
    for (var i = 0; i < info.n; i++) {
      var start = (info.offset + i) * DIM;
      out.push(sentBin.subarray(start, start + DIM));
    }
    return out;
  }

  // 新帖保存时当场编码后注册（立即进内存候选池）
  function addRuntimeVector(id, vec) {
    runtimeVec[id] = vec instanceof Float32Array ? vec : new Float32Array(vec);
  }

  // 把 archive 的 DATA 条目组装成选卡模块需要的 pool
  function buildPool(entries) {
    return entries.map(function (d) {
      return {
        id: d._id != null ? d._id : d._key,
        date: d.date || '',
        source: d.source || '',
        text: d.text || '',
        v: getPostVector(d._id != null ? d._id : d._key)
      };
    });
  }

  var readyPromise = null;
  return {
    ready: function () {
      if (!readyPromise) readyPromise = init();
      return readyPromise;
    },
    isEnabled: function () { return enabled; },
    isLoaded: function () { return loaded; },
    getError: function () { return loadError; },
    expectedModel: function () { return EXPECTED_MODEL; },
    getPostVector: getPostVector,
    getSentenceVectors: getSentenceVectors,
    addRuntimeVector: addRuntimeVector,
    buildPool: buildPool
  };
});
