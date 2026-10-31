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
    bulkInsert: function(entries){
      return supa('entries', {method:'POST', body: JSON.stringify(entries), headers:{'Prefer':'return=minimal'}});
    }
  };
})();
