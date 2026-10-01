# 初期表示から動画エンコーダを外せば、転送は gzip で 61,375 バイト減る

`591becc`（2026-10-01 に `origin/main` を pull した時点）の本番ビルドを調べた。対象は、日本語ページ `build/ja.html` が最初に読み込む JS と CSS である。サーバ用バンドルは見ていない。

ページを開いた直後の転送は、ファイルごとの gzip を足すと 129,443 バイトある。mp4 と webm を選んだときだけ Mediabunny を読むようにすると、これは 68,068 バイトまで下がる。エンコーダ本体 62,625 バイトは、その選択のあとで届く。

Pico の未使用モジュールを切った別ビルドでは、CSS が gzip 5,352 バイト減った。`pico.spec.ts` は全モジュールを残すことを固定しているので、こちらはテストの方針を変えるかどうかの話になる。

## 初期転送は 129,443 バイト、その大半が1本の JS

`pnpm run build`（Vite 8.3.0）のあと、`build/ja.html` の `modulepreload` と `stylesheet` が指すファイルを gzip して足した。1本にまとめて圧縮した値ではない。ブラウザはファイルごとに受け取る。

| | バイト | gzip |
| --- | ---: | ---: |
| 初期転送の合計 | 466,950 | 129,443 |
| うちページ用 JS `nodes/2.*.js` | 266,873 | 74,856 |
| うち CSS 2本 | 90,023 | 13,341 |

ページ用 JS だけで初期 gzip の 58% を占める。hidden sourcemap を付けた同じソースのクライアント JS（378,571 バイト、割り当て漏れ 4,798 バイト）をソースファイルへ戻すと、次の配分になる。

| 由来 | minify 後のバイト |
| --- | ---: |
| Mediabunny 1.60.0 | 240,649 |
| Svelte / SvelteKit | 75,238 |
| アプリ本体 | 28,230 |
| `urlpattern-polyfill` | 18,134 |
| Paraglide ランタイム | 8,418 |

アプリ本体 28,230 バイトのうち 9,741 バイトは、インラインした JetBrains Mono の data URL である。

## エンコーダはページ表示では走らない

既定の OutputType は `page` だ。`OutputControls.svelte` は動画のときだけ `VideoOutput` を描く。それでも `VideoOutput.svelte` を静的に import し、`output.ts` が先頭で `Mp4OutputFormat` と `WebMOutputFormat` を import している。その結果、エンコーダがページ用チャンクに入り、`ja.html` がそれを `modulepreload` する。

遅延させるために、作業ツリーで次の二つを入れてビルドし直した。計測のあと `git checkout` で戻してあり、この文書以外の差分には残っていない。

