/* Supabase 同步：打开 archive 时自动从云端读数据，编辑/删除写回 */
(function(){
  var SUPA_URL='https://addjmwpaeitccrhlarko.supabase.co';
  var SUPA_KEY='sb_publishable_4QJlJpLIbmcrolCaFJuDzA_6Ws2jeJk';

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
    load: function(){
      return supa('entries?select=id,text,date,time,source,tags,images&deleted=eq.false&order=date.desc,id.desc');
    },
    insert: function(entry){
      return supa('entries', {method:'POST', body: JSON.stringify([entry]), headers:{'Prefer':'return=representation'}});
    },
    update: function(id, entry){
      return supa('entries?id=eq.' + id, {method:'PATCH', body: JSON.stringify(entry)});
    },
    remove: function(id){
      return supa('entries?id=eq.' + id, {method:'PATCH', body: JSON.stringify({deleted:true})});
    },
    bulkInsert: function(entries){
      return supa('entries', {method:'POST', body: JSON.stringify(entries), headers:{'Prefer':'return=minimal'}});
    }
  };

  window.SUPA_MIGRATE = function(){
    return window.SUPA.load().then(function(rows){
      if(rows.length > 0) return rows;
      var local = (window.ARCHIVE_DATA || []).slice();
      var synced = window.SYLVAN_SYNCED || {notes:[], poems:[]};
      function cdate(s){var m=(s||'').split('.');if(m.length!==3)return{iso:'',time:''};return{iso:m[0]+'-'+m[1]+'-'+m[2],time:m[0]+'年'+parseInt(m[1],10)+'月'+parseInt(m[2],10)+'日'};}
      (synced.notes||[]).forEach(function(n){
        var d=cdate(n.date);
        local.push({date:d.iso,time:d.time,source:'本子',text:((n.title||'')+'\n'+(n.body||'')).trim(),tags:n.arcTags||['日记'],images:n.images||[]});
      });
      (synced.poems||[]).forEach(function(p){
        local.push({date:'',time:'',source:'本子',text:(p.lines||[]).join('\n'),tags:['俳句'],images:[]});
      });
      var batches = [];
      for(var i=0;i<local.length;i+=100){
        batches.push(window.SUPA.bulkInsert(local.slice(i,i+100)));
      }
      return Promise.all(batches).then(function(){ return local; });
    });
  };
})();