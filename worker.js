const MODEL = "gpt-5.6-sol";

const SYSTEM_PROMPT = `あなたは「家族のことを整理するAI」の記録整理アシスタントです。
高齢の家族の医療・介護・予定・To Do・生活記録を整理します。

ルール:
- 日本語で簡潔に返す。
- ユーザーの発言を事実として整理し、推測で補わない。
- 医療上の診断、原因断定、薬の変更指示をしない。
- 不明なものは不明のままにする。
- 「重要」「大事」「大切」と言われた場合、それが緊急性を意味するのか、将来必要になる情報なのか、価値のある情報なのかを必要に応じて確認する。
- 予定を新規登録する発言と、予定を見たい質問を区別する。
- 病院、医院、クリニック、施設、役所など、場所や関係先が発言に含まれている場合は place にその名称だけを入れる。
- place に「今日」「明日」「昨日」などの日付表現や、「父」「母」などの対象者を含めない。
- 例：「父、明日田中病院へ行く」なら place は「田中病院」。
- 例：「明日は父を倉敷中央病院に連れて行く」なら place は「倉敷中央病院」。
- 場所が言われていなければ place は null。
- 保存・変更・削除などは実行せず、整理結果だけ返す。
- 一度に確認質問を複数出さず、必要なら1問だけ返す。
- 分からないことを勝手に埋めない。

返答は必ず次のJSON:
{
  "intent":"record|search|schedule|todo|contact|next_to_tell|emergency|other",
  "target":"父|母|父と母|その他|不明",
  "date_phrase":"今日|明日|昨日|YYYY-MM-DD|その他|null",
  "time_phrase":"HH:MM|時間不明|その他|null",
  "place":"病院・施設・場所・関係先の名称|null",
  "tags":["カテゴリ"],
  "summary":"短い整理",
  "needs_questions":true,
  "question":"次に1つだけ確認する質問。不要なら空文字",
  "emergency":false,
  "reason":"判断根拠を短く"
}`;

