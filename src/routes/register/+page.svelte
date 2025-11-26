<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.js';
  import FormField from '$lib/components/FormField.svelte';
  import Button from '$lib/components/Button.svelte';
  import Alert from '$lib/components/Alert.svelte';
  
  let email = '';
  let username = '';
  let password = '';
  let confirmPassword = '';
  let firstName = '';
  let lastName = '';
  let role: 'STUDENT' | 'TEACHER' | 'ADMIN' = 'STUDENT';
  let error = '';
  let isLoading = false;
  let showPassword = false;
  let showConfirmPassword = false;
  
  // Subscribe to auth store
  $: if ($authStore.isAuthenticated) {
    goto('/dashboard');
  }
  
  onMount(() => {
    authStore.init();
  });
  
  async function handleRegister() {
    // Validation
    if (!email || !username || !password || !confirmPassword || !firstName || !lastName) {
      error = 'Please fill in all fields';
      return;
    }
    
    if (password !== confirmPassword) {
      error = 'Passwords do not match';
      return;
    }
    
    if (password.length < 6) {
      error = 'Password must be at least 6 characters long';
      return;
    }
    
    isLoading = true;
    error = '';
    
    const result = await authStore.register({
      email,
      username,
      password,
      firstName,
      lastName,
      role
    });
    
    if (result.success) {
      goto('/dashboard');
    } else {
      error = result.error || 'Registration failed';
    }
    
    isLoading = false;
  }
  
  function handleKeydown(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter') {
      handleRegister();
    }
  }
  
  function togglePasswordVisibility() {
    showPassword = !showPassword;
  }
  
  function toggleConfirmPasswordVisibility() {
    showConfirmPassword = !showConfirmPassword;
  }
</script>

<svelte:head>
  <title>Register - LMS Light</title>
</svelte:head>

<div class="auth-container">
  <div class="auth-card">
    <!-- Header -->
    <div class="text-center mb-8">
      <div class="mx-auto h-12 w-12 bg-primary-600 rounded-xl flex items-center justify-center mb-4">
        <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      </div>
      <h2 class="text-3xl font-bold text-gray-900">Create your account</h2>
      <p class="mt-2 text-sm text-gray-600">
        Join our learning management system
      </p>
    </div>

    <!-- Error Alert -->
    {#if error}
      <div class="mb-6">
        <Alert type="error" message={error} />
      </div>
    {/if}

    <!-- Register Form -->
    <form on:submit|preventDefault={handleRegister} class="space-y-6">
      <!-- Name Fields -->
      <div class="grid grid-cols-2 gap-4">
        <FormField
          label="First Name"
          type="text"
          placeholder="John"
          bind:value={firstName}
          required
          on:keydown={handleKeydown}
        />

        <FormField
          label="Last Name"
          type="text"
          placeholder="Doe"
          bind:value={lastName}
          required
          on:keydown={handleKeydown}
        />
      </div>

      <!-- Email -->
      <FormField
        label="Email"
        type="email"
        placeholder="john@example.com"
        bind:value={email}
        required
        on:keydown={handleKeydown}
      />

      <!-- Username -->
      <FormField
        label="Username"
        type="text"
        placeholder="johndoe"
        bind:value={username}
        required
        on:keydown={handleKeydown}
      />

      <!-- Role Selection -->
      <div class="space-y-1">
        <label for="role" class="block text-sm font-medium text-gray-700">
          Role <span class="text-red-500">*</span>
        </label>
        <select
          id="role"
          bind:value={role}
          class="input-field"
          required
        >
          <option value="STUDENT">Student</option>
          <option value="TEACHER">Teacher</option>
          <option value="ADMIN">Admin</option>
        </select>
        <p class="text-xs text-gray-500">Choose your role in the system</p>
      </div>

      <!-- Password -->
      <div class="space-y-1">
        <label for="password" class="block text-sm font-medium text-gray-700">
          Password <span class="text-red-500">*</span>
        </label>
        <div class="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            bind:value={password}
            required
            class="input-field pr-10"
            on:keydown={handleKeydown}
          />
          <button
            type="button"
            class="absolute inset-y-0 right-0 pr-3 flex items-center"
            on:click={togglePasswordVisibility}
          >
            {#if showPassword}
              <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            {:else}
              <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            {/if}
          </button>
        </div>
        <p class="text-xs text-gray-500">Must be at least 6 characters</p>
      </div>

      <!-- Confirm Password -->
      <div class="space-y-1">
        <label for="confirmPassword" class="block text-sm font-medium text-gray-700">
          Confirm Password <span class="text-red-500">*</span>
        </label>
        <div class="relative">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm your password"
            bind:value={confirmPassword}
            required
            class="input-field pr-10"
            on:keydown={handleKeydown}
          />
          <button
            type="button"
            class="absolute inset-y-0 right-0 pr-3 flex items-center"
            on:click={toggleConfirmPasswordVisibility}
          >
            {#if showConfirmPassword}
              <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            {:else}
              <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            {/if}
          </button>
        </div>
      </div>

      <!-- Terms and Conditions -->
      <div class="flex items-start">
        <div class="flex items-center h-5">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            required
            class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
        </div>
        <div class="ml-3 text-sm">
          <label for="terms" class="text-gray-700">
            I agree to the
            <a href="/terms" class="font-medium text-primary-600 hover:text-primary-500">Terms and Conditions</a>
            and
            <a href="/privacy" class="font-medium text-primary-600 hover:text-primary-500">Privacy Policy</a>
          </label>
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
        {isLoading ? 'Creating account...' : 'Create account'}
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

    <!-- Social Login (Optional) -->
    <div class="mt-6 grid grid-cols-2 gap-3">
      <Button variant="secondary" size="md" fullWidth>
        <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Google
      </Button>

      <Button variant="secondary" size="md" fullWidth>
        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
        Facebook
      </Button>
    </div>

    <!-- Sign In Link -->
    <div class="mt-8 text-center">
      <p class="text-sm text-gray-600">
        Already have an account?
        <a href="/login" class="font-medium text-primary-600 hover:text-primary-500 ml-1">
          Sign in
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