`videoOutputFormat` とコーデック一覧を、動画側だけが import するモジュールへ移した。`OutputControls` では `VideoOutput.svelte` を `import()` で読むようにした。SvelteKit の Performance は、条件を満たしたときだけ要るコードは dynamic `import()` にすると書いている（[kit/performance](https://svelte.dev/docs/kit/performance)、Reducing code size / Selective loading）。

再ビルド後の `ja.html` は、エンコーダのチャンク `-T-q1dMy.js`（247,558 バイト、gzip 62,625 バイト）を `modulepreload` しない。初期転送は 220,614 バイト、gzip 68,068 バイトになった。差は 61,375 バイトである。ページを開いた人のうち mp4 か webm を選んだ人だけ、この 62,625 バイトを追加で受け取る。

CSS は分割でファイルが増え、gzip が 13,341 バイトから 13,548 バイトへ 207 バイト増えた。JS の減りに比べれば誤差である。動画用 CSS `VideoOutput.*.css`（gzip 222 バイト）は、ページ表示の HTML からもリンクされたまま残った。

Mediabunny の README は、tree-shaking で使った分だけ入り、最小 gzip は 5KB だと書いている。`package.json` は `"sideEffects": false` である。今回のソースマップに、デマルチプレクサ、HLS、FLAC、Ogg、WAVE、MP3、MPEG-TS は出てこない。残っている大きいファイルは、書き出しとサンプル処理に寄っている。

| ファイル | バイト |
| --- | ---: |
| `sample.js` | 44,410 |
| `media-source.js` | 26,458 |
| `isobmff/isobmff-muxer.js` | 23,754 |
| `isobmff/isobmff-boxes.js` | 19,743 |
| `codec-data.js` | 19,615 |
| `matroska/matroska-muxer.js` | 19,067 |
| `codec.js` | 18,194 |
| `encode.js` | 13,773 |

`output-format.js` は全ミュークサを静的 import する。未使用のクラスは Rolldown が落としていて、上の表に HLS や FLAC は無い。これ以上の削減は、mp4 か webm のどちらかを製品から外すことになる。Matroska 周り（muxer、ebml、misc）は約 28KB で、遅延したあとのチャンクの中の話である。直近の変更で両方のコンテナを出しているので、サイズだけを理由に片方をやめる材料は、この計測には無い。

## Pico を絞ったビルドは CSS が 5,352 バイト減った

レイアウトの CSS は 88,584 バイト、gzip 12,740 バイト。`src/lib/styles/pico.scss` は Pico のモジュールをすべて `true` にしていて、コメントに “Every module stays enabled” とある。`pico.spec.ts` の `keeps every Pico module` は、tooltip、loading アイコン、range、file、table まで残ることを期待している。

画面のマークアップにあるのは `main.container`、`.grid`、`button`、`progress`、`select`、`fieldset`、`label`、radio、`input type="url"`、`input type="number"` である。アコーディオン、カード、ドロップダウン、モーダル、ナビ、ツールチップ、テーブル、コード、色・日付・ファイル・検索の入力は無い。

その未使用モジュールを `false` にして `pnpm run build` すると、レイアウト CSS は 47,767 バイト、gzip 7,388 バイトになった。ページ固有の CSS 1,439 バイト（gzip 601 バイト）はそのまま。CSS 合計の gzip は 13,341 バイトから 7,989 バイトへ、5,352 バイト減る。縮小後の CSS にも `.container`、`.grid`、`button`、`progress`、`[type=radio]`、`select`、`fieldset`、`label` は残っていた。このビルドも計測後に戻してある。見た目の比較はしていない。

`forms/basics` には `[type=file]` と `[type=range]` の短い規則が残る。専用モジュールを切っても、その断片は消えない。

`kiso.css` は単体で minify すると gzip 1,536 バイトだった。リセットと `text-autospace` のためのもので、外しても効きはエンコーダや Pico より小さい。

二つの変更は別ビルドで測った。足し合わせると、初期 gzip は 129,443 − 61,375 − 5,352 = 62,716 バイト前後になる、という見積もりである。同時に入れたビルドは取っていない。

## フォントと URLPattern は、今すぐ切る額ではない

`jetbrains-mono-0.woff2` は 7,280 バイト（gzip しても 7,303 バイト）。`font.ts` が `?inline` で JS に埋め、ソースマップ上は 9,741 バイトになる。コメントは、キャンバスと動画が別リクエストなしで使うため、と書いている。ページプレビューが同じフォントを描くので、エンコーダを遅延しても初期読み込みに残る。遅延後に `modulepreload` される `CQb7R73D.js`（16,343 バイト、gzip 11,150 バイト）が、再生 UI とこの data URL を含んでいる。ファイルのまま配れば 7KB 台で済むが、リクエストが一本増える。

Paraglide が生成した `src/lib/paraglide/runtime.js` は `urlpattern-polyfill` を import する。コンパイラは、既定の URL パターンを使わないときにポリフィルを入れる（`@inlang/paraglide-js` の `create-runtime.js`、`needsUrlPatternPolyfill`）。`vite.config.ts` が `siteBase`（`/bip-bop-web`、`site-url.ts`）向けの `urlPatterns` を渡しているので、この条件に当たる。ポリフィルはクライアント JS の 18,134 バイトで、それを含むチャンク `97fSN6SV.js` は 26,552 バイト、gzip 8,725 バイトである。

MDN は URLPattern を 2025年9月からの Baseline としている（[URLPattern](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern)、2026-10-01 参照）。ポリフィルを外すコンパイラオプションは無く、外すと Baseline より古いブラウザでロケール付き URL が壊れる。このチャンクから削れるのは、未計測の見積もりで gzip 数 KB である。

Svelte と SvelteKit のランタイム 75,238 バイトは、フレームワークを替える話になる。ここは触らない。

## 再現手順

1. `git pull origin main` で `aff2ffc` から `591becc` へ fast-forward した。
2. `pnpm run build` のあと、`build/ja.html` が参照する `/_app/immutable/` の JS と CSS を Node の `zlib.gzipSync` で圧縮し、バイト数を足した。
3. 内訳は `vite.config.ts` の `build.sourcemap` を `'hidden'` にして再ビルドし、mappings を VLQ 復号してソースへ割り当てた。この設定も計測後に戻した。
4. エンコーダの遅延と Pico のモジュール削減は、それぞれ作業ツリーを変えて `pnpm run build` し、同じ手順で gzip を足した。どちらも `git checkout` で戻した。
5. kiso 単体の gzip は、`sass-embedded` を使わず `kiso.css` を Lightning CSS で minify した値である。Pico のセレクタ確認は、モジュールを `false` にした `pico.scss` を `sass-embedded` でコンパイルし、Lightning CSS で minify した文字列に対して行った。

## 数字の限界

gzip の合計は、ファイルを1本に連結して圧縮した値より大きい。共有できる辞書がファイルの境で切れるためだ。転送量の話としては、分かれて届くこちらの合計を使っている。

ソースマップの割り当ては、minify された行をマッピング区間で切った近似である。区間に乗らなかった 4,798 バイトは、どのモジュールにも入っていない。

遅延読み込みは、ビルド成果物の `modulepreload` の有無まで確認した。ブラウザで mp4 を選び、チャンクが届くところまでは見ていない。`OutputControls` のテストは静的 import のままなので、この分割を入れるなら待ち方を直す必要がある。

Pico の縮小は、本番 CSS のバイトと、縮小後に残るセレクタを見た。画面の見た目は比べていない。`input type="number"` 専用のセレクタは元から無く、`forms/basics` の汎用 `input` 規則に乗っている。
