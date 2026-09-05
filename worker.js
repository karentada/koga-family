const MODEL = "gpt-5.6-luna";

const SYSTEM_PROMPT = `あなたは「家族のことを整理するAI」の記録整理アシスタントです。
このシステムは高齢の家族の医療・介護・予定・To Do・生活記録を整理するために使います。

基本原則:
- 日本語で、短く、やさしく、1回に1問だけ質問する。
- ユーザーが言った事実を整理する。推測で事実を補わない。
- 医療上の診断、原因、薬の変更を推測・指示しない。
- 「重要」「大事」だけでは緊急度を上げない。必要なら重要の意味を確認する。
- 対象（父/母/父と母/その他）は、明らかに見えても保存前には確認対象として返す。
- 日付は「今日」「昨日」などの原文を保持し、サーバー側で勝手に日付を創作しない。ユーザーが明示した相対日付は date_phrase に入れる。
- カテゴリは複数選択できる。候補を複数返してよい。
- 不明な情報は null または「不明」とし、勝手に埋めない。
- 保存、予定変更、To Do確定、アーカイブ、削除、外部連絡などの実行はこのAPIでは行わない。提案・整理だけを返す。
- 「分からない」は正当な状態として扱う。
- 一つの発言に複数の話題がある場合は topics に分ける。

カテゴリ候補:
病院・医療 / 介護 / 薬・服薬 / 気になる行動 / 予定・予約 / To Do / 連絡・電話 / 次回伝えること / 書類・手続き / お金・契約 / その他

返答は必ずJSONのみ。次の形:
{
  "intent": "record|search|schedule|todo|contact|next_to_tell|emergency|other",
  "target": "父|母|父と母|その他|不明",
  "date_phrase": "今日|昨日|YYYY-MM-DD|その他の表現|null",
  "time_phrase": "HH:MM|時間不明|その他の表現|null",
  "tags": ["カテゴリ"],
  "summary": "事実を変えない短い整理",
  "topics": ["話題1", "話題2"],
  "needs_questions": true,
  "questions": ["次に確認する質問"],
  "suggestions": ["保存前に役立つ提案"],
  "emergency": false,
  "reason": "判断の根拠を短く。推測なら推測と明記。"
}
questions は原則0または1件。緊急性が疑われる場合は emergency=true とし、記録整理より安全確認を優先する。ただし診断はしない。`;

