<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  // Redirect legacy /assignments URL to /exit-tickets
  onMount(() => {
    goto('/exit-tickets', { replaceState: true });
  });
</script>

<svelte:head>
  <title>Redirecting - IDEA</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
  <div class="text-center">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
    <p class="text-sm text-gray-500 mt-4">Redirecting to Exit Tickets...</p>
  </div>
</div>
