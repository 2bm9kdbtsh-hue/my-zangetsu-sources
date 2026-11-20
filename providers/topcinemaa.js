var BASE_URL = "https://topcinemaa.one";
var SOURCE_ID = "topcinemaa";
var UA = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";
function getInfo(){return {name:"Top Cinema",lang:"ar",baseUrl:BASE_URL,type:"movie",version:"1.1.0"};}
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
function attr(tag,name){var m=String(tag||"").match(new RegExp("(?:^|\\s)"+name+"\\s*=\\s*[\"']([^\"']*)[\"']","i"));return m?decodeText(m[1]):"";}
function isMovieTitle(t){return !!t&&!/(?:مسلسل|انمي|أنمي|الحلقة|الموسم|season|episode|series|\\bS\\d{1,2}E\\d{1,2}\\b)/i.test(t);}
function parseItems(html){
 var out=[],seen={},re=/<a\\b[^>]*>[\\s\\S]*?<\\/a>/gi,m;
 while((m=re.exec(String(html||"")))!==null){
  var block=m[0],open=(block.match(/^<a\\b[^>]*>/i)||[])[0]||"",href=absoluteUrl(attr(open,"href"));
  if(!href||href.indexOf("topcinemaa.one")<0||seen[href]||/\\/category\\/|\\/tag\\/|\\/page\\/|[?&]s=/i.test(href))continue;
  var img=(block.match(/<img\\b[^>]*>/i)||[])[0]||"",title=cleanText(attr(img,"alt")||attr(img,"title"));
  if(!title)title=cleanText((block.match(/<h[1-6]\\b[^>]*>([\\s\\S]*?)<\\/h[1-6]>/i)||[])[1]||"");
  if(!isMovieTitle(title))continue;
  var image=attr(img,"data-src")||attr(img,"data-lazy-src")||attr(img,"src");
  seen[href]=1;out.push({id:href,title:title,url:href,cover:image?absoluteUrl(image):null,type:"movie",sourceId:SOURCE_ID});
  if(out.length>=60)break;
 }
 return out;
}
function search(q,page){if(!q)return Promise.resolve([]);return getPage(BASE_URL+"/?s="+encodeURIComponent(q)+(page&&page>1?"&paged="+page:"")).then(parseItems).catch(function(){return [];});}
function categoryRows(html){
 var rows=[],seen={},re=/<a\\b[^>]*href=["']([^"']+)["'][^>]*>([\\s\\S]*?)<\\/a>/gi,m;
 while((m=re.exec(String(html||"")))!==null){var label=cleanText(m[2]),href=absoluteUrl(m[1]);if(!/^افلام/.test(label)||!href||!/\\/category\\//.test(href)||seen[href])continue;seen[href]=1;rows.push({id:href,title:label});}
 return rows;
}
function getHome(){return getPage(BASE_URL+"/").then(function(html){
 var rows=[{id:"latest",title:"أحدث الأفلام",items:parseItems(html)}],cats=categoryRows(html);
 cats.forEach(function(c){rows.push({id:c.id,title:c.title});});
 return Promise.all(rows.map(function(row){if(row.id==="latest")return Promise.resolve(row);return getPage(row.id).then(function(h){return {id:row.id,title:row.title,items:parseItems(h)};}).catch(function(){return {id:row.id,title:row.title,items:[]};});}));
}).catch(function(){return [];});}
function getHomePage(rowId,page){if(!rowId||rowId==="latest")return Promise.resolve([]);var u=String(rowId)+(page>1?(String(rowId).indexOf("?")>=0?"&":"?")+"paged="+page:"");return getPage(u).then(parseItems).catch(function(){return [];});}
function getDetail(url){return getPage(url).then(function(html){
 var title=(html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)||[])[1]||(html.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i)||[])[1]||"";
 var cover=(html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)||[])[1]||"",desc=(html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)||[])[1]||"";
 var watch="",re=/<a\\b[^>]*href=["']([^"']+)["'][^>]*>([\\s\\S]*?)<\\/a>/gi,m;
 while((m=re.exec(html))!==null){var label=cleanText(m[2]),href=absoluteUrl(m[1],url);if(href&&(/مشاهدة الان|الذهاب لصفحة المشاهدة|watch/i.test(label))&&!/تحميل|download/i.test(label)){watch=href;break;}}
 if(!watch)watch=absoluteUrl(url.replace(/\\/$/,"")+"/watch/");
 return {id:url,title:cleanText(title),url:url,cover:cover?absoluteUrl(cover):null,description:cleanText(desc),genres:[],type:"movie",sourceId:SOURCE_ID,episodes:watch?[{id:"movie",number:1,title:"مشاهدة الفيلم",url:watch,type:"movie",sourceId:SOURCE_ID}]:[]};
});}
function getEpisodes(url){return getDetail(url).then(function(d){return d.episodes||[];}).catch(function(){return [];});}
function getVideoSources(episodeUrl){return getPage(episodeUrl).then(function(html){
 var embeds=[],seen={},re=/<iframe\\b[^>]*(?:src|data-src)=["']([^"']+)["'][^>]*>/gi,m;
 while((m=re.exec(html))!==null){var u=absoluteUrl(m[1],episodeUrl);if(u&&!seen[u]){seen[u]=1;embeds.push(u);}}
 var dr=/(?:data-src|data-embed|player_url)\\s*=\\s*["']([^"']+)["']/gi,dm;
 while((dm=dr.exec(html))!==null){var du=absoluteUrl(dm[1],episodeUrl);if(du&&!seen[du]&&/^https?:/i.test(du)){seen[du]=1;embeds.push(du);}}
 if(!embeds.length)throw new Error("Top Cinema: watch page returned no embed");
 if(typeof extractVideo!=="function")throw new Error("Top Cinema: extractor unavailable");
 return Promise.all(embeds.slice(0,8).map(function(embed){return Promise.resolve(extractVideo(embed,{headers:{Referer:absoluteUrl(episodeUrl)}})).catch(function(){return []});})).then(function(groups){
  var out=[],urls={};groups.forEach(function(g){if(!Array.isArray(g))g=g?[g]:[];g.forEach(function(s){if(s&&s.url&&!urls[s.url]){urls[s.url]=1;out.push(s);}});});
  if(!out.length)throw new Error("Top Cinema: no playable stream extracted");return out;
 });
});}