const HTML = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>家族のことを整理するAI</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f6f7f9;color:#20242a;font-family:-apple-system,BlinkMacSystemFont,"Noto Sans JP","Yu Gothic",sans-serif}.app{max-width:760px;margin:auto;min-height:100vh;background:#fff;box-shadow:0 0 18px #00000010}header{padding:18px 20px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:#fff;z-index:5}h1{font-size:20px;margin:0 0 4px}.sub{font-size:12px;color:#6b7280}main{padding:20px}.home-title{font-size:25px;font-weight:700;margin:10px 0 18px}button{border:1px solid #d1d5db;background:#fff;border-radius:12px;padding:12px 14px;font-size:15px;cursor:pointer}button.primary{background:#111827;color:#fff;border-color:#111827}.buttons{display:flex;gap:10px;flex-wrap:wrap}textarea,input{width:100%;border:1px solid #d1d5db;border-radius:12px;padding:13px;font:inherit}textarea{min-height:100px;resize:vertical}.card{border:1px solid #e5e7eb;border-radius:16px;padding:16px;margin:12px 0}.section{margin:22px 0}.label{font-size:12px;color:#6b7280;margin-bottom:5px}.item{padding:12px 0;border-bottom:1px solid #eee}.item:last-child{border-bottom:0}.badge{display:inline-block;padding:4px 8px;border-radius:999px;background:#f0f2f5;font-size:12px;margin:3px}.notice{background:#f8fafc;border-left:4px solid #6b7280;padding:12px;border-radius:8px}.muted{color:#6b7280}.danger{border-left-color:#b91c1c;background:#fef2f2}.small{font-size:13px}.tagbtn.selected{background:#111827;color:#fff;border-color:#111827}.loading{padding:20px;text-align:center;color:#6b7280}.error{background:#fef2f2;border-left:4px solid #b91c1c;padding:12px;border-radius:8px}
</style></head><body><div class="app"><header><h1>家族のことを整理するAI</h1><div class="sub">父・母の予定、記録、やることを一緒に整理します</div></header><main id="app"></main></div><button id="back" style="position:fixed;right:16px;bottom:16px;z-index:10" onclick="home()">最初に戻る</button>
<script>
const initial={records:[{date:"2026-09-01",target:"父",tags:["病院・医療"],text:"倉敷中央病院で検査結果の説明。消化器内科・石原裕基先生。"},{date:"2026-08-24",target:"父",tags:["病院・医療"],text:"倉敷中央病院で検査。朝の服薬について事前指示あり。"},{date:"2026-09-02",target:"父と母",tags:["介護"],text:"早島町地域包括支援センターへ連絡。15:30 オノ ケイコさんが訪問。介護保険申請書を提出。"},{date:"2026-09-04",target:"父と母",tags:["介護"],text:"14:30 ウノさんが訪問。「視察」。詳細は未確認。"}],appointments:[{date:"2026-09-16",time:"09:00",target:"母",hospital:"竜操整形外科病院",purpose:"受診",status:"予定"},{date:"2026-10-05",time:"10:30",target:"母",hospital:"倉敷中央病院",purpose:"歯科 術前外来",status:"予定"},{date:"2026-10-07",time:"09:00",target:"母",hospital:"倉敷中央病院",purpose:"外科系検査",status:"予定"},{date:"2026-10-15",time:"08:30",target:"母",hospital:"倉敷中央病院",purpose:"麻酔科 術前外来",status:"予定"},{date:"2026-10-15",time:"10:15",target:"母",hospital:"倉敷中央病院",purpose:"入院説明",status:"予定"}],todos:[{text:"包括支援センターの9/2・9/4の訪問内容を詳しく記録する",target:"父と母",status:"未着手",deadline:""},{text:"父の7/21の倉敷中央病院受診内容を確認する",target:"父",status:"確認待ち",deadline:""},{text:"父の7/28の倉敷中央病院受診内容を確認する",target:"父",status:"確認待ち",deadline:""},{text:"母の退院日を確認する",target:"母",status:"確認待ち",deadline:""}]};
let state=JSON.parse(localStorage.getItem("carebot")||"null")||initial;function save(){localStorage.setItem("carebot",JSON.stringify(state))}function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]))}
function home(){document.getElementById("app").innerHTML='<div class="home-title">何をしたいですか？</div><div class="buttons"><button class="primary" onclick="recordFlow()">記録する</button><button onclick="confirmFlow()">確認する</button></div><div class="section"><div class="label">自由に話してください</div><textarea id="free" placeholder="例：父の病院のことを記録したい\n例：9月の予定を見せて\n例：まだ終わっていないことは？"></textarea><button class="primary" style="margin-top:10px" onclick="freeInput()">送る</button></div><div class="section card"><div class="label">今確認すること</div><div class="item">母の退院日 <span class="badge">確認待ち</span></div><div class="item">9月16日 9:00 竜操整形外科病院</div></div>'}
function recordFlow(){document.getElementById("app").innerHTML='<h2>どんな内容ですか？</h2><textarea id="recordText" placeholder="そのまま話してください。例：昨日、父が薬を飲んだあと5分くらいでまた飲んだ"></textarea><div class="buttons" style="margin-top:10px"><button class="primary" onclick="structureRecord()">次へ</button></div>'}
async function structureRecord(){const text=document.getElementById("recordText").value.trim();if(!text)return alert("内容を入力してください");document.getElementById("app").innerHTML='<div class="loading">AIが内容を整理しています…</div>';try{const ai=await callAI(text);window.pending={text,target:ai.target&&ai.target!=="不明"?ai.target:"",date:ai.date_phrase||"",time:ai.time_phrase||"",tags:Array.isArray(ai.tags)?ai.tags:[],summary:ai.summary||text,ai};targetStep()}catch(e){document.getElementById("app").innerHTML='<div class="error">AIに接続できませんでした。Cloudflare WorkerにOPENAI_API_KEYが設定されているか確認してください。</div><button style="margin-top:10px" onclick="recordFlow()">戻る</button>'}}
function targetStep(){const suggested=window.pending.target?'<div class="notice">AIの候補：<b>'+esc(window.pending.target)+'</b><br><span class="small">保存前に確認してください。</span></div>':'';document.getElementById("app").innerHTML='<h2>誰のことですか？</h2>'+suggested+'<div class="buttons">'+["父","母","父と母","その他"].map(x=>'<button onclick="pickTarget(\''+x+'\')">'+x+'</button>').join("")+'</div>'}
function pickTarget(x){window.pending.target=x;dateStep()}
function dateStep(){document.getElementById("app").innerHTML='<h2>いつのことですか？</h2><div class="notice">AIが整理した日時：<b>'+esc(window.pending.date||"不明")+'</b>'+(window.pending.time?'<br>時間：'+esc(window.pending.time):'')+'<br><span class="small">違っていれば選び直してください。</span></div><div class="buttons"><button onclick="pickDate(\'今日\')">今日</button><button onclick="pickDate(\'昨日\')">昨日</button><button onclick="pickDate(\'その他\')">その他（選択）</button><button onclick="pickDate(\'不明\')">分からない</button></div>'}
function pickDate(x){window.pending.date=x;if(x==='その他'){document.getElementById("app").innerHTML='<h2>日付を選んでください</h2><input type="date" id="customDate"><button class="primary" style="margin-top:10px" onclick="customDate()">次へ</button>'}else tagStep()}
function customDate(){const d=document.getElementById("customDate").value;if(!d)return;window.pending.date=d;tagStep()}
const TAGS=["病院・医療","介護","薬・服薬","気になる行動","予定・予約","To Do","連絡・電話","次回伝えること","書類・手続き","お金・契約","その他"];
function tagStep(){const selected=new Set(window.pending.tags||[]);document.getElementById("app").innerHTML='<h2>カテゴリを選んでください</h2><div class="muted small">複数選択できます。AIの候補があれば選択済みになっています。</div><div class="buttons" style="margin-top:12px">'+TAGS.map(t=>'<button class="tagbtn '+(selected.has(t)?'selected':'')+'" data-tag="'+esc(t)+'" onclick="toggleTag(this)">'+t+'</button>').join("")+'</div><div class="buttons" style="margin-top:14px"><button class="primary" onclick="finishTags()">次へ</button></div>'}
function toggleTag(btn){btn.classList.toggle('selected')}
function finishTags(){const tags=[...document.querySelectorAll('.tagbtn.selected')].map(b=>b.dataset.tag);if(!tags.length)return alert('カテゴリを1つ以上選んでください');window.pending.tags=tags;confirmRecord()}
function confirmRecord(){const p=window.pending;document.getElementById("app").innerHTML='<h2>この内容で記録しますか？</h2><div class="card"><div class="label">日時</div><div>'+esc(p.date||"不明")+(p.time&&p.time!=="時間不明"?' '+esc(p.time):'')+'</div><div class="label" style="margin-top:10px">対象</div><div>'+esc(p.target)+'</div><div class="label" style="margin-top:10px">カテゴリ</div><div>'+p.tags.map(t=>'<span class="badge">'+esc(t)+'</span>').join('')+'</div><div class="label" style="margin-top:10px">AIによる整理</div><div>'+esc(p.summary)+'</div><div class="label" style="margin-top:10px">元の話</div><div>'+esc(p.text)+'</div></div><div class="buttons"><button class="primary" onclick="saveRecord()">記録する</button><button onclick="tagStep()">修正する</button></div>'}
function saveRecord(){const p=window.pending;state.records.unshift({date:p.date,target:p.target,tags:p.tags,text:p.text,summary:p.summary});save();window.pending=null;document.getElementById("app").innerHTML='<div class="notice"><strong>記録しました。</strong></div><div class="card">元の話とAIが整理した内容の両方を残しています。</div>'}
function confirmFlow(){document.getElementById("app").innerHTML='<h2>どうやって確認しますか？</h2><div class="buttons"><button class="primary" onclick="askFlow()">AIの質問に答える</button><button onclick="showAll()">自分の言葉で説明する</button></div>'}
function askFlow(){document.getElementById("app").innerHTML='<h2>何を確認したいですか？</h2><div class="buttons"><button onclick="showAppts()">予定・予約</button><button onclick="showTodos()">やること</button><button onclick="askFree()">記録</button><button onclick="askFree()">その他</button></div>'}
function askFree(){document.getElementById("app").innerHTML='<h2>何を知りたいですか？</h2><textarea id="q" placeholder="例：父の薬について今まで何があった？"></textarea><button class="primary" style="margin-top:10px" onclick="freeInput(true)">確認する</button>'}
function showAppts(){let a=[...state.appointments].sort((x,y)=>(x.date+x.time).localeCompare(y.date+y.time));document.getElementById("app").innerHTML='<h2>これからの予定</h2>'+a.map(x=>'<div class="card"><b>'+esc(x.date)+' '+esc(x.time)+'</b><br>'+esc(x.target)+'　'+esc(x.hospital)+'<br><span class="muted">'+esc(x.purpose)+'</span></div>').join('')}
function showTodos(){const active=state.todos.filter(x=>x.status!=="完了");document.getElementById("app").innerHTML='<h2>やること</h2>'+active.map(x=>'<div class="card">'+esc(x.text)+' <span class="badge">'+esc(x.status)+'</span></div>').join('')}
function showRecords(){document.getElementById("app").innerHTML='<h2>記録</h2>'+state.records.slice(0,20).map(x=>'<div class="card"><b>'+esc(x.date)+'</b>　'+esc(x.target)+'　'+(x.tags||[x.tag||"その他"]).map(t=>'<span class="badge">'+esc(t)+'</span>').join('')+'<br>'+esc(x.summary||x.text)+'</div>').join('')}
function showAll(){document.getElementById("app").innerHTML='<h2>現在の状況</h2><div class="card"><b>近日の予定</b><div class="item">9/16 9:00　母　竜操整形外科病院</div></div><div class="card"><b>確認が必要なこと</b>'+state.todos.filter(x=>x.status==="確認待ち").map(x=>'<div class="item">'+esc(x.text)+'</div>').join('')+'</div>'}
async function freeInput(fromQ=false){const el=document.getElementById(fromQ?'q':'free');const q=(el?.value||'').trim();if(!q)return;document.getElementById('app').innerHTML='<div class="loading">AIが確認しています…</div>';try{const ai=await callAI(q);if(ai.intent==='schedule'||/予定|予約/.test(q))return showAppts();if(ai.intent==='todo'||/やること|todo|To Do|終わってない|未完了/.test(q))return showTodos();if(ai.intent==='record'||/記録|今まで|経過/.test(q)){return showRecords()}document.getElementById('app').innerHTML='<h2>AIの整理</h2><div class="card"><div class="label">回答</div><div>'+esc(ai.summary||'今の情報だけでは判断できません。')+'</div><div class="label" style="margin-top:10px">根拠</div><div class="small muted">'+esc(ai.reason||'')+'</div></div>'}catch(e){document.getElementById('app').innerHTML='<div class="error">AIに接続できませんでした。OPENAI_API_KEYの設定を確認してください。</div>'}}
async function callAI(text){const r=await fetch('/api/interpret',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});if(!r.ok)throw new Error('API '+r.status);return r.json()}
home();
</script></body></html>`;

function corsHeaders() {
  return {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type","Access-Control-Allow-Methods":"POST,OPTIONS"};
}

async function interpret(request, env) {
  if (!env.OPENAI_API_KEY) return new Response(JSON.stringify({error:"OPENAI_API_KEY is not configured"}), {status:500,headers:{"Content-Type":"application/json",...corsHeaders()}});
  let body; try { body=await request.json(); } catch { return new Response(JSON.stringify({error:"Invalid JSON"}),{status:400,headers:{"Content-Type":"application/json",...corsHeaders()}}); }
  const text=String(body?.text||"").trim();
  if(!text) return new Response(JSON.stringify({error:"text is required"}),{status:400,headers:{"Content-Type":"application/json",...corsHeaders()}});
  const schema = {
    type: "object",
    properties: {
      intent: {type: "string", enum: ["record","search","schedule","todo","contact","next_to_tell","emergency","other"]},
      target: {type: "string", enum: ["父","母","父と母","その他","不明"]},
      date_phrase: {type: ["string","null"]},
      time_phrase: {type: ["string","null"]},
      tags: {type: "array", items: {type: "string"}},
      summary: {type: "string"},
      topics: {type: "array", items: {type: "string"}},
      needs_questions: {type: "boolean"},
      questions: {type: "array", items: {type: "string"}},
      suggestions: {type: "array", items: {type: "string"}},
      emergency: {type: "boolean"},
      reason: {type: "string"}
    },
    required: ["intent","target","date_phrase","time_phrase","tags","summary","topics","needs_questions","questions","suggestions","emergency","reason"],
    additionalProperties: false
  };
  const payload = {
    model: MODEL,
    input: [
      {role: "developer", content: [{type: "input_text", text: SYSTEM_PROMPT}]},
      {role: "user", content: [{type: "input_text", text}]}
    ],
    text: {format: {type: "json_schema", name: "carebot_interpretation", strict: true, schema}}
  };
  const resp=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+env.OPENAI_API_KEY},body:JSON.stringify(payload)});
  const raw=await resp.text();
  if(!resp.ok) return new Response(JSON.stringify({error:"OpenAI request failed",detail:raw.slice(0,500)}),{status:502,headers:{"Content-Type":"application/json",...corsHeaders()}});
  let data; try{data=JSON.parse(raw)}catch{return new Response(JSON.stringify({error:"Invalid OpenAI response"}),{status:502,headers:{"Content-Type":"application/json",...corsHeaders()}})}
  let textOut=data.output_text;
  if(!textOut && Array.isArray(data.output)) textOut=data.output.flatMap(x=>x.content||[]).map(x=>x.text||"").join("");
  try { const parsed=JSON.parse(textOut); return new Response(JSON.stringify(parsed),{headers:{"Content-Type":"application/json",...corsHeaders()}}); } catch { return new Response(JSON.stringify({error:"Model did not return valid JSON"}),{status:502,headers:{"Content-Type":"application/json",...corsHeaders()}}); }
}

export default { async fetch(request, env) { const url=new URL(request.url); if(request.method==="OPTIONS") return new Response(null,{headers:corsHeaders()}); if(url.pathname==="/api/interpret" && request.method==="POST") return interpret(request,env); if(url.pathname==="/health") return new Response(JSON.stringify({ok:true,apiConfigured:!!env.OPENAI_API_KEY}),{headers:{"Content-Type":"application/json"}}); return new Response(HTML,{headers:{"Content-Type":"text/html;charset=UTF-8","Cache-Control":"no-store"}}); } };
