<script lang="ts">
  import { goto } from '$app/navigation';
  import { CircleSlash, Home } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
  } from '$lib/components/ui/card';
</script>

<div class="flex-1 flex items-center justify-center p-8">
  <Card class="max-w-md w-full text-center glassmorphism-card">
    <CardHeader>
      <div class="mx-auto mb-2">
        <CircleSlash class="size-12 text-muted-foreground" />
      </div>
      <CardTitle class="text-2xl">No Keyboard Connected</CardTitle>
      <CardDescription>
        Please connect a keyboard or go to the home page to start.
      </CardDescription>
    </CardHeader>
    <CardFooter class="justify-center">
      <Button
        size="lg"
        class="gap-2 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-lg"
        onclick={() => goto('/')}
      >
        <Home class="size-4" />
        Go to Home
      </Button>
    </CardFooter>
  </Card>
</div>
