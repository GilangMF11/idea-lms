<script lang="ts">
  import type { PageData } from './$types.js';
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';

  export let data: PageData;

  let newPassword = '';
  let confirmPassword = '';
  let isLoading = false;
  let error = '';
  let successMessage = '';

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!data.valid) return;
    
    if (newPassword.length < 6) {
      error = 'Password must be at least 6 characters long.';
      return;
    }

    if (newPassword !== confirmPassword) {
      error = 'Passwords do not match.';
      return;
    }

    isLoading = true;
    error = '';

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: data.token,
          newPassword,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        successMessage = result.message || 'Password has been reset successfully.';
        setTimeout(() => {
          goto('/login');
        }, 3000);
      } else {
        error = result.error || 'Something went wrong. Please try again.';
      }
    } catch (err) {
      error = 'A network error occurred. Please try again later.';
    } finally {
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Reset Password - IDEA</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
  <div class="sm:mx-auto sm:w-full sm:max-w-md">
    <div class="flex justify-center">
      <div class="h-16 w-16 bg-primary-600 rounded-2xl flex items-center justify-center transform rotate-12 shadow-lg">
        <svg class="h-10 w-10 text-white transform -rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>
    </div>
    <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
      Reset Password
    </h2>
  </div>

  <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
    <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
      {#if !data.valid}
        <div class="text-center">
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-6">
            <svg class="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Invalid Link</h3>
          <p class="text-sm text-gray-500 mb-6">{data.message}</p>
          <Button on:click={() => goto('/forgot-password')} fullWidth variant="primary">
            Request New Link
          </Button>
        </div>
      {:else}
        {#if successMessage}
          <div class="text-center">
            <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-6">
              <svg class="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Password Reset!</h3>
            <p class="text-sm text-gray-500 mb-6">{successMessage}<br/>Redirecting to login...</p>
            <Button on:click={() => goto('/login')} fullWidth variant="primary">
              Go to Login
            </Button>
          </div>
        {:else}
          {#if error}
            <div class="rounded-md bg-red-50 p-4 mb-6">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          {/if}

          <p class="text-sm text-gray-600 mb-6 text-center">
            Enter a new password for <strong>{data.email}</strong>
          </p>

          <form class="space-y-6" on:submit={handleSubmit}>
            <div>
              <label for="newPassword" class="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div class="mt-1 relative rounded-md shadow-sm">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="newPassword"
                  type="password"
                  required
                  bind:value={newPassword}
                  disabled={isLoading}
                  class="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-lg disabled:opacity-50 transition-colors"
                  placeholder="At least 6 characters"
                  minlength="6"
                />
              </div>
            </div>

            <div>
              <label for="confirmPassword" class="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div class="mt-1 relative rounded-md shadow-sm">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  bind:value={confirmPassword}
                  disabled={isLoading}
                  class="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-lg disabled:opacity-50 transition-colors"
                  placeholder="Repeat new password"
                  minlength="6"
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={isLoading}
              >
                Reset Password
              </Button>
            </div>
          </form>
        {/if}
      {/if}
    </div>
  </div>
</div>
