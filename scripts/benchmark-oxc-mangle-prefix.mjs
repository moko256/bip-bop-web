/**
 * Verify whether `$` (module-private) and `_` (class-private) prefixes help Oxc
 * shrink bundles when combined with `mangleProps`.
 *
 * Run: node scripts/benchmark-oxc-mangle-prefix.mjs
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { minifySync } from 'oxc-minify';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');

function resolveRolldownUtils() {
	const nested = join(root, 'node_modules/vite/node_modules/rolldown/dist/utils-index.mjs');
	if (existsSync(nested)) return nested;
	for (const entry of readdirSync(join(root, 'node_modules/.pnpm'))) {
		if (!entry.startsWith('vite@')) continue;
		const candidate = join(
			root,
			'node_modules/.pnpm',
			entry,
			'node_modules/rolldown/dist/utils-index.mjs'
		);
		if (existsSync(candidate)) return candidate;
	}
	throw new Error('Could not locate rolldown/dist/utils-index.mjs (is vite installed?)');
}

const { transformSync } = await import(pathToFileURL(resolveRolldownUtils()).href);

const MANGLE_PROPS_UNDERSCORE = { include: /^_/ };
const MANGLE_PROPS_DOLLAR = { include: /^\$/ };
const MANGLE_PROPS_BOTH = { include: /^(_|\$)/ };

function byteSize(text) {
	return Buffer.byteLength(text, 'utf8');
}

function minifyJs(filename, code, extra = {}) {
	const result = minifySync(filename, code, {
		module: true,
		mangle: true,
		compress: true,
		...extra
	});
	if (result.errors.length > 0) {
		throw new Error(`${filename}: ${result.errors.map((e) => e.message).join('; ')}`);
	}
	return result.code;
}

function walkTsFiles(dir, out = []) {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		const st = statSync(path);
		if (st.isDirectory()) {
			if (entry === 'node_modules' || entry === 'paraglide') continue;
			walkTsFiles(path, out);
			continue;
		}
		if (!/\.(svelte\.)?ts$/.test(entry)) continue;
		if (/\.(spec|test)\./.test(entry)) continue;
		out.push(path);
	}
	return out;
}

/** Collect `private` field / method names declared on classes (heuristic). */
function privateMemberNames(source) {
	const names = new Set();
	const decl =
		/^\s*private\s+(?:async\s+)?(?:readonly\s+)?([$A-Za-z_][\w$]*)\s*(?:=|\(|:|<)/gm;
	let match;
	while ((match = decl.exec(source)) !== null) {
		names.add(match[1]);
	}
	const ctorParam = /constructor\s*\([^)]*?\bprivate\s+(?:readonly\s+)?([$A-Za-z_][\w$]*)/g;
	while ((match = ctorParam.exec(source)) !== null) {
		names.add(match[1]);
	}
	return [...names];
}

/** Simulate the `_` convention on emitted JS for class-private members. */
function applyUnderscoreConventionToJs(js, members) {
	let out = js;
	for (const name of members) {
		if (name.startsWith('_')) continue;
		const prefixed = `_${name}`;
		out = out.replaceAll(`this.${name}`, `this.${prefixed}`);
		out = out.replaceAll(`${name} =`, `${prefixed} =`);
		out = out.replaceAll(`${name};`, `${prefixed};`);
	}
	return out;
}

function microBenchmarks() {
	const long = 'internalStateTrackingBuffer';
	const underscoreClass = `
class VideoOutputRun {
  _readOutputType = () => {};
  _codecLists = null;
  _videoCodecChoice = null;
  _audioCodecChoice = null;
  _seenOutputType = undefined;
  _stopWatch = () => {};
  tick() {
    this._readOutputType();
    this._codecLists;
    this._videoCodecChoice;
    this._audioCodecChoice;
    this._seenOutputType;
    this._stopWatch();
  }
}
export const run = new VideoOutputRun();
`;
	const hashClass = `
class VideoOutputRun {
  #readOutputType = () => {};
  #codecLists = null;
  #videoCodecChoice = null;
  #audioCodecChoice = null;
  #seenOutputType = undefined;
  #stopWatch = () => {};
  tick() {
    this.#readOutputType();
    this.#codecLists;
    this.#videoCodecChoice;
    this.#audioCodecChoice;
    this.#seenOutputType;
    this.#stopWatch();
  }
}
export const run = new VideoOutputRun();
`;
	const moduleHelpers = `
const $normalizeFrameEntry = (x) => x;
const $clampFps = (x) => x;
const $parseResolutionText = (x) => x;
export function exported() {
  return $normalizeFrameEntry($clampFps($parseResolutionText(1)));
}
`;

	const rows = [];
	for (const [label, src] of [
		['class fields with _ prefix', underscoreClass],
		['class fields with # hard private', hashClass],
		['module helpers with $ prefix (exported API unchanged)', moduleHelpers]
	]) {
		const baseline = minifyJs(`${label}.mjs`, src);
		const withUnderscoreProps = minifyJs(`${label}.mjs`, src, {
			mangleProps: MANGLE_PROPS_UNDERSCORE
		});
		const withDollarProps = minifyJs(`${label}.mjs`, src, {
			mangleProps: MANGLE_PROPS_DOLLAR
		});
		rows.push({
			label,
			bytes_baseline_mangle: byteSize(baseline),
			bytes_mangleProps_underscore: byteSize(withUnderscoreProps),
			bytes_mangleProps_dollar: byteSize(withDollarProps),
			saved_by_mangleProps_underscore: byteSize(baseline) - byteSize(withUnderscoreProps)
		});
	}
	return rows;
}

function walkJsFiles(dir, out = []) {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		const st = statSync(path);
		if (st.isDirectory()) {
			walkJsFiles(path, out);
			continue;
		}
		if (entry.endsWith('.js')) out.push(path);
	}
	return out;
}

