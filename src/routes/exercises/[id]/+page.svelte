<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  // Client-side fallback redirect (server redirect is in +page.ts)
  onMount(() => {
    goto(`/submissions/${$page.params.id}`, { replaceState: true });
  });
</script>

<svelte:head>
  <title>Redirecting... - IDEA</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center">
  <div class="text-center">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
    <p class="text-sm text-gray-500 mt-4">Redirecting to exit ticket...</p>
  </div>
</div>
