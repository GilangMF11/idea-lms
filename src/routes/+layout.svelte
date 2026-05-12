<script>
  import '../app.css';
  import { authStore } from '$lib/stores/auth.js';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';

  onMount(() => {
    // Initialize token from localStorage on mount (single source of truth)
    authStore.init();
  });

  // Global Auth Guard
  // Define routes that do not require authentication
  const publicRoutes = ['/login', '/register', '/reset-password', '/verify-email'];

  $: if (browser && $authStore) {
    const path = $page.url.pathname;
    const isPublicRoute = publicRoutes.some(r => path === r || path.startsWith(r + '/')) || path === '/';

    // IMPORTANT: Don't redirect while auth is still loading/initializing
    if ($authStore.isLoading) {
      // Do nothing — wait for init() to finish
    } else if (!isPublicRoute && !$authStore.isAuthenticated) {
      goto('/login');
    } else if ($authStore.isAuthenticated && (path === '/login' || path === '/register')) {
      // Redirect logged-in users away from auth pages
      goto('/dashboard');
    }
  }
</script>

{#if $authStore.isLoading}
  <!-- Show minimal loading state while auth initializes to prevent flash -->
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
  </div>
{:else}
  <slot />
{/if}