function measureBuildOutput(buildDir) {
	const files = walkJsFiles(buildDir);
	let bytes = 0;
	let gzipBytes = 0;
	for (const file of files) {
		const code = readFileSync(file);
		bytes += code.length;
		gzipBytes += gzipSync(code).length;
	}
	return { jsFileCount: files.length, bytes, gzipBytes };
}

function productionBuildBenchmark() {
	const buildDir = join(root, 'build');
	execSync('pnpm exec svelte-kit sync', { cwd: root, stdio: 'inherit' });

	execSync('pnpm build', {
		cwd: root,
		stdio: 'inherit',
		env: { ...process.env, BENCHMARK_MANGLE_PROPS: '' }
	});
	const baseline = measureBuildOutput(buildDir);

	let manglePropsBuild;
	try {
		execSync('pnpm build', {
			cwd: root,
			stdio: 'inherit',
			env: { ...process.env, BENCHMARK_MANGLE_PROPS: '1' }
		});
		manglePropsBuild = {
			ok: true,
			...measureBuildOutput(buildDir)
		};
	} catch (error) {
		manglePropsBuild = {
			ok: false,
			error:
				'Rolldown rejects mangleProps when the build emits multiple JS chunks (SvelteKit code-splitting).'
		};
	}

	return {
		baseline_default_minify: baseline,
		mangleProps_include_underscore_full_build: manglePropsBuild,
		saved_bytes:
			manglePropsBuild.ok && manglePropsBuild.bytes != null
				? baseline.bytes - manglePropsBuild.bytes
				: null,
		saved_gzip_bytes:
			manglePropsBuild.ok && manglePropsBuild.gzipBytes != null
				? baseline.gzipBytes - manglePropsBuild.gzipBytes
				: null,
		note:
			'Full-app comparison uses adapter-static build/ JS totals. mangleProps in vite.config is blocked for this app until Rolldown supports it with code splitting.'
	};
}

function projectBenchmark() {
	const files = walkTsFiles(join(root, 'src/lib'));
	let privateNameCount = 0;
	let bytesJsEmit = 0;
	let bytesMinDefault = 0;
	let bytesMinUnderscoreEmit = 0;
	let bytesMinUnderscoreEmitAndMangleProps = 0;
	let bytesMinManglePropsOnCurrent = 0;
	let transformedFiles = 0;

	for (const file of files) {
		const source = readFileSync(file, 'utf8');
		const members = privateMemberNames(source);
		privateNameCount += members.length;
		const transformId = relative(root, file);

		let js;
		try {
			js = transformSync(transformId, source, { lang: 'ts' }).code;
		} catch {
			continue;
		}
		if (!js) continue;
		transformedFiles += 1;
		bytesJsEmit += byteSize(js);

		const conventionJs = applyUnderscoreConventionToJs(js, members);
		const minName = transformId.replace(/[^\w./-]/g, '_');

		bytesMinDefault += byteSize(minifyJs(minName, js));
		bytesMinUnderscoreEmit += byteSize(minifyJs(minName, conventionJs));
		bytesMinUnderscoreEmitAndMangleProps += byteSize(
			minifyJs(minName, conventionJs, { mangleProps: MANGLE_PROPS_UNDERSCORE })
		);
		bytesMinManglePropsOnCurrent += byteSize(
			minifyJs(minName, js, { mangleProps: MANGLE_PROPS_BOTH })
		);
	}

	return {
		fileCount: files.length,
		transformedFiles,
		privateMemberDeclarations: privateNameCount,
		bytes_js_emit_total: bytesJsEmit,
		bytes_minify_per_file_sum_default: bytesMinDefault,
		bytes_minify_per_file_sum_after_underscore_emit: bytesMinUnderscoreEmit,
		bytes_minify_per_file_sum_underscore_emit_plus_mangleProps: bytesMinUnderscoreEmitAndMangleProps,
		bytes_minify_per_file_sum_mangleProps_on_current_emit: bytesMinManglePropsOnCurrent,
		saved_by_convention_and_mangleProps:
			bytesMinDefault - bytesMinUnderscoreEmitAndMangleProps
	};
}

