<script lang="ts">
  import { AlertCircle } from 'lucide-svelte';
  import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
  } from '$lib/components/ui/alert-dialog';

  interface Props {
    message: string;
    onClose: () => void;
  }

  let { message, onClose }: Props = $props();
  let open = $state(true);

  function handleOpenChange(value: boolean) {
    open = value;
    if (!value) onClose();
  }
</script>

<AlertDialog bind:open onOpenChange={handleOpenChange}>
  <AlertDialogContent class="glassmorphism-card">
    <AlertDialogHeader>
      <div class="flex items-start gap-3">
        <AlertCircle class="size-6 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div class="flex-1">
          <AlertDialogTitle>Notice</AlertDialogTitle>
          <AlertDialogDescription class="mt-1">
            {message}
          </AlertDialogDescription>
        </div>
      </div>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogAction onclick={onClose}>OK</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
