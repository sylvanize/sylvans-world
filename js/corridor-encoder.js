/*
 * 思想长廊 · 运行时编码模块（懒加载）
 * 仅在保存新帖时才加载模型与推理运行时；浏览长廊不触发。
 * 使用与离线全量完全相同的模型产物（assets/models 下的量化 BGE），保证模型一致性。
 */
(function (root) {
  'use strict';

  // 以本脚本自身 URL 为基准推导绝对路径，避免相对路径在 GitHub Pages 子目录下错位
  var selfSrc = (document.currentScript && document.currentScript.src) || '';
  var jsDir = selfSrc.replace(/[^/]*$/, '');           // .../js/
  var rootDir = jsDir.replace(/js\/$/, '');             // 站点根 .../
  var BUNDLE = jsDir + 'vendor/transformers.web.min.js';
  var ORT_DIR = jsDir + 'vendor/ort/';
  // 模型用「相对文档」的路径交给 transformers 直接 fetch（含两级目录，避免被当成 HF id 加前缀）
  var modelAbs = rootDir + 'assets/models/bge-small-zh-v1.5';
  var docBase = new URL('./', document.baseURI).href;
  var MODEL_PATH = modelAbs.indexOf(docBase) === 0 ? modelAbs.slice(docBase.length) : modelAbs;

  var pipePromise = null;
  var pipeline = null;

  function getPipeline() {
    if (pipePromise) return pipePromise;
    pipePromise = import(BUNDLE).then(function (T) {
      var env = T.env;
      env.allowLocalModels = true;
      env.backends.onnx.wasm.numThreads = 1; // GitHub Pages 无 COOP/COEP，单线程
      env.backends.onnx.wasm.wasmPaths = {
        mjs: ORT_DIR + 'ort-wasm-simd-threaded.mjs',
        wasm: ORT_DIR + 'ort-wasm-simd-threaded.wasm'
      };
      return T.pipeline('feature-extraction', MODEL_PATH, { dtype: 'q8' });
    }).then(function (p) { pipeline = p; return p; });
    return pipePromise;
  }

  // 编码单条文本，返回归一化 Float32Array
  function encode(text) {
    return getPipeline().then(function (p) {
      return p(text, { pooling: 'mean', normalize: true }).then(function (o) {
        return new Float32Array(o.data);
      });
    });
  }

  // 批量编码句子（用于新帖自身句子向量）
  function encodeSentences(sentences) {
    return getPipeline().then(function (p) {
      var out = [];
      function next(i) {
        if (i >= sentences.length) return Promise.resolve(out);
        return p(sentences[i], { pooling: 'mean', normalize: true }).then(function (o) {
          out.push(new Float32Array(o.data));
          return next(i + 1);
        });
      }
      return next(0);
    });
  }

  root.CorridorEncoder = {
    ready: function () { return getPipeline().then(function () { return true; }); },
    isReady: function () { return !!pipeline; },
    encode: encode,
    encodeSentences: encodeSentences
  };
})(typeof window !== 'undefined' ? window : this);
