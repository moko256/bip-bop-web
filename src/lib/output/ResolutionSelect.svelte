<script lang="ts">
	import { resolutionGroups, type Resolution } from './output';
	import * as m from '$lib/paraglide/messages';

	let {
		value = $bindable()
	}: {
		value: Resolution;
	} = $props();
</script>

<label>
	{m.resolution()}
	<select bind:value>
		{#each resolutionGroups as group (group.id)}
			<optgroup label={group.label}>
				{#each group.options as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</optgroup>
		{/each}
	</select>
</label>
