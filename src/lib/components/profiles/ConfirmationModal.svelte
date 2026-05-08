<script lang="ts">
  import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
  } from '$lib/components/ui/alert-dialog';
  import { cn } from '$lib/utils.js';

  interface Props {
    title: string;
    message: string;
    confirmText: string;
    confirmColor?: 'blue' | 'orange' | 'red';
    onConfirm: () => void;
    onCancel: () => void;
  }

  let {
    title,
    message,
    confirmText,
    confirmColor = 'blue',
    onConfirm,
    onCancel,
  }: Props = $props();

  let open = $state(true);

  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700 text-white',
    orange: 'bg-orange-600 hover:bg-orange-700 text-white',
    red: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
  } as const;

  function handleOpenChange(value: boolean) {
    open = value;
    if (!value) onCancel();
  }
</script>

<AlertDialog bind:open onOpenChange={handleOpenChange}>
  <AlertDialogContent class="glassmorphism-card">
    <AlertDialogHeader>
      <AlertDialogTitle>{title}</AlertDialogTitle>
      <AlertDialogDescription>
        {@html message}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onclick={onCancel}>Cancel</AlertDialogCancel>
      <AlertDialogAction class={cn('glassmorphism-button', colorClasses[confirmColor])} onclick={onConfirm}>
        {confirmText}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
