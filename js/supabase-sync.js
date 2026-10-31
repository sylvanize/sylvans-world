/* Supabase 同步：打开 archive 时自动从云端读数据，编辑/删除写回 */
(function(){
  var SUPA_URL='https://addjmwpaeitccrlarko.supabase.co';
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
      if(!r.ok) return r.text().then(function(t){ throw new Error(t); });
      return r.status === 204 ? null : r.json();
    });
  }

  window.SUPA = {
<<<<<<< HEAD
    // 从云端拉全部
    load: function(){
      return supa('entries?select=id,text,date,time,source,tags,images&order=date.desc');
    },
    // 新增
    insert: function(entry){
      return supa('entries', {method:'POST', body: JSON.stringify([entry]), headers:{'Prefer':'return=representation'}});
    },
    // 更新
    update: function(id, entry){
      return supa('entries?id=eq.' + id, {method:'PATCH', body: JSON.stringify(entry)});
    },
    // 删除
    remove: function(id){
      return supa('entries?id=eq.' + id, {method:'DELETE'});
    },
    // 批量导入（首次迁移）
=======
    load: function(){
      return supa('entries?select=id,text,date,time,source,tags,images&order=date.desc');
    },
    insert: function(entry){
      return supa('entries', {method:'POST', body: JSON.stringify([entry]), headers:{'Prefer':'return=representation'}});
    },
    update: function(id, entry){
      return supa('entries?id=eq.' + id, {method:'PATCH', body: JSON.stringify(entry)});
    },
    remove: function(id){
      return supa('entries?id=eq.' + id, {method:'DELETE'});
    },
>>>>>>> 44fe272 (connect supabase)
    bulkInsert: function(entries){
      return supa('entries', {method:'POST', body: JSON.stringify(entries), headers:{'Prefer':'return=minimal'}});
    }
  };
<<<<<<< HEAD

  // 首次：如果云端为空，把本地 archive-data.js + synced-data.js 的数据迁上去
  window.SUPA_MIGRATE = function(){
    return window.SUPA.load().then(function(rows){
      if(rows.length > 0) return rows;
      // 空的，迁移
      var local = (window.ARCHIVE_DATA || []).slice();
      // 加上 synced
      var synced = window.SYLVAN_SYNCED || {notes:[], poems:[]};
      function cdate(s){var m=(s||'').split('.');if(m.length!==3)return{iso:'',time:''};return{iso:m[0]+'-'+m[1]+'-'+m[2],time:m[0]+'年'+parseInt(m[1],10)+'月'+parseInt(m[2],10)+'日'};}
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
=======
>>>>>>> 44fe272 (connect supabase)
})();
