<script>
  import '../app.css';
  import { authStore } from '$lib/stores/auth.js';
  import { onMount } from 'svelte';

  onMount(() => {
    authStore.init();
  });
</script>

<slot />
