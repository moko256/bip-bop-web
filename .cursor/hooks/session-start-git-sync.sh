#!/usr/bin/env bash
# Cursor sessionStart: git fetch, then git pull, only for a Cloud Agent.
# Cloud Agents were formerly called Background Agents. sessionStart reports that
# with is_background_agent. Interactive sessions exit before touching git.
# If fetch or pull fails, the pull conflicts, or local changes conflict with
# the update, HEAD, the index, and the worktree are put back to the pre-hook
# state. Remote-tracking refs already updated by fetch stay as they are.
set -u

payload=""
if [ ! -t 0 ]; then
	payload=$(cat || true)
fi

is_background_agent=$(
	printf '%s' "$payload" | python3 -c 'import json,sys
raw=sys.stdin.read().strip()
if not raw:
    print("0")
    raise SystemExit(0)
try:
    data=json.loads(raw)
except json.JSONDecodeError:
    print("0")
    raise SystemExit(0)
print("1" if data.get("is_background_agent") is True else "0")'
) || is_background_agent=0

if [ "$is_background_agent" != "1" ]; then
	echo '{}'
	exit 0
fi

emit() {
	python3 -c 'import json,sys; print(json.dumps({"additional_context": sys.argv[1]}, ensure_ascii=False))' "$1"
}

summary_line() {
	printf '%s\n' "$1" | tr -d '\r' | awk '
		NF { last = $0 }
		/^(fatal|error|CONFLICT):/ && hit == "" { hit = $0 }
		END { if (hit != "") print hit; else print last }
	'
}

short_sha() {
	printf '%s' "$1" | cut -c 1-12
}

cd "${CURSOR_PROJECT_DIR:-$PWD}" || {
	emit "session start の git sync をスキップしました。プロジェクトディレクトリへ移動できません。"
	exit 0
}

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
	emit "session start の git sync をスキップしました。git リポジトリではありません。"
	exit 0
fi

cd "$(git rev-parse --show-toplevel)" || {
	emit "session start の git sync をスキップしました。リポジトリのルートへ移動できません。"
	exit 0
}

if ! head_before=$(git rev-parse --verify HEAD 2>/dev/null); then
	emit "session start の git sync をスキップしました。まだコミットがありません。"
	exit 0
fi

branch=$(git rev-parse --abbrev-ref HEAD)

git_path() {
	git rev-parse --git-path "$1"
}

for name in MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD BISECT_LOG rebase-merge rebase-apply; do
	if [ -e "$(git_path "$name")" ]; then
		emit "session start の git sync をスキップしました。merge / rebase / cherry-pick / revert / bisect の途中です。"
		exit 0
	fi
done

lock_dir="$(git_path cursor-session-start-sync.lock)"
if ! mkdir "$lock_dir" 2>/dev/null; then
	oldpid=$(cat "$lock_dir/pid" 2>/dev/null || true)
	if [ -n "$oldpid" ] && kill -0 "$oldpid" 2>/dev/null; then
		emit "session start の git sync をスキップしました。別の sync が実行中です。"
		exit 0
	fi
	rm -rf "$lock_dir"
	if ! mkdir "$lock_dir" 2>/dev/null; then
		emit "session start の git sync をスキップしました。別の sync が実行中です。"
		exit 0
	fi
fi
printf '%s\n' "$$" >"$lock_dir/pid"
trap 'rm -rf "$lock_dir"' EXIT

export GIT_TERMINAL_PROMPT=0

stash_sha=""
restoring=0

drop_stash() {
	local sha="$1"
	local entry
	entry=$(git stash list --format='%gd %H' | awk -v sha="$sha" '$2 == sha { print $1; exit }')
	if [ -n "$entry" ]; then
		git stash drop -q "$entry" >/dev/null 2>&1 || true
	fi
}

restore() {
	local reason="$1"
	local note=""
	if [ "$restoring" = 1 ]; then
		exit 0
	fi
	restoring=1

	git merge --abort >/dev/null 2>&1 || true
	git rebase --abort >/dev/null 2>&1 || true
	git cherry-pick --abort >/dev/null 2>&1 || true
	git revert --abort >/dev/null 2>&1 || true

	if ! git reset --hard "$head_before" >/dev/null 2>&1; then
		emit "session start の git sync に失敗しました（${reason}）。$(short_sha "$head_before") への復帰に失敗しました。"
		exit 0
	fi

	if [ -n "$stash_sha" ]; then
		if git stash apply --index -q "$stash_sha" >/dev/null 2>&1 && [ -z "$(git ls-files -u)" ]; then
			drop_stash "$stash_sha"
			note="ローカル変更も戻しました。"
		else
			git reset --hard "$head_before" >/dev/null 2>&1 || true
			emit "session start の git sync に失敗しました（${reason}）。作業ツリーは $(short_sha "$head_before") に戻しました。ローカル変更は stash $(short_sha "$stash_sha") に残しています。"
			exit 0
		fi
	fi

	emit "session start の git sync に失敗しました（${reason}）。${branch} を $(short_sha "$head_before") に戻しました。${note}"
	exit 0
}

trap 'restore "中断されました"' TERM INT HUP

if [ -n "$(git -c color.ui=false status --porcelain)" ]; then
	stash_before=$(git rev-parse -q --verify refs/stash || true)
	if ! git stash push --include-untracked -q -m "cursor-session-start-sync" >/dev/null 2>&1; then
		emit "session start の git sync をスキップしました。ローカル変更を退避できなかったため、pull は実行していません。"
		exit 0
	fi
	stash_sha=$(git rev-parse -q --verify refs/stash || true)
	if [ -z "$stash_sha" ] || [ "$stash_sha" = "$stash_before" ]; then
		stash_sha=""
		emit "session start の git sync をスキップしました。ローカル変更を退避できなかったため、pull は実行していません。"
		exit 0
	fi
fi

fetch_out=""
if ! fetch_out=$(git fetch 2>&1); then
	restore "git fetch が失敗しました: $(summary_line "$fetch_out")"
fi

pull_out=""
if ! pull_out=$(git pull --no-edit 2>&1); then
	restore "git pull が失敗しました: $(summary_line "$pull_out")"
fi

if [ -e "$(git_path MERGE_HEAD)" ] || [ -n "$(git ls-files -u)" ]; then
	restore "コンフリクトが残っています"
fi

if [ -n "$stash_sha" ]; then
	if ! git stash apply --index -q "$stash_sha" >/dev/null 2>&1 || [ -n "$(git ls-files -u)" ]; then
		restore "upstream の更新とローカル変更がコンフリクトしました"
	fi
	drop_stash "$stash_sha"
fi

head_after=$(git rev-parse --verify HEAD)
if [ "$head_after" = "$head_before" ]; then
	emit "session start の git sync: ${branch} は upstream と同期済みです（$(short_sha "$head_after")）。"
else
	emit "session start の git sync: ${branch} を $(short_sha "$head_before") から $(short_sha "$head_after") に更新しました。"
fi
exit 0
