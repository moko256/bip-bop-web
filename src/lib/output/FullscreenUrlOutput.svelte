<script lang="ts">
	import { resolutions } from './output';
</script>

<label>
	解像度
	<select>
		{#each resolutions as resolution (resolution.value)}
			<option value={resolution.value}>{resolution.label}</option>
		{/each}
	</select>
</label>
<div role="group">
	<input type="url" readonly aria-label="URL" placeholder="URL" />
	<button type="button">コピー</button>
</div>
<button type="button">開く</button>
