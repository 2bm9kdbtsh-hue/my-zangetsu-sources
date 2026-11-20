var BASE_URL = "https://topcinemaa.one";
var SOURCE_ID = "topcinemaa";
var UA = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";
function getInfo(){return {name:"Top Cinema",lang:"ar",baseUrl:BASE_URL,type:"movie",version:"1.3.3"};}
function absoluteUrl(url,base){
 if(!url)return ""; url=String(url).trim();
 if(/^(?:javascript:|mailto:|#)/i.test(url))return "";
 if(url.indexOf("//")===0)return "https:"+url;
 if(/^https?:\/\//i.test(url))return url;
 return (base||BASE_URL)+(url.charAt(0)==="/ "?"":url.charAt(0)==="/"?"":"/")+url;
}
function decodeText(v){return String(v||"").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#0*39;|&#8217;|&apos;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&#(\d+);/g,function(_,n){return String.fromCharCode(+n);}).replace(/&#x([\da-f]+);/gi,function(_,n){return String.fromCharCode(parseInt(n,16));});}
function cleanText(v){return decodeText(String(v||"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ")).replace(/\s+/g," ").trim();}
function getPage(url,ref){return fetch(absoluteUrl(url),{headers:{"User-Agent":UA,"Referer":ref||BASE_URL+"/"}}).then(function(r){if(!r||(r.status&&r.status>=400))throw new Error("HTTP "+(r&&r.status));if(typeof r.text==="function")return r.text();return typeof r.text==="string"?r.text:(r.body||"");});}
function attr(tag,name){
 var re=/([a-z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi,m,want=String(name||"").toLowerCase();
 while((m=re.exec(String(tag||"")))!==null){if(String(m[1]).toLowerCase()===want)return decodeText(m[2]!==undefined?m[2]:m[3]);}
 return "";
}function isMovieTitle(t){return !!t&&!/(?:مسلسل|انمي|أنمي|الحلقة|الموسم|season|episode|series|\bS\d{1,2}E\d{1,2}\b)/i.test(t);}
function parseItems(html){
 var out=[],seen={},re=/<a\b[^>]*>[\s\S]*?<\/a>/gi,m;
 while((m=re.exec(String(html||"")))!==null){
  var block=m[0],open=(block.match(/^<a\b[^>]*>/i)||[])[0]||"",href=absoluteUrl(attr(open,"href"));
  if(!href||!/topcinemaa\.one/i.test(href)||seen[href]||/\/(?:category|tag|page|watch|download)\//i.test(href)||/[?&]s=/i.test(href))continue;
  var img=(block.match(/<img\b[^>]*>/i)||[])[0]||"",title=cleanText(attr(open,"title")||attr(img,"alt")||attr(img,"title"));
  if(!title)title=cleanText((block.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i)||[])[1]||"");
  if(!title)title=cleanText(block);
  if(!title||!isMovieTitle(title)||!/(?:فيلم|movie|\b(?:19|20)\d{2}\b)/i.test(title))continue;
  var image=attr(img,"data-src")||attr(img,"data-lazy-src")||attr(img,"data-original")||attr(img,"src");
  seen[href]=1;out.push({id:href,title:title,url:href,cover:image?absoluteUrl(image):null,type:"movie",sourceId:SOURCE_ID});
  if(out.length>=80)break;
 }
 return out;
}function search(q,page){if(!q)return Promise.resolve([]);return getPage(BASE_URL+"/?s="+encodeURIComponent(q)+(page&&page>1?"&paged="+page:"")).then(parseItems).catch(function(){return [];});}
function categoryRows(html){
 var rows=[],seen={},re=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,m;
 while((m=re.exec(String(html||"")))!==null){
  var label=cleanText(m[2]).replace(/[\s⭐]+$/,""),norm=label.replace(/[أإآ]/g,"ا"),href=absoluteUrl(m[1]);
  if(!/^(?:افلام|الافلام)/.test(norm)||/انمي/.test(norm)||!href||!/\/category\//i.test(href)||seen[href])continue;
  seen[href]=1;rows.push({id:href,title:label});
 }
 return rows;
}function getHome(){
 return getPage(BASE_URL+"/").then(function(html){
  var rows=[{id:"latest",title:"أحدث الأفلام",items:parseItems(html)}],cats=categoryRows(html);
  return Promise.all(rows.concat(cats).map(function(row){
   if(row.id==="latest")return Promise.resolve(row);
   return getPage(row.id).then(function(h){return {id:row.id,title:row.title,items:parseItems(h)};})
    .catch(function(){return {id:row.id,title:row.title,items:[]};});
  }));
 }).catch(function(){return [];});
}function getHomePage(rowId,page){
 if(!rowId||rowId==="latest")return getPage(BASE_URL+"/").then(parseItems).catch(function(){return [];});
 var u=String(rowId);if(page>1)u+=(u.indexOf("?")>=0?"&":"?")+"paged="+page;
 return getPage(u).then(parseItems).catch(function(){return [];});
}function getDetail(url){return getPage(url).then(function(html){
 var title=(html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)||[])[1]||(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||"";
 var cover=(html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)||[])[1]||"",desc=(html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)||[])[1]||"";
 var watch="",re=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,m;
 while((m=re.exec(html))!==null){var label=cleanText(m[2]),href=absoluteUrl(m[1],url);if(href&&(/مشاهدة الان|الذهاب لصفحة المشاهدة|watch/i.test(label))&&!/تحميل|download/i.test(label)){watch=href;break;}}
 if(!watch)watch=absoluteUrl(url.replace(/\/$/,"")+"/watch/");
 return {id:url,title:cleanText(title),url:url,cover:cover?absoluteUrl(cover):null,description:cleanText(desc),genres:[],type:"movie",sourceId:SOURCE_ID,episodes:watch?[{id:"movie",number:1,title:"مشاهدة الفيلم",url:watch,type:"movie",sourceId:SOURCE_ID}]:[]};
});}
function getEpisodes(url){return getDetail(url).then(function(d){return d.episodes||[];}).catch(function(){return [];});}
function mediaUrls(data,base){
 var out=[],seen={};
 function walk(v,depth){
  if(depth>6||v==null)return;
  if(typeof v==="string"){
   var s=v.trim();
   if(/^https?:\/\//i.test(s)&&/(?:\.m3u8(?:[?#]|$)|\.mp4(?:[?#]|$)|\.m4v(?:[?#]|$)|\.mpd(?:[?#]|$))/i.test(s)){
    var u=absoluteUrl(s,base);if(u&&!seen[u]){seen[u]=1;out.push(u);}
   }
   return;
  }
  if(Array.isArray(v)){v.forEach(function(x){walk(x,depth+1);});return;}
  if(typeof v==="object"){
   ["file","url","src","source","sources","links","data","result","playlist"].forEach(function(k){if(v[k]!=null)walk(v[k],depth+1);});
  }
 }
 walk(data,0);return out;
}
function resolveVideoTube(embedUrl,episodeUrl){
 var origin=(String(embedUrl).match(/^(https?:\/\/[^/]+)/i)||[])[1]||"";
 if(!origin)return Promise.resolve([]);
 return fetch(embedUrl,{headers:{"User-Agent":UA,"Referer":episodeUrl||BASE_URL+"/","Accept":"text/html,application/xhtml+xml"},browser:true})
  .then(function(r){if(!r||r.status>=400)throw new Error("VideoTube embed HTTP "+(r&&r.status));return r.text();})
  .then(function(html){
   var id=(String(html).match(/data-id\s*=\s*["'](\d+)["']/i)||String(html).match(/(?:video|file|stream)[_-]?id\s*[:=]\s*["']?(\d+)/i)||[])[1];
   if(!id)throw new Error("VideoTube: numeric data-id not found");
   function request(path){
    return fetch(origin+path,{headers:{"User-Agent":UA,"Referer":embedUrl,"Origin":origin,"X-Requested-With":"XMLHttpRequest","Accept":"application/json, text/plain, */*"},browser:true})
     .then(function(r){if(!r||r.status>=400)throw new Error("VideoTube API HTTP "+(r&&r.status));return r.json();})
     .then(function(data){
      var urls=mediaUrls(data,origin);
      if(!urls.length)throw new Error("VideoTube API returned no media URL");
      return urls.map(function(u){return {url:u,quality:"Auto",container:/\.m3u8(?:[?#]|$)/i.test(u)?"hls":/\.mp4(?:[?#]|$)/i.test(u)?"mp4":"unknown",headers:{"Referer":embedUrl,"Origin":origin},label:"VideoTube"};});
     });
   }
   return request("/stream/getSourcesNew?id="+encodeURIComponent(id))
    .catch(function(){return request("/stream/getSources?id="+encodeURIComponent(id)+"&type=sub");});
  });
}
function getVideoSources(episodeUrl){
 return getPage(episodeUrl).then(function(html){
  var candidates=[],seen={},failures=[];
  function add(raw,origin){
   if(!raw)return;
   var value=decodeText(String(raw)).split("\\/").join("/").replace(/\\u0026/gi,"&").trim();
   value=value.replace(/^["']|["']$/g,"");
   var u=absoluteUrl(value,episodeUrl);
   if(!u||!/^https?:/i.test(u)||seen[u]||/topcinemaa\.one\/(?:watch|download)\//i.test(u))return;
   var host=(u.match(/^https?:\/\/([^/:?#]+)/i)||[])[1]||"";
   if(!host||/^(?:www\.)?topcinemaa\.one$/i.test(host))return;
   if(!/(?:vidtube|megaplay|dood|ok\.ru|mp4upload|streamlare|filelions|updown|byse|streamtape|lulu)/i.test(host))return;
   seen[u]=1;candidates.push({url:u,origin:origin||"page"});
  }
  var tagRe=/<(?:iframe|a|button|source|div|li)\b[^>]*>/gi,tm;
  while((tm=tagRe.exec(String(html||"")))!==null){
   var tag=tm[0],attrs=/([a-z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,am;
   while((am=attrs.exec(tag))!==null){
    var key=String(am[1]).toLowerCase(),val=am[2]!==undefined?am[2]:am[3]!==undefined?am[3]:am[4];
    if(/^(?:src|href|data-src|data-embed|data-url|data-link|data-href|data-server|data-iframe|data-player|player_url)$/i.test(key))add(val,key);
    if(key==="onclick"){
     var clickUrls=String(val||"").match(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'<>)]*/gi)||[];
     clickUrls.forEach(function(x){add(x,"onclick");});
    }
   }
  }
  var urlRe=/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}(?:\/[^"'\s<>)]*)?/gi,um;
  while((um=urlRe.exec(String(html||"")))!==null)add(um[0],"inline-script");
  if(!candidates.length)throw new Error("Top Cinema: no supported server URLs found in watch page");
  if(typeof console!=="undefined"&&console.log)console.log("Top Cinema servers discovered",candidates.map(function(x){return x.url;}));
  var jobs=candidates.slice(0,24).map(function(item){
   var u=item.url,host=(u.match(/^https?:\/\/([^/:?#]+)/i)||[])[1]||"";
   if(/(?:vidtube|megaplay)/i.test(host)){
    return resolveVideoTube(u,episodeUrl).catch(function(e){failures.push(host+": "+String(e));if(typeof console!=="undefined"&&console.warn)console.warn("VideoTube resolution failed",String(e));return [];});
   }
   if(typeof extractVideo==="function")return Promise.resolve(extractVideo(u,{headers:{"Referer":absoluteUrl(episodeUrl)}})).catch(function(e){failures.push(host+": "+String(e));return [];});
   failures.push(host+": no extractor runtime");return Promise.resolve([]);
  });
  return Promise.all(jobs).then(function(groups){
   var out=[],urls={};groups.forEach(function(g){if(!Array.isArray(g))g=g?[g]:[];g.forEach(function(s){if(s&&s.url&&!urls[s.url]){urls[s.url]=1;out.push(s);}});});
   if(!out.length)throw new Error("Top Cinema: no playable server. Tried "+candidates.length+" URL(s): "+failures.join(" | ").slice(0,900));
   return out;
  });
 });
}