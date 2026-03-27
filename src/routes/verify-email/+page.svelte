<script lang="ts">
  import type { PageData } from './$types.js';
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';

  export let data: PageData;
</script>

<svelte:head>
  <title>Email Verification - IDEA</title>
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
      Email Verification
    </h2>
  </div>

  <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
    <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
      {#if data.success}
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-6">
          <svg class="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Verification Successful!</h3>
        <p class="text-sm text-gray-500 mb-6">{data.message}</p>
        <div class="mt-6">
          <Button on:click={() => goto('/login')} fullWidth variant="primary">
            Go to Login
          </Button>
        </div>
      {:else}
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-6">
          <svg class="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Verification Failed</h3>
        <p class="text-sm text-gray-500 mb-6">{data.message}</p>
        <div class="mt-6 flex flex-col space-y-4">
          <Button on:click={() => goto('/login')} fullWidth variant="secondary">
            Return to Login
          </Button>
        </div>
      {/if}
    </div>
  </div>
</div>
