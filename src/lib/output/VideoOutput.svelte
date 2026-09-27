<script lang="ts">
	import { audioCodecs, resolutions, videoCodecs } from './output';
</script>

<div class="grid">
	<label>
		解像度
		<select>
			{#each resolutions as resolution (resolution.value)}
				<option value={resolution.value}>{resolution.label}</option>
			{/each}
		</select>
	</label>
	<label>
		ビデオコーデック
		<select>
			{#each videoCodecs as codec (codec)}
				<option value={codec}>{codec}</option>
			{/each}
		</select>
	</label>
	<label>
		オーディオコーデック
		<select>
			{#each audioCodecs as codec (codec)}
				<option value={codec}>{codec}</option>
			{/each}
		</select>
	</label>
</div>
<button type="button">ダウンロード</button>
