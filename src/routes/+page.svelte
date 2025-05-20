<script>
    import Zellia80HE from "../lib/Zellia80HE.svelte";
</script>

<div class="bg-gray-400 h-screen w-screen">
  <Zellia80HE onClick={(x, y) => console.log(`you clicked x: ${x}, y: ${y} key!`)} values={[[2,5,1], [1,2,3]]}/>
</div>
