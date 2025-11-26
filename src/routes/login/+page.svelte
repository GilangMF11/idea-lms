<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { authStore } from '$lib/stores/auth.js';
  import FormField from '$lib/components/FormField.svelte';
  import Button from '$lib/components/Button.svelte';
  import Alert from '$lib/components/Alert.svelte';
  
  let email = '';
  let password = '';
  let error = '';
  let isLoading = false;

  // Check for OAuth errors in URL
  $: {
    const errorParam = $page.url.searchParams.get('error');
    if (errorParam) {
      if (errorParam === 'google_auth_failed') {
        error = 'Autentikasi Google gagal';
      } else if (errorParam === 'no_code') {
        error = 'Kode autentikasi tidak ditemukan';
      } else if (errorParam === 'token_exchange_failed') {
        error = 'Gagal menukar kode autentikasi';
      } else if (errorParam === 'authentication_failed') {
        error = 'Autentikasi gagal';
      } else if (errorParam === 'internal_error') {
        error = 'Terjadi kesalahan internal';
      }
    }
  }
  
  // Subscribe to auth store
  $: if ($authStore.isAuthenticated) {
    goto('/dashboard');
  }
  
  onMount(() => {
    authStore.init();
  });
  
  async function handleLogin() {
    if (!email || !password) {
      error = 'Mohon lengkapi semua field';
      return;
    }
    
    isLoading = true;
    error = '';
    
    const result = await authStore.login(email, password);
    
    if (result.success) {
      goto('/dashboard');
    } else {
      error = result.error || 'Login failed';
    }
    
    isLoading = false;
  }
  
  function handleKeydown(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter') {
      handleLogin();
    }
  }

  function handleGoogleLogin() {
    window.location.href = '/api/auth/google';
  }
</script>

<svelte:head>
  <title>Login - IDEA</title>
</svelte:head>

<div class="auth-container">
  <div class="auth-card">
    <!-- Header -->
    <div class="text-center mb-8">
      <div class="mx-auto h-12 w-12 bg-primary-600 rounded-xl flex items-center justify-center mb-4">
        <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>
      <h2 class="text-3xl font-bold text-gray-900">Welcome Back</h2>
      <p class="mt-2 text-sm text-gray-600">
        Sign in to your account to continue
      </p>
    </div>

    <!-- Error Alert -->
    {#if error}
      <div class="mb-6">
        <Alert type="error" message={error} />
      </div>
    {/if}

    <!-- Login Form -->
    <form on:submit|preventDefault={handleLogin} class="space-y-6">
      <FormField
        label="Email"
        type="email"
        placeholder="Enter your email"
        bind:value={email}
        required
        on:keydown={handleKeydown}
      />

      <FormField
        label="Password"
        type="password"
        placeholder="Enter your password"
        bind:value={password}
        required
        on:keydown={handleKeydown}
      />

      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label for="remember-me" class="ml-2 block text-sm text-gray-700">
            Ingat saya
          </label>
        </div>

        <div class="text-sm">
          <a href="/forgot-password" class="font-medium text-primary-600 hover:text-primary-500">
            Lupa password?
          </a>
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={isLoading}
        disabled={isLoading}
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>

    <!-- Divider -->
    <div class="mt-8">
      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-gray-300"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>
    </div>

    <!-- Social Login -->
    <div class="mt-6">
      <Button 
        variant="secondary" 
        size="md" 
        fullWidth
        on:click={handleGoogleLogin}
        disabled={isLoading}
      >
        <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      </Button>
    </div>

    <!-- Sign Up Link -->
    <div class="mt-8 text-center">
      <p class="text-sm text-gray-600">
        Don't have an account?
        <a href="/register" class="font-medium text-primary-600 hover:text-primary-500 ml-1">
          Sign Up
        </a>
      </p>
    </div>
  </div>
</div>

<!-- Background Pattern -->
<div class="fixed inset-0 -z-10 overflow-hidden">
  <div class="absolute -top-40 -right-32 w-80 h-80 bg-primary-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
  <div class="absolute -bottom-40 -left-32 w-80 h-80 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
  <div class="absolute top-40 left-40 w-80 h-80 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
</div>

