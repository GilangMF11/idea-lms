<script lang="ts">
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
</script>

<svelte:head>
  <title>Verification Pending - IDEA</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
  <div class="sm:mx-auto sm:w-full sm:max-w-md">
    <div class="flex justify-center">
      <div class="h-16 w-16 bg-primary-600 rounded-2xl flex items-center justify-center transform rotate-12 shadow-lg">
        <svg class="h-10 w-10 text-white transform -rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
    </div>
    <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
      Check your email
    </h2>
  </div>

  <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
    <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 mb-6">
        <svg class="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">Registration Successful!</h3>
      <p class="text-sm text-gray-500 mb-6">
        We've sent a verification link to your email address. Please check your inbox and click the link to verify your account so you can log in.
      </p>
      <div class="mt-6 flex flex-col space-y-4">
        <Button on:click={() => goto('/login')} fullWidth variant="primary">
          Return to Login
        </Button>
      </div>
    </div>
  </div>
</div>