const HTML = String.raw`<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>家族のことを整理するAI</title>

<style>
*{
  box-sizing:border-box
}

body{
  margin:0;
  background:#f6f7f9;
  color:#20242a;
  font-family:-apple-system,BlinkMacSystemFont,"Noto Sans JP","Yu Gothic",sans-serif
}

.shell{
  max-width:760px;
  margin:auto;
  min-height:100vh;
  background:white
}

header{
  padding:20px;
  border-bottom:1px solid #e5e7eb
}

h1{
  margin:0;
  font-size:23px
}

h2{
  font-size:25px;
  margin:18px 0
}

.sub,
.muted{
  color:#6b7280
}

.small{
  font-size:13px
}

main{
  padding:20px
}

.row{
  display:flex;
  gap:10px;
  flex-wrap:wrap
}

button{
  font:inherit;
  padding:12px 16px;
  border:1px solid #d1d5db;
  border-radius:12px;
  background:white
}

button.primary{
  background:#111827;
  color:#fff;
  border-color:#111827
}

textarea,
input,
select{
  width:100%;
  font:inherit;
  border:1px solid #d1d5db;
  border-radius:12px;
  padding:13px
}

textarea{
  min-height:110px
}

.card{
  border:1px solid #e5e7eb;
  border-radius:16px;
  padding:16px;
  margin:14px 0
}

.label{
  font-size:12px;
  color:#6b7280;
  margin-top:10px
}

.badge{
  display:inline-block;
  background:#f1f3f5;
  border-radius:999px;
  padding:4px 8px;
  margin:3px;
  font-size:12px
}

.notice{
  padding:13px;
  border-left:4px solid #64748b;
  background:#f8fafc;
  border-radius:8px
}

.error{
  padding:13px;
  border-left:4px solid #b91c1c;
  background:#fef2f2;
  border-radius:8px
}

.listItem{
  padding:12px 0;
  border-bottom:1px solid #eee
}

.listItem:last-child{
  border-bottom:0
}

#homeBtn{
  position:fixed;
  right:16px;
  bottom:16px
}
</style>
</head>

<body>

<div class="shell">

<header>
<h1>家族のことを整理するAI</h1>
<div class="sub">父・母の予定、記録、やることを一緒に整理します</div>
</header>

<main id="app">
<div class="notice">画面を準備しています…</div>
</main>

</div>

<button id="homeBtn">最初に戻る</button>

<script>
(function(){

"use strict";

var initial = {

  appointments:[

    {
      date:"2026-09-16",
      time:"09:00",
      target:"母",
      hospital:"竜操整形外科病院",
      purpose:"受診",
      status:"予定"
    },

    {
      date:"2026-10-05",
      time:"10:30",
      target:"母",
      hospital:"倉敷中央病院",
      purpose:"歯科 術前外来",
      status:"予定"
    },

    {
      date:"2026-10-07",
      time:"09:00",
      target:"母",
      hospital:"倉敷中央病院",
      purpose:"外科系検査",
      status:"予定"
    },

    {
      date:"2026-10-15",
      time:"08:30",
      target:"母",
      hospital:"倉敷中央病院",
      purpose:"麻酔科 術前外来",
      status:"予定"
    },

    {
      date:"2026-10-15",
      time:"10:15",
      target:"母",
      hospital:"倉敷中央病院",
      purpose:"入院説明",
      status:"予定"
    }
  ],

  records:[],

  todos:[
    {
      text:"母の退院日を確認する",
      status:"確認待ち"
    }
  ]
};

var state;

try{

  state =
    JSON.parse(
      localStorage.getItem("carebot_v3") || "null"
    ) || initial;

}catch(e){

  state = initial;
}

var app =
  document.getElementById("app");

function esc(v){

  return String(
    v == null ? "" : v
  ).replace(
    /[&<>"']/g,
    function(m){

      return {
        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        '"':"&quot;",
        "'":"&#39;"
      }[m];
    }
  );
}

function save(){

  localStorage.setItem(
    "carebot_v3",
    JSON.stringify(state)
  );
}

function set(html){

  app.innerHTML = html;
}

function home(){

  set(
    '<h2>何をしたいですか？</h2>'+

    '<div class="row">'+

      '<button class="primary" id="recordBtn">'+
      '記録する'+
      '</button>'+

      '<button id="checkBtn">'+
      '確認する'+
      '</button>'+

    '</div>'+

    '<div class="card">'+

      '<div class="label">'+
      '自由に話してください'+
      '</div>'+

      '<textarea id="free" placeholder="例：父、明日田中病院へ行く&#10;例：9月の予定を見せて&#10;例：まだ終わっていないことは？"></textarea>'+

      '<button class="primary" id="sendBtn" style="margin-top:10px">'+
      '送る'+
      '</button>'+

    '</div>'+

    '<div class="card">'+

      '<b>今確認すること</b>'+

      '<div class="listItem">'+
      '母の退院日 '+
      '<span class="badge">確認待ち</span>'+
      '</div>'+

      '<div class="listItem">'+
      '9月16日 9:00 竜操整形外科病院'+
      '</div>'+

    '</div>'
  );

  document.getElementById(
    "recordBtn"
  ).onclick = recordStart;

  document.getElementById(
    "checkBtn"
  ).onclick = checkMenu;

  document.getElementById(
    "sendBtn"
  ).onclick = function(){

    submitFree(false);
  };
}

function recordStart(){

  set(
    '<h2>どんな内容ですか？</h2>'+

    '<textarea id="recordText" placeholder="そのまま話してください"></textarea>'+

    '<button class="primary" id="recordNext" style="margin-top:10px">'+
    '次へ'+
    '</button>'
  );

  document.getElementById(
    "recordNext"
  ).onclick = function(){

    var t =
      document.getElementById(
        "recordText"
      ).value.trim();

    if(!t){

      alert(
        "内容を入力してください"
      );

      return;
    }

    interpretThenRoute(
      t,
      false
    );
  };
}

function checkMenu(){

  set(
    '<h2>何を確認しますか？</h2>'+

    '<div class="row">'+

      '<button id="showAppts">'+
      '予定・予約'+
      '</button>'+

      '<button id="showTodos">'+
      'やること'+
      '</button>'+

      '<button id="askText">'+
      '自分の言葉で聞く'+
      '</button>'+

    '</div>'
  );

  document.getElementById(
    "showAppts"
  ).onclick = showAppointments;

  document.getElementById(
    "showTodos"
  ).onclick = showTodos;

  document.getElementById(
    "askText"
  ).onclick = function(){

    set(
      '<h2>何を知りたいですか？</h2>'+

      '<textarea id="q"></textarea>'+

      '<button class="primary" id="askGo" style="margin-top:10px">'+
      '確認する'+
      '</button>'
    );

    document.getElementById(
      "askGo"
    ).onclick = function(){

      submitFree(true);
    };
  };
}

function submitFree(
  isQuestionMode
){

  var el =
    document.getElementById(
      isQuestionMode
      ? "q"
      : "free"
    );

  var text =
    el
    ? el.value.trim()
    : "";

  if(!text){

    return;
  }

  interpretThenRoute(
    text,
    isQuestionMode
  );
}

function interpretThenRoute(
  text,
  isQuestionMode
){

  set(
    '<div class="notice">'+
    'AIが確認しています…'+
    '</div>'
  );

  fetch(
    "/api/interpret",
    {

      method:"POST",

      headers:{
        "Content-Type":
          "application/json"
      },

      body:
        JSON.stringify({
          text:text
        })
    }
  )

  .then(function(r){

    return r.text()
      .then(function(body){

        if(!r.ok){

          throw new Error(body);
        }

        return JSON.parse(body);
      });
  })

  .then(function(ai){

    routeAI(
      text,
      ai,
      isQuestionMode
    );
  })

  .catch(function(err){

    set(
      '<div class="error">'+

      '<b>'+
      'AIに接続できませんでした。'+
      '</b><br>'+

      '<span class="small">'+
      esc(err.message)+
      '</span>'+

      '</div>'
    );
  });
}

function routeAI(
  text,
  ai,
  isQuestionMode
){

  var explicitQuestion =
    isQuestionMode ||
    /[？?]|見せて|教えて|確認したい|何が|いつ|どこ/.test(text);

  var hasDate =
    /今日|明日|明後日|昨日|[0-9]{1,2}月[0-9]{1,2}日|[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(text);

  var eventVerb =
    /行く|受診|予約|通院|検査|入院|退院|面談|訪問|来る|連れて行く/.test(text);

  if(
    !explicitQuestion &&
    hasDate &&
    eventVerb
  ){

    showAppointmentConfirm(
      text,
      ai
    );

    return;
  }

  if(
    explicitQuestion &&
    (
      ai.intent === "schedule" ||
      /予定|予約/.test(text)
    )
  ){

    showAppointments();

    return;
  }

  if(
    ai.intent === "todo" ||
    /やること|未完了|終わっていない/.test(text)
  ){

    showTodos();

    return;
  }

  showGeneralConfirm(
    text,
    ai
  );
}

function normalizeDate(v){

  if(!v){

    return "";
  }

  if(
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v)
  ){

    return v;
  }

  var d =
    new Date();

  if(
    v === "明日"
  ){

    d.setDate(
      d.getDate()+1
    );

  }else if(
    v === "明後日"
  ){

    d.setDate(
      d.getDate()+2
    );

  }else if(
    v === "昨日"
  ){

    d.setDate(
      d.getDate()-1
    );

  }else if(
    v !== "今日"
  ){

    return v;
  }

  return (
    d.getFullYear()+
    "-"+
    String(
      d.getMonth()+1
    ).padStart(
      2,
      "0"
    )+
    "-"+
    String(
      d.getDate()
    ).padStart(
      2,
      "0"
    )
  );
}

function fallbackPlaceFromText(
  text
){

  var cleaned =
    text.replace(
      /^(父|母|父と母)[、,\s]*/,
      ""
    );

  cleaned =
    cleaned.replace(
      /^(今日|明日|明後日|昨日)[、,\s]*/,
      ""
    );

  var m =
    cleaned.match(
      /([^、。,\s]*(?:病院|医院|クリニック|診療所|歯科|役所|センター))/
    );

  if(!m){

    return "";
  }

  var place =
    m[1];

  place =
    place.replace(
      /^(今日|明日|明後日|昨日)/,
      ""
    );

  return place;
}

function getPlace(
  text,
  ai
){

  if(
    ai.place &&
    String(ai.place).trim()
  ){

    return String(
      ai.place
    ).trim();
  }

  return fallbackPlaceFromText(
    text
  );
}

function showAppointmentConfirm(
  text,
  ai
){

  var p = {

    date:
      normalizeDate(
        ai.date_phrase || ""
      ),

    time:
      (
        ai.time_phrase &&
        ai.time_phrase !==
        "時間不明"
      )
      ? ai.time_phrase
      : "",

    target:
      (
        ai.target &&
        ai.target !== "不明"
      )
      ? ai.target
      : "",

    hospital:
      getPlace(
        text,
        ai
      ),

    purpose:
      ai.summary || text,

    original:
      text
  };

  window.pendingAppointment =
    p;

  set(
    '<h2>'+
    'この予定を記録しますか？'+
    '</h2>'+

    '<div class="card">'+

      '<div class="label">'+
      '日付'+
      '</div>'+

      '<div>'+
      esc(
        p.date || "不明"
      )+
      '</div>'+

      '<div class="label">'+
      '時刻'+
      '</div>'+

      '<div>'+
      esc(
        p.time || "未指定"
      )+
      '</div>'+

      '<div class="label">'+
      '対象'+
      '</div>'+

      '<div>'+
      esc(
        p.target || "不明"
      )+
      '</div>'+

      '<div class="label">'+
      '病院・場所'+
      '</div>'+

      '<div>'+
      esc(
        p.hospital || "未指定"
      )+
      '</div>'+

      '<div class="label">'+
      '内容'+
      '</div>'+

      '<div>'+
      esc(
        p.purpose
      )+
      '</div>'+

      '<div class="label">'+
      '元の話'+
      '</div>'+

      '<div>'+
      esc(
        p.original
      )+
      '</div>'+

    '</div>'+

    '<div class="row">'+

      '<button class="primary" id="saveAppt">'+
      '記録する'+
      '</button>'+

      '<button id="editAppt">'+
      '修正する'+
      '</button>'+

    '</div>'
  );

  document.getElementById(
    "saveAppt"
  ).onclick =
    saveAppointment;

  document.getElementById(
    "editAppt"
  ).onclick =
    editAppointment;
}

function editAppointment(){

  var p =
    window.pendingAppointment;

  set(
    '<h2>'+
    '予定を修正'+
    '</h2>'+

    '<div class="label">'+
    '対象'+
    '</div>'+

    '<select id="eTarget">'+

      '<option>'+
      '父'+
      '</option>'+

      '<option>'+
      '母'+
      '</option>'+

      '<option>'+
      '父と母'+
      '</option>'+

      '<option>'+
      'その他'+
      '</option>'+

    '</select>'+

    '<div class="label">'+
    '日付'+
    '</div>'+

    '<input type="date" id="eDate" value="'+
    esc(
      p.date
    )+
    '">' +

    '<div class="label">'+
    '時刻（分からなければ空欄）'+
    '</div>'+

    '<input type="time" id="eTime" value="'+
    esc(
      p.time
    )+
    '">' +

    '<div class="label">'+
    '病院・場所'+
    '</div>'+

    '<input id="eHospital" value="'+
    esc(
      p.hospital
    )+
    '">' +

    '<div class="label">'+
    '内容'+
    '</div>'+

    '<textarea id="ePurpose">'+
    esc(
      p.purpose
    )+
    '</textarea>'+

    '<button class="primary" id="editDone" style="margin-top:10px">'+
    '確認へ'+
    '</button>'
  );

  if(
    p.target
  ){

    document.getElementById(
      "eTarget"
    ).value =
      p.target;
  }

  document.getElementById(
    "editDone"
  ).onclick =
    function(){

      p.target =
        document.getElementById(
          "eTarget"
        ).value;

      p.date =
        document.getElementById(
          "eDate"
        ).value;

      p.time =
        document.getElementById(
          "eTime"
        ).value;

      p.hospital =
        document.getElementById(
          "eHospital"
        ).value.trim();

      p.purpose =
        document.getElementById(
          "ePurpose"
        ).value.trim();

      showAppointmentConfirmFromPending();
    };
}

function showAppointmentConfirmFromPending(){

  var p =
    window.pendingAppointment;

  set(
    '<h2>'+
    'この予定を記録しますか？'+
    '</h2>'+

    '<div class="card">'+

      '<div class="label">'+
      '日付'+
      '</div>'+

      '<div>'+
      esc(
        p.date || "不明"
      )+
      '</div>'+

      '<div class="label">'+
      '時刻'+
      '</div>'+

      '<div>'+
      esc(
        p.time || "未指定"
      )+
      '</div>'+

      '<div class="label">'+
      '対象'+
      '</div>'+

      '<div>'+
      esc(
        p.target || "不明"
      )+
      '</div>'+

      '<div class="label">'+
      '病院・場所'+
      '</div>'+

      '<div>'+
      esc(
        p.hospital || "未指定"
      )+
      '</div>'+

      '<div class="label">'+
      '内容'+
      '</div>'+

      '<div>'+
      esc(
        p.purpose
      )+
      '</div>'+

    '</div>'+

    '<div class="row">'+

      '<button class="primary" id="saveAppt">'+
      '記録する'+
      '</button>'+

      '<button id="editAppt">'+
      '修正する'+
      '</button>'+

    '</div>'
  );

  document.getElementById(
    "saveAppt"
  ).onclick =
    saveAppointment;

  document.getElementById(
    "editAppt"
  ).onclick =
    editAppointment;
}

function saveAppointment(){

  var p =
    window.pendingAppointment;

  if(
    !p.target ||
    !p.date
  ){

    alert(
      "対象と日付を確認してください"
    );

    return;
  }

  state.appointments.push({

    date:
      p.date,

    time:
      p.time,

    target:
      p.target,

    hospital:
      p.hospital,

    purpose:
      p.purpose,

    status:
      "予定"
  });

  state.records.push({

    date:
      p.date,

    target:
      p.target,

    text:
      p.original,

    summary:
      p.purpose,

    tags:[
      "予定・予約"
    ]
  });

  save();

  set(
    '<div class="notice">'+
    '<b>'+
    '予定を記録しました。'+
    '</b>'+
    '</div>'+

    '<button id="seeAppts" style="margin-top:10px">'+
    '予定一覧を見る'+
    '</button>'
  );

  document.getElementById(
    "seeAppts"
  ).onclick =
    showAppointments;
}

function showGeneralConfirm(
  text,
  ai
){

  var placeDisplay =
    ai.place
    ? '<div class="label">場所・関係先</div><div>'+
      esc(ai.place)+
      '</div>'
    : '';

  set(
    '<h2>'+
    'AIの整理'+
    '</h2>'+

    '<div class="card">'+

      '<div class="label">'+
      '対象'+
      '</div>'+

      '<div>'+
      esc(
        ai.target || "不明"
      )+
      '</div>'+

      placeDisplay+

      '<div class="label">'+
      '内容'+
      '</div>'+

      '<div>'+
      esc(
        ai.summary || text
      )+
      '</div>'+

      '<div class="label">'+
      '分類'+
      '</div>'+

      '<div>'+
      esc(
        ai.intent || "other"
      )+
      '</div>'+

      '<div class="label">'+
      '根拠'+
      '</div>'+

      '<div class="small muted">'+
      esc(
        ai.reason || ""
      )+
      '</div>'+

    '</div>'+

    (
      ai.question
      ?
      '<div class="notice">'+
      esc(
        ai.question
      )+
      '</div>'
      :
      ''
    )
  );
}

function showAppointments(){

  var arr =
    state.appointments
      .slice()
      .sort(
        function(a,b){

          return (
            a.date+
            a.time
          ).localeCompare(
            b.date+
            b.time
          );
        }
      );

  set(
    '<h2>'+
    'これからの予定'+
    '</h2>'+

    arr.map(
      function(x){

        return (

          '<div class="card">'+

          '<b>'+
          esc(
            x.date
          )+
          ' '+
          esc(
            x.time || ""
          )+
          '</b><br>'+

          esc(
            x.target
          )+
          '　'+
          esc(
            x.hospital
          )+
          '<br>'+

          '<span class="muted">'+
          esc(
            x.purpose
          )+
          '</span>'+

          '</div>'
        );
      }
    ).join("")
  );
}

function showTodos(){

  set(
    '<h2>'+
    'やること'+
    '</h2>'+

    state.todos.map(
      function(x){

        return (

          '<div class="card">'+

          esc(
            x.text
          )+

          ' <span class="badge">'+

          esc(
            x.status
          )+

          '</span>'+

          '</div>'
        );
      }
    ).join("")
  );
}

document.getElementById(
  "homeBtn"
).onclick =
  home;

home();

})();
</script>

</body>
</html>`;

