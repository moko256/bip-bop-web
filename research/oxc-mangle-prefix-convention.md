# Oxc mangle と `$` / `_` プレフィックス規約の検証

検証日: 2026-10-29

## 結論（要約）

| 規約 | デフォルトの Oxc `mangle` だけ | `mangleProps` 併用 |
| --- | --- | --- |
| モジュール内のみ `$name` | トップレベルの **変数・関数** は既にリネームされるため、`$` を付けても追加効果はほぼない | `$` が **プロパティ名** のときのみ `include: /^$/` で短縮可能 |
| クラス内のみ `_name` | TS の `private` は emit で `_` 付きにならないため、現状のコードベースでは効果なし | `include: /^_/` でクラスフィールドを短縮できる（要: ソースで `_` 付き命名 or # 廃止） |
| TS `#hardPrivate` | プロパティ名は `#...` のまま残り **mangleProps 不可** | 代替として `_foo` + `mangleProps` でバイト数を削れる |

**ファイルサイズを減らすには**、クラス private を `#` または TS `private` から **実際の `_prefixed` プロパティ** に寄せ、ビルドで `mangleProps: { include: /^_/ }` を有効化する必要がある。

## 根拠

- Oxc 公式: 変数の mangle はデフォルト有効、プロパティは `mangleProps.include` が必要 — https://oxc.rs/docs/guide/usage/minifier/mangling
- Vite 8 / Rolldown: `output.minify` に `mangleProps` を渡せる（`MinifyOptions`）

## マイクロベンチマーク（合成コード）

```json
[
  {
    "label": "class fields with _ prefix",
    "bytes_baseline_mangle": 291,
    "bytes_mangleProps_underscore": 133,
    "bytes_mangleProps_dollar": 291,
    "saved_by_mangleProps_underscore": 158
  },
  {
    "label": "class fields with # hard private",
    "bytes_baseline_mangle": 145,
    "bytes_mangleProps_underscore": 145,
    "bytes_mangleProps_dollar": 145,
    "saved_by_mangleProps_underscore": 0
  },
  {
    "label": "module helpers with $ prefix (exported API unchanged)",
    "bytes_baseline_mangle": 72,
    "bytes_mangleProps_underscore": 72,
    "bytes_mangleProps_dollar": 72,
    "saved_by_mangleProps_underscore": 0
  }
]
```

## 本リポジトリ `src/lib`（現状の TS → emit → minify）

`private` 宣言を **emit 後に `_` を付けた場合** をシミュレート（規約導入後の上限に近い）。

```json
{
  "fileCount": 39,
  "transformedFiles": 39,
  "privateMemberDeclarations": 26,
  "bytes_js_emit_total": 72771,
  "bytes_minify_per_file_sum_default": 35559,
  "bytes_minify_per_file_sum_after_underscore_emit": 35697,
  "bytes_minify_per_file_sum_underscore_emit_plus_mangleProps": 34822,
  "bytes_minify_per_file_sum_mangleProps_on_current_emit": 35559,
  "saved_by_convention_and_mangleProps": 737
}
```

## 本番 `pnpm build`（adapter-static の `build/` 配下 JS 合計）

現行ソースのまま、デフォルト minify と `BENCHMARK_MANGLE_PROPS=1`（`mangleProps: /^_/`）を比較。

```json
{
  "baseline_default_minify": {
    "jsFileCount": 20,
    "bytes": 446861,
    "gzipBytes": 140957
  },
  "mangleProps_include_underscore_full_build": {
    "ok": false,
    "error": "Rolldown rejects mangleProps when the build emits multiple JS chunks (SvelteKit code-splitting)."
  },
  "saved_bytes": null,
  "saved_gzip_bytes": null,
  "note": "Full-app comparison uses adapter-static build/ JS totals. mangleProps in vite.config is blocked for this app until Rolldown supports it with code splitting."
}
```

## Vite 設定例（検証用）

```ts
export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        minify: {
          compress: true,
          mangle: true,
          mangleProps: {
            include: /^_/,
            // 公開 API や DOM 連携プロパティは exclude / reserved で除外
          }
        }
      }
    }
  }
});
```

## 再実行

```bash
node scripts/benchmark-oxc-mangle-prefix.mjs
```

生データ: `research/oxc-mangle-prefix-convention.report.json`
