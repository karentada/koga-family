# 家族ケアAI — ChatGPT API接続版

Cloudflare Worker 1本で動く試作版です。画面とAPIを同じWorkerから提供し、OpenAI APIキーはブラウザに置かずCloudflare Worker Secret `OPENAI_API_KEY` から読みます。

## ファイル
- `worker.js` — Worker本体。画面、自然言語理解APIを含む
- `index.html` — 旧MVPの参考版

## 最短の設定方法（Cloudflare Dashboard）
1. 現在のWorkerを開く。
2. **Edit code** を開く。
3. `worker.js` の内容を貼り付けて保存・Deploy。
4. Workerの **Settings → Variables and Secrets** で Secret を追加。
   - Name: `OPENAI_API_KEY`
   - Value: OpenAI API key
5. もう一度Worker URLを開く。
6. 「記録する」→テスト文を入力し、AIが内容を整理するか確認する。

APIキーはHTML/JavaScriptに書かないでください。Worker Secretとして登録します。

## 注意
この版は自然言語理解を実装した試作で、保存データはブラウザのlocalStorageです。家族の実データを本格運用する前に、認証、共有DB、監査履歴、バックアップ、通知、アクセス制御などを追加します。
