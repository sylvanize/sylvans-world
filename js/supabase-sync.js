/* Supabase 同步：打开 archive 时自动从云端读数据，编辑/删除写回 */
(function(){
  var SUPA_URL='https://addjmwpaeitccrhlarko.supabase.co';
  var SUPA_KEY='sb_publishable_4QJlJpLIbmcrolCaFJuDzA_6Ws2jeJk';

  // 用 fetch 直接调 REST API，不引 SDK
  function supa(path, opts){
    opts = opts || {};
    opts.headers = Object.assign({
      'apikey': SUPA_KEY,
      'Authorization': 'Bearer ' + SUPA_KEY,
      'Content-Type': 'application/json'
    }, opts.headers || {});
    return fetch(SUPA_URL + '/rest/v1/' + path, opts).then(function(r){
      if(!r.ok) return r.text().then(function(t){ throw new Error(t || ('HTTP '+r.status)); });
      return r.text().then(function(t){ return t ? JSON.parse(t) : null; });
    });
  }

  window.SUPA = {
    // 从云端拉全部（只拉未删除的）
    load: function(){
      return supa('entries?select=id,text,date,time,source,tags,images&deleted=eq.false&order=date.desc,id.desc');
    },
    // 新增
    insert: function(entry){
      return supa('entries', {method:'POST', body: JSON.stringify([entry]), headers:{'Prefer':'return=representation'}});
    },
    // 更新
    update: function(id, entry){
      return supa('entries?id=eq.' + id, {method:'PATCH', body: JSON.stringify(entry)});
    },
    // 软删除：标记 deleted=true，不真删
    remove: function(id){
      return supa('entries?id=eq.' + id, {method:'PATCH', body: JSON.stringify({deleted:true})});
    },
    // 批量导入（首次迁移）
    bulkInsert: function(entries){
      return supa('entries', {method:'POST', body: JSON.stringify(entries), headers:{'Prefer':'return=minimal'}});
    }
  };

  // ---- 隐藏列表（云端设置行，软删除所以不会出现在正文里）----
  var SETTINGS_SOURCE='__settings__', SETTINGS_TEXT='__hidden_hashes__';
  window.SUPA.loadHidden = function(){
    return supa('entries?select=id,tags&source=eq.'+SETTINGS_SOURCE+'&text=eq.'+SETTINGS_TEXT,
      {headers:{'Prefer':'return=representation'}});
  };
  window.SUPA.saveHidden = function(id, hashes){
    if(id){
      return supa('entries?id=eq.'+id, {method:'PATCH', body:JSON.stringify({tags:hashes})});
    }
    return supa('entries', {method:'POST', headers:{'Prefer':'return=representation'},
      body:JSON.stringify([{source:SETTINGS_SOURCE, text:SETTINGS_TEXT, deleted:true,
        date:'', time:'', tags:hashes, images:[]}]});
  };

  // 本子心情页：只拉 source=心情 的未删除行（轻量，用于跨设备合并）
  window.SUPA.loadMoods = function(){
    return supa('entries?select=id,text,date,time,tags&source=eq.'+encodeURIComponent('心情')+
      '&deleted=eq.false&order=date.desc,id.desc');
  };

  // 本子专用：按 source+text 找已存在的行（含已软删），有则更新（软删的恢复可见），无则插入。
  // 返回 [{id:...}]，保证同一条内容不会因为重复保存而变成两条。
  window.SUPA.upsertForNotebook = function(entry){
    var q = 'entries?select=id,deleted&source=eq.' + encodeURIComponent(entry.source) +
            '&text=eq.' + encodeURIComponent(entry.text) + '&order=id.asc&limit=1';
    return supa(q, {headers:{'Prefer':'return=representation'}}).then(function(found){
      if(found && found.length){
        var id = found[0].id;
        var patch = Object.assign({}, entry);
        if(found[0].deleted) patch.deleted = false;
        return supa('entries?id=eq.'+id, {method:'PATCH',
          headers:{'Prefer':'return=representation'},
          body:JSON.stringify(patch)}).then(function(rows){
            return (rows && rows.length) ? rows : [{id:id}];
          });
      }
      return window.SUPA.insert(entry);
    });
  };

  // 首次：如果云端为空，把本地 archive-data.js + synced-data.js 的数据迁上去
  window.SUPA_MIGRATE = function(){
    return window.SUPA.load().then(function(rows){
      if(rows.length > 0) return rows;
      // 空的，迁移
      var local = (window.ARCHIVE_DATA || []).slice();
      // 加上 synced
      var synced = window.SYLVAN_SYNCED || {notes:[], poems:[]};
      function cdate(s){var m=(s||'').split('.');if(m.length!==3)return{iso:'',time:''};return{iso:m[0]+'-'+m[1]+'-'+m[2],time:m[0]+'年'+parseInt(m[1],10)+'月'+parseInt(m[2],10)+'日';}}
      (synced.notes||[]).forEach(function(n){
        var d=cdate(n.date);
        local.push({date:d.iso,time:d.time,source:'本子',text:((n.title||'')+'\n'+(n.body||'')).trim(),tags:n.arcTags||['日记'],images:n.images||[]});
      });
      (synced.poems||[]).forEach(function(p){
        local.push({date:'',time:'',source:'本子',text:(p.lines||[]).join('\n'),tags:['俳句'],images:[]});
      });
      // 分批插入
      var batches = [];
      for(var i=0;i<local.length;i+=100){
        batches.push(window.SUPA.bulkInsert(local.slice(i,i+100)));
      }
      return Promise.all(batches).then(function(){ return local; });
    });
  };
})();