async function interpret(
  request,
  env
){

  if(
    !env.OPENAI_API_KEY
  ){

    return new Response(

      JSON.stringify({
        error:
          "OPENAI_API_KEY is not configured"
      }),

      {
        status:500,

        headers:{
          "Content-Type":
            "application/json"
        }
      }
    );
  }

  let body;

  try{

    body =
      await request.json();

  }catch{

    return new Response(

      JSON.stringify({
        error:
          "Invalid JSON"
      }),

      {
        status:400,

        headers:{
          "Content-Type":
            "application/json"
        }
      }
    );
  }

  const text =
    String(
      body &&
      body.text ||
      ""
    ).trim();

  if(
    !text
  ){

    return new Response(

      JSON.stringify({
        error:
          "text is required"
      }),

      {
        status:400,

        headers:{
          "Content-Type":
            "application/json"
        }
      }
    );
  }

  const schema = {

    type:"object",

    properties:{

      intent:{

        type:"string",

        enum:[
          "record",
          "search",
          "schedule",
          "todo",
          "contact",
          "next_to_tell",
          "emergency",
          "other"
        ]
      },

      target:{

        type:"string",

        enum:[
          "父",
          "母",
          "父と母",
          "その他",
          "不明"
        ]
      },

      date_phrase:{

        type:[
          "string",
          "null"
        ]
      },

      time_phrase:{

        type:[
          "string",
          "null"
        ]
      },

      place:{

        type:[
          "string",
          "null"
        ]
      },

      tags:{

        type:"array",

        items:{
          type:"string"
        }
      },

      summary:{
        type:"string"
      },

      needs_questions:{
        type:"boolean"
      },

      question:{
        type:"string"
      },

      emergency:{
        type:"boolean"
      },

      reason:{
        type:"string"
      }
    },

    required:[
      "intent",
      "target",
      "date_phrase",
      "time_phrase",
      "place",
      "tags",
      "summary",
      "needs_questions",
      "question",
      "emergency",
      "reason"
    ],

    additionalProperties:false
  };

  const payload = {

    model:
      MODEL,

    input:[

      {
        role:"developer",

        content:[
          {
            type:"input_text",
            text:SYSTEM_PROMPT
          }
        ]
      },

      {
        role:"user",

        content:[
          {
            type:"input_text",
            text:text
          }
        ]
      }
    ],

    text:{

      format:{

        type:
          "json_schema",

        name:
          "carebot_interpretation",

        strict:
          true,

        schema:
          schema
      }
    }
  };

  const resp =
    await fetch(

      "https://api.openai.com/v1/responses",

      {

        method:
          "POST",

        headers:{

          "Content-Type":
            "application/json",

          "Authorization":
            "Bearer "+
            env.OPENAI_API_KEY
        },

        body:
          JSON.stringify(
            payload
          )
      }
    );

  const raw =
    await resp.text();

  if(
    !resp.ok
  ){

    return new Response(

      JSON.stringify({

        error:
          "OpenAI request failed",

        detail:
          raw.slice(
            0,
            800
          )
      }),

      {

        status:502,

        headers:{
          "Content-Type":
            "application/json"
        }
      }
    );
  }

  let data;

  try{

    data =
      JSON.parse(raw);

  }catch{

    return new Response(

      JSON.stringify({
        error:
          "Invalid OpenAI response"
      }),

      {

        status:502,

        headers:{
          "Content-Type":
            "application/json"
        }
      }
    );
  }

  let out =
    data.output_text || "";

  if(
    !out &&
    Array.isArray(
      data.output
    )
  ){

    out =
      data.output

        .reduce(
          function(
            all,
            item
          ){

            return all.concat(
              item.content || []
            );
          },
          []
        )

        .map(
          function(item){

            return (
              item.text || ""
            );
          }
        )

        .join("");
  }

  try{

    var parsed =
      JSON.parse(out);

    return new Response(

      JSON.stringify(
        parsed
      ),

      {

        headers:{

          "Content-Type":
            "application/json",

          "Cache-Control":
            "no-store"
        }
      }
    );

  }catch{

    return new Response(

      JSON.stringify({

        error:
          "Model did not return valid JSON",

        raw:
          out.slice(
            0,
            500
          )
      }),

      {

        status:502,

        headers:{
          "Content-Type":
            "application/json"
        }
      }
    );
  }
}

export default {

  async fetch(
    request,
    env
  ){

    const url =
      new URL(
        request.url
      );

    if(
      url.pathname ===
      "/health"
    ){

      return new Response(

        JSON.stringify({

          ok:true,

          apiConfigured:
            !!env.OPENAI_API_KEY
        }),

        {

          headers:{

            "Content-Type":
              "application/json",

            "Cache-Control":
              "no-store"
          }
        }
      );
    }

    if(
      url.pathname ===
      "/api/interpret" &&
      request.method ===
      "POST"
    ){

      return interpret(
        request,
        env
      );
    }

    return new Response(

      HTML,

      {

        headers:{

          "Content-Type":
            "text/html;charset=UTF-8",

          "Cache-Control":
            "no-store"
        }
      }
    );
  }
};