const runProductionBuild = process.env.BENCHMARK_SKIP_BUILD !== '1';

const report = {
	generatedAt: new Date().toISOString(),
	oxcMinifyVersion: readFileSync(join(root, 'node_modules/oxc-minify/package.json'), 'utf8')
		.match(/"version":\s*"([^"]+)"/)?.[1],
	viteDefault: 'Vite 8 uses Oxc identifier mangle by default; property mangle (mangleProps) is opt-in.',
	microBenchmarks: microBenchmarks(),
	projectSrcLib: projectBenchmark(),
	productionBuild: runProductionBuild ? productionBuildBenchmark() : { skipped: true },
	conclusions: [
		'Module-scoped const/function names (including $foo) are already shortened by identifier mangle; $ prefix alone does not unlock extra shrinking unless you also enable mangleProps on $-prefixed *properties*.',
		'TypeScript `private` erases to plain property names in emit, so today’s class privates are not matched by mangleProps /^_/ until you rename to _field or use # hard private.',
		'mangleProps.include /^_/ materially shrinks classes that expose long _prefixed fields; # fields cannot be property-mangled and keep #name in output.',
		'Rolldown (Vite 8.3.4 / rolldown 1.2.14) rejects output.minify.mangleProps when the build emits multiple JS chunks — SvelteKit production builds cannot enable it today.',
		'Enable via build.rolldownOptions.output.minify.mangleProps only for single-chunk bundles; otherwise savings require future Rolldown support or a different bundling shape.',
		'Replacing # hard private with _fields + mangleProps trades language-level encapsulation for bytes; keep reserved/exclude for host/DOM/public API property names.'
	]
};

const researchDir = join(root, 'research');
mkdirSync(researchDir, { recursive: true });
const outJson = join(researchDir, 'oxc-mangle-prefix-convention.report.json');
const outMd = join(researchDir, 'oxc-mangle-prefix-convention.md');
writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);

const reUnderscore = '/^_/';
const reDollar = '/^$/';

writeFileSync(
	outMd,
	`# Oxc mangle と \`$\` / \`_\` プレフィックス規約の検証

検証日: ${report.generatedAt.split('T')[0]}

## 結論（要約）

| 規約 | デフォルトの Oxc \`mangle\` だけ | \`mangleProps\` 併用 |
| --- | --- | --- |
| モジュール内のみ \`$name\` | トップレベルの **変数・関数** は既にリネームされるため、\`$\` を付けても追加効果はほぼない | \`$\` が **プロパティ名** のときのみ \`include: ${reDollar}\` で短縮可能 |
| クラス内のみ \`_name\` | TS の \`private\` は emit で \`_\` 付きにならないため、現状のコードベースでは効果なし | \`include: ${reUnderscore}\` でクラスフィールドを短縮できる（要: ソースで \`_\` 付き命名 or # 廃止） |
| TS \`#hardPrivate\` | プロパティ名は \`#...\` のまま残り **mangleProps 不可** | 代替として \`_foo\` + \`mangleProps\` でバイト数を削れる |

**ファイルサイズを減らすには**、クラス private を \`#\` または TS \`private\` から **実際の \`_prefixed\` プロパティ** に寄せ、ビルドで \`mangleProps: { include: ${reUnderscore} }\` を有効化する必要がある。

## 根拠

- Oxc 公式: 変数の mangle はデフォルト有効、プロパティは \`mangleProps.include\` が必要 — https://oxc.rs/docs/guide/usage/minifier/mangling
- Vite 8 / Rolldown: \`output.minify\` に \`mangleProps\` を渡せる（\`MinifyOptions\`）

## マイクロベンチマーク（合成コード）

\`\`\`json
${JSON.stringify(report.microBenchmarks, null, 2)}
\`\`\`

## 本リポジトリ \`src/lib\`（現状の TS → emit → minify）

\`private\` 宣言を **emit 後に \`_\` を付けた場合** をシミュレート（規約導入後の上限に近い）。

\`\`\`json
${JSON.stringify(report.projectSrcLib, null, 2)}
\`\`\`

## 本番 \`pnpm build\`（adapter-static の \`build/\` 配下 JS 合計）

現行ソースのまま、デフォルト minify と \`BENCHMARK_MANGLE_PROPS=1\`（\`mangleProps: /^_/\`）を比較。

\`\`\`json
${JSON.stringify(report.productionBuild, null, 2)}
\`\`\`

## Vite 設定例（検証用）

\`\`\`ts
export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        minify: {
          compress: true,
          mangle: true,
          mangleProps: {
            include: ${reUnderscore},
            // 公開 API や DOM 連携プロパティは exclude / reserved で除外
          }
        }
      }
    }
  }
});
\`\`\`

## 再実行

\`\`\`bash
node scripts/benchmark-oxc-mangle-prefix.mjs
\`\`\`

生データ: \`research/oxc-mangle-prefix-convention.report.json\`
`
);

writeFileSync('/opt/cursor/artifacts/oxc-mangle-prefix-benchmark.json', `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify(report, null, 2));
