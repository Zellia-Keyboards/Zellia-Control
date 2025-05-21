<script lang="ts">
    const NORMAL_KEY = [...Array(94).keys()].map(_ => _ + 33).map(_ => [String.fromCharCode(_), _]);

    console.log(NORMAL_KEY);
</script>

<h2>Key List</h2>
<div class="flex flex-wrap">
    {#each NORMAL_KEY as [name, code]}
        <button
            
            class="p-2 px-4 rounded-4xl font-bold"
        >{name}</button>
    {/each}
</div>