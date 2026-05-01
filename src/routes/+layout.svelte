<script>
  import '../app.css';
  import { authStore } from '$lib/stores/auth.js';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';

  onMount(() => {
    // Initialize token from localStorage on mount
    authStore.init();
  });

  // Global Auth Guard
  // Define routes that do not require authentication
  const publicRoutes = ['/login', '/register', '/reset-password', '/verify-email'];

  $: if (browser && $authStore) {
    const path = $page.url.pathname;
    const isPublicRoute = publicRoutes.some(r => path === r || path.startsWith(r + '/')) || path === '/';

    if (!isPublicRoute && !$authStore.isAuthenticated) {
      // Small check to prevent premature redirect if still initializing
      if (!localStorage.getItem('auth_state')) {
        goto('/login');
      }
    } else if ($authStore.isAuthenticated && (path === '/login' || path === '/register')) {
      // Redirect logged-in users away from auth pages
      goto('/dashboard');
    }
  }
</script>

<slot />
