const zlib=require("zlib"),dateFormat=require("dateformat"),fs=require("fs"),path=require("path"),crypto=require("crypto"),pako=require("pako"),redis=require("redis"),qs=require("qs"),client=redis.createClient(6379,"0.0.0.0",{return_buffers:!0}),asyncRedis=require("async-redis"),asyncClient=asyncRedis.createClient(6379,"0.0.0.0",{return_buffers:!0}),fetch=require("node-fetch"),db=require("./db.js"),VitalFile=require("./vitaldb.js"),vital_trks=["HR","NIBP_SBP","NIBP_DBP","ART_SBP","ART_DBP","ART_MBP","PLETH_SPO2","BT","BIS","PSI"],ane_trks=["DES_ET_PERC","EXP_DES","SEVO_ET_PERC","EXP_SEVO"],ane_trks_name=["PUMP1_DRUG","PUMP2_DRUG","PUMP3_DRUG","GAS1_AGENT","GAS2_AGENT","AGENT1_NAME","AGENT2_NAME"],ane_trks_ce=["PUMP1_CE","PUMP2_CE","PUMP3_CE","GAS1_EXPIRED","GAS2_EXPIRED","ET_AGENT1","ET_AGENT2"],ane_names=["PROPOFOL","PROP","REMIFENTANIL","REMI","DESFLURANE","DESF","SEVOFLURANE","SEVO"],filt_trks=["abp_hpi","abp_ppv","nirs_cox","pleth_pvi","sv_dlapco"];async function send_data(e,t){try{var i=zlib.inflateSync(Buffer.from(t,"binary")).toString();i.replace("/[\0-]/u",""),i.replace("nan",'""');var r=JSON.parse(i),n=r.vrcode,i=r.ver;void 0!==r.conf&&client.set("vrconf_"+n,r.conf),void 0!==r.info&&client.set("info_"+n,r.info);r=r.rooms;await db.register_bed(n,r),parse_data_by_bed(e,n,i,r)}catch(e){console.log("send_data ERROR",e,t)}}async function parse_data_by_bed(e,t,i,r){var n,s=+new Date/1e3,a=await db.get_admin_id();for(n in client.set("utime_"+t,s),client.set("vrver_"+t,i.toString()),r){r[n].dtserver=s,r[n].vrver=i;var l,c,o,d=r[n].roomname;null!=d&&""!=d&&((o=crypto.createHash("sha1")).update(a+"/"+d),l=o.digest("hex"),c=r[n],null!=(o=await asyncClient.get("filts_"+l))&&(c.filts=JSON.parse(o)),(o=await asyncClient.get("hid:"+d))&&(c.hid=o.toString()),await asyncClient.get("islinux:"+d)&&(c.islinux=!0),send_data_to_bed(e,l,JSON.stringify(c)),client.set("utime_"+l,s),client.set("devs_"+l,JSON.stringify(r[n].devs),"EX",14400),client.set("dtapp_"+l,r[n].dtapp,"EX",14400),c.syslog&&-1<c.syslog.indexOf("cpu usage")&&client.set("islinux:"+d,1,"EX",3600),null!=r[n].filts&&""!=r[n].filts&&client.set("filts_"+l,JSON.stringify(r[n].filts),"EX",14400),d=zlib.gzipSync(JSON.stringify(r[n])),client.set(l+s,d,"EX",14400),client.zadd("dts_"+l,s,s),client.zremrangebyscore("dts_"+l,"-inf",s-14400),client.zadd("utimes",s,l),client.zremrangebyscore("utimes","-inf",s-14400),await get_filter_bed(e,l,r[n].ptcon),"1"==r[n].ptcon?(client.zremrangebyscore("dts_filter_result_"+l,"-inf",s-14400),client.set("ptcon_"+l,1,"EX",300)):(client.exists("ptinfo_"+l,function(e,t){1==t&&client.del("ptinfo_"+l,function(e,t){e&&console.log(e)})}),client.set("ptcon_"+l,0,"EX",300)),get_trd_data(l,c.trks,s))}}const bedFilterTimeList=new Object;var filterList=new Object;async function set_filter_list(){try{(filterList=await db.get_filter_list()).length<=0&&console.log("filterList length <= 0")}catch(e){console.log("set_filter_list : "+e)}}async function get_filter_bed(e,t,i){try{var r=await asyncClient.get("edit_filt_"+t);if(null!=r&&""!=r){if(r=JSON.parse(r),client.set("filts_"+t,JSON.stringify(r.filts)),i)for(var n in null==bedFilterTimeList[t]?bedFilterTimeList[t]=1:bedFilterTimeList[t]=bedFilterTimeList[t]+1,0==filterList.length&&set_filter_list(),r.filts)for(var s in filterList)r.filts[n].modname==filterList[s].modname&&bedFilterTimeList[t]%(filterList[s].interval-Math.ceil(filterList[s].overlap))==0&&send_filter(e,t,filterList[s])}else null!=bedFilterTimeList[t]&&delete bedFilterTimeList[t]}catch(e){console.log("get_filter_bed : "+t+", "+e)}}function filter_track_match(e,t){if(e.includes("ART")){if(!t||!t.montype)return!1;var i=t.montype.split("_");(-1<i[0].indexOf("ABP")||-1<i[0].indexOf("FEM"))&&(t.montype="ART_"+i[1],"wav"==t.type?t.name="ART":t.name="ART_"+i[1])}return e==t.name||e==t.montype?[!0,e,t]:[!1,e,t]}async function send_filter(e,t,i){var r=+new Date/1e3,n=r-i.interval-1,s=await asyncClient.zrangebyscore("dts_"+t,n,r,"limit",0,i.interval);if(s){var a,l=new Object,c=0,o=0;i.interval;for(a in i.inputs){var d,f,_=i.inputs[a].name,u=new Object,p=new Array,c=0,o=0;for(f in s){var m,g=await asyncClient.get(t+s[f]),v=zlib.gunzipSync(new Buffer.from(g)).toString();for(m in(v=JSON.parse(v)).trks)if(filter_track_match(_,v.trks[m])[0])if("wav"==v.trks[m].type){for(var y in 0==f&&(c=v.trks[m].recs[0].dt,u.srate=v.trks[m].srate),v.trks[m].recs[0].val)p.push(v.trks[m].recs[0].val[y]);o=v.trks[m].recs[0].dt}else if("num"==v.trks[m].type)for(var y in v.trks[m].recs)0==c&&(c=v.trks[m].recs[y].dt),o!=v.trks[m].recs[y].dt&&(d=v.trks[m].recs[y].dt-c,p.push(JSON.parse('{"dt":'+d+',"val":'+v.trks[m].recs[y].val+"}"))),o=v.trks[m].recs[y].dt}"wav"==i.inputs[a].type?(u.vals=p,l[_]=u):"num"==i.inputs[a].type&&(l[_]=p)}try{if(o-c>=i.interval){const S=new Object;S.invokeid=t,S.inputs=l,S.interval=o,S.overlap=i.overlap,"sv_dlapco"!=i.modname||null!=(b=await asyncClient.get("ptinfo_"+t))&&(S.options=JSON.parse(b));var b=await db.get_config();const h=await fetch("http://"+b.filter_ip+":"+b.filter_port+"/"+i.modname,{method:"post",body:zlib.gzipSync(JSON.stringify(S)),headers:{"Content-Type":"application/json"}});if("OK"==h.statusText){b=await h.buffer(),b=pako.inflate(b,{to:"string"});if(null!=b&&"null"!=b){const w=new Object;w.filter=i.modname,w.outputs=i.outputs,w.data=JSON.parse(b),e.to(t).emit("recv_filter",zlib.gzipSync('{"'+t+'":'+JSON.stringify(w)+"}"));b=+new Date/1e3;client.set("filter_result_"+t+b,JSON.stringify(w),"EX",14400),client.zadd("dts_filter_result_"+t,b,b)}}}}catch(e){}}}async function get_trd_data(e,t,i){var r=60*Math.floor(i/60),n="trend_"+e+"_"+r,s={vital:{},ane:{},filt:{}},a={};for(p in t){var l,c=t[p];if(!(c.recs.length<1)&&void 0!==c.montype){for(var o in-1<c.montype.indexOf("IABP")&&(c.montype=c.montype.replace("IABP","ART")),vital_trks){var d=vital_trks[o];(-1<c.name.indexOf(d)||-1<c.montype.indexOf(d))&&(s.vital[d]=c.recs[c.recs.length-1].val)}if(ane_trks.includes(c.name))-1<c.name.indexOf("DES")&&(s.ane.DESF=c.recs[c.recs.length-1].val),-1<c.name.indexOf("SEVO")&&(s.ane.SEVO=c.recs[c.recs.length-1].val);else if(-1<(l=ane_trks_name.indexOf(c.name))){var f,_=c.recs[c.recs.length-1].val.toUpperCase();for(f in ane_names){var u=ane_names[f];if(-1<_.indexOf(u)){a[l]=_;break}}}}}if(0<Object.keys(a).length)for(var p in t)(c=t[p]).recs.length<1||-1<(l=ane_trks_ce.indexOf(c.name))&&void 0!==a[l]&&(s.ane[a[l]]=c.recs[c.recs.length-1].val);var m=await asyncClient.zrangebyscore("dts_filter_result_"+e,r,i);for(p in m){var g=m[p],g=await asyncClient.get("filter_result_"+e+g),g=JSON.parse(g);filt_trks.includes(g.filter)&&(s.filt[g.filter]=g)}await asyncClient.set(n,JSON.stringify(s),"EX",21600),client.zadd("dts_trend_result_"+e,r,r),client.zremrangebyscore("dts_trend_result_"+e,"-inf",i-21600)}async function req_cmd(e,t,i){switch((i="object"!=typeof i?qs.parse(i):i).job){case"update_vr":e.to(i.vrcode).emit("update");break;case"del_bed":e.to(i.vrcode).emit("del_bed",i.bedname),await sleep(1e3),await db.del_bed(i),e.to(t).emit("res_cmd",JSON.stringify(i));break;case"del_beds":var r=i.bednames.split(","),n=i.bedids.split(",");for(v in n)(h=JSON.parse(await asyncClient.get("beds:"+n[v]))).bedid=n[v],e.to(h.vrcode).emit("del_bed",h.bedname),await sleep(1e3),await db.del_bed(h);e.to(t).emit("res_cmd",JSON.stringify(i));break;case"del_vr":await db.del_vr(i),e.to(t).emit("res_cmd",JSON.stringify(i));break;case"restart_vr":e.to(i.vrcode).emit("restart");break;case"reboot_vr":e.to(i.vrcode).emit("reboot");break;case"add_evt":e.to(i.vrcode).emit("add_event",i.dt+","+i.msg);break;case"edit_dev":var s={},a=i["dev-setting-vrcode"];for(u in s.bedname=i["dev-setting-bedname"],s.devs=[],i.devices){var l=i.devices[u];"other"==l.port&&(l.port=l.port_other),"ycable"in l?l.ycable="1":l.ycable="0",s.devs.push(l)}e.to(a).emit("edit_bed",JSON.stringify(s));break;case"edit_conf":var a=i["dev-setting-vrcode"],s=i["dev-advanced-setting"],c=i["dev-setting-bedname"],o=i["dev-setting-bedid"];if(1==await asyncClient.scard("vrs:"+a)){var d=s.indexOf("BED/")+4,f=s.indexOf("]",d),f=s.substring(d,f);if(f!=c){console.log("bedname change: "+c+" => "+f);var _=await asyncClient.smembers("beds:share:"+o);(b=crypto.createHash("sha1")).update("admin/"+f);var u,p=b.digest("hex");for(u in _){var m=_[u],g=await asyncClient.get("users:group:"+m+":"+o);g&&client.set("users:group:"+m+":"+p,g);g=await asyncClient.get("users:mode:"+m+":"+o);g&&client.set("users:mode:"+m+":"+p,g)}}}e.to(a).emit("edit_conf",s);break;case"edit_filt":await edit_filt(i),e.to(t).emit("res_cmd",JSON.stringify(i));break;case"edit_filts":var v,r=i.bednames.split(","),y=i.filters.split(",");for(v in r){var b,S=await db.get_admin_id();(b=crypto.createHash("sha1")).update(S+"/"+r[v]);var h,o=b.digest("hex");(h=new Object)["filt-setting-bedid"]=o,h["filt-setting-bedname"]=r[v],h.filters=y,await edit_filt(h),e.to(t).emit("res_cmd",JSON.stringify(i))}}}function sleep(t){return new Promise(e=>{setTimeout(e,t)})}function send_data_to_bed(e,t,i){e.to(t).emit("recv_data",zlib.gzipSync('{"'+t+'":'+i+"}"))}async function req_prev_data(e,t,i,r){if(i=i&&JSON.parse(i)){var n,s=+new Date/1e3,a=new Object;for(n in i){var l=s-10;i[n]&&(l=i[n]);var c=await asyncClient.zrangebyscore("dts_"+n,l,s,"limit",0,10);if(0<c.length){var o,d,f=new Array;for(o in c){const a=await asyncClient.get(n+c[o]);null===a||void 0!==(d=zlib.gunzipSync(new Buffer.from(a)).toString())&&0<d.length&&f.push(d)}a[n]=f}}e.to(t).emit("res_prev_data",zlib.gzipSync(JSON.stringify(a)))}}async function req_bed_status(e,t,i){var r,i=i.split(","),n=new Object;for(r in i){var s=i[r],a=new Object,l=await asyncClient.get("ptcon_"+s);l&&(a.ptcon=l.toString());l=await asyncClient.get("utime_"+s);l&&(a.utime=l.toString()),n[s]=a}e.to(t).emit("res_bed_status",n)}function upload_vital(r,e,t){if(fs.statSync(e).size<=0)return console.log("file size 0. Reupload "+r),"";var i=new Array,n=r.substr(0,r.length-20),s=r.substr(r.length-19,6),a=dateFormat(new Date,"yyyy").substr(0,2)+s.substr(0,4);i.push(t),i.push(t+n+"/"),i.push(t+n+"/"+a+"/"),i.push(t+n+"/"+a+"/"+s+"/");var l,c="";for(l in i){c=i[l];if(!fs.existsSync(c))try{fs.mkdirSync(c)}catch(e){return result}}a=fs.createReadStream(e),s=fs.createWriteStream(c+r);console.log("uploading: "+e+" => "+c+r);var o=a.pipe(s);return new Promise((t,i)=>{o.on("error",function(e){console.log(r+": "+e),t(i)}),o.on("finish",async function(){await new VitalFile(client,c+r,[],!0),fs.existsSync(c+r)&&t("success")})})}function migrate_vital(r,e,t,n){var s=fs.statSync(e);if(s.size<=0)return console.log("file size 0. Reupload "+r),"";var i=new Array,a=r.substr(0,r.length-20),l=r.substr(r.length-19,6),c=dateFormat(new Date,"yyyy").substr(0,2)+l.substr(0,4);i.push(t),i.push(t+a+"/"),i.push(t+a+"/"+c+"/"),i.push(t+a+"/"+c+"/"+l+"/");var o,d="";for(o in i){d=i[o];if(!fs.existsSync(d))try{fs.mkdirSync(d)}catch(e){return result}}if(!n&&fs.existsSync(d+r)&&s.size==fs.statSync(d+r).size)return r+" exists.";c=fs.createReadStream(e),l=fs.createWriteStream(d+r);fs.appendFileSync("progress.txt","uploading: "+e+" => "+d+r+"\n");var f=c.pipe(l);return new Promise((t,i)=>{f.on("error",function(e){console.log(r+": "+e),t(i)}),f.on("finish",async function(){var e=await asyncClient.get("api:filelist:fileinfo:"+r.substr(0,r.length-6));e&&!n?JSON.parse(e).filesize!==s.size&&fs.appendFileSync("res.txt",r+" - realsize: "+s.size+" fileinfo: "+e+"\n"):(fs.appendFileSync("res.txt",r+" - no fileinfo / force parsing"),await new VitalFile(client,d+r,[],!0)),t(r+" success")})})}function checkTime(e){return(e=e<10?"0"+e:e)+""}async function get_hl7_list(){var e,t=+new Date/1e3,i=t-300,r=await asyncClient.smembers("beds"),n=await asyncClient.smembers("hl7"),s="";for(e in r){var a=r[e],l=JSON.parse(await asyncClient.get("beds:"+a));l.group=await asyncClient.get("users:group:"+db.get_admin_id()+":"+a),null==l.group&&(l.group="");var c=await asyncClient.zrangebyscore("dts_"+a,i,t,"limit",0,300),o="",d=(d=await asyncClient.get("hid:"+l.bedname))||"";if(0<c.length){c=c[c.length-1],c=await asyncClient.get(a+c);if(c){var f=zlib.gunzipSync(new Buffer.from(c)).toString();(f=JSON.parse(f)).dtserver&&(o=f.dtserver);var _,u="";for(_ in n){var p,m,g=JSON.parse(n[_]),v=g.vr,y=g.emr;for(p in f.trks)v!=f.trks[p].name||(m=f.trks[p].recs)&&0<m.length&&(u+="OBX||NM|",u+=y+"|0|",u+=f.trks[p].recs[f.trks[p].recs.length-1].val?f.trks[p].recs[f.trks[p].recs.length-1].val+"|":"|",u+=f.trks[p].unit?f.trks[p].unit+"|||||F":"|||||F",u+=String.fromCharCode(10))}""!=u&&(s+=String.fromCharCode(11),s+="MSH|^~&|||||||ORU^R01|VR|P|2.3||||||8859/1",s+=String.fromCharCode(10),s+="PID|||"+d+'^^^^MR||???^""||""|U',s+=String.fromCharCode(10),s+="PV1||I|OR^^OR&"+l.group+"&"+l.bedname,s+=String.fromCharCode(10),s+="OBR|||||||"+((o=new Date(1e3*o)).getFullYear()+""+checkTime(o.getMonth()+1)+checkTime(o.getDate())+checkTime(o.getHours())+checkTime(o.getMinutes())+checkTime(o.getSeconds())),s+=String.fromCharCode(10),s+=u,s+=String.fromCharCode(28)+String.fromCharCode(10))}}}return s}async function upgrade_all_vr(e){var t,i=await asyncClient.smembers("vrs");for(t in i)e.to(i[t]).emit("update")}module.exports={send_data:send_data,upload_vital:upload_vital,migrate_vital:migrate_vital,req_prev_data:req_prev_data,req_bed_status:req_bed_status,req_cmd:req_cmd,set_filter_list:set_filter_list,get_hl7_list:get_hl7_list,upgrade_all_vr:upgrade_all_vr};async function edit_filt(e){var t,i={},r=e["filt-setting-bedid"],n=e.filters,s=await db.get_filter_list();for(t in i.bedname=e["filt-setting-bedname"],i.filts=[],n)for(var a in s)s[a].modname==n[t]&&i.filts.push({modname:n[t],name:s[a].name});client.set("edit_filt_"+r,JSON.stringify(i))}