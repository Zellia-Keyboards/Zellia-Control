<script lang="ts">
  import { goto } from '$app/navigation';
  import { CircleSlash, Home, Plug, Loader2 } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter,
  } from '$lib/components/ui/card';
  import { keyboardAPI } from '$lib/api/keyboardAPI.svelte';

  let connecting = $derived(keyboardAPI.state.connectionStatus === 'connecting');

  async function handleConnect() {
    await keyboardAPI.connect();
  }
</script>

<div class="flex-1 flex items-center justify-center p-8">
  <Card class="max-w-md w-full text-center glassmorphism-card">
    <CardHeader>
      <div class="mx-auto mb-2">
        <CircleSlash class="size-12 text-muted-foreground" />
      </div>
      <CardTitle class="text-2xl">No Keyboard Connected</CardTitle>
      <CardDescription>
        Connect a Zellia keyboard to start configuring, or return home.
      </CardDescription>
    </CardHeader>
    <CardFooter class="justify-center gap-3">
      <Button
        size="lg"
        disabled={connecting}
        class="gap-2 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-lg"
        onclick={handleConnect}
      >
        {#if connecting}
          <Loader2 class="size-4 animate-spin" />
          Connecting…
        {:else}
          <Plug class="size-4" />
          Connect Keyboard
        {/if}
      </Button>
      <Button
        size="lg"
        variant="outline"
        class="gap-2 rounded-full"
        onclick={() => goto('/')}
      >
        <Home class="size-4" />
        Home
      </Button>
    </CardFooter>
  </Card>
</div>
