<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { authStore } from '$lib/stores/auth.js';
  import FormField from '$lib/components/FormField.svelte';
  import Button from '$lib/components/Button.svelte';
  import Alert from '$lib/components/Alert.svelte';
  
  let firstName = '';
  let lastName = '';
  let phoneNumber = '';
  let institution = '';
  let program = '';
  let semester = '';
  let province = '';
  let city = '';
  let error = '';
  let isLoading = false;

  onMount(async () => {
    authStore.init();
    
    // Sync auth from cookie FIRST if OAuth success (before checking authentication)
    const oauthSuccess = $page.url.searchParams.get('oauth_success') === 'true';
    let synced = false;
    
    if (oauthSuccess) {
      try {
        const response = await fetch('/api/auth/sync', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.user && data.token) {
            if (typeof window !== 'undefined') {
              localStorage.setItem('auth_token', data.token);
              localStorage.setItem('auth_user', JSON.stringify(data.user));
            }
            // Re-init auth store to load from localStorage
            authStore.init();
            synced = true;
            
            // Remove query parameter without causing re-render
            if (typeof window !== 'undefined' && window.history.replaceState) {
              const url = new URL(window.location.href);
              url.searchParams.delete('oauth_success');
              window.history.replaceState({}, '', url.toString());
            }
          } else {
            console.error('Auth sync failed: no user data');
            goto('/login?error=sync_failed');
            return;
          }
        } else {
          console.error('Auth sync failed:', await response.text());
          goto('/login?error=sync_failed');
          return;
        }
      } catch (err) {
        console.error('Auth sync error:', err);
        goto('/login?error=sync_error');
        return;
      }
    }
    
    // If we just synced, check localStorage directly instead of relying on reactive state
    if (synced && typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('auth_user');
      if (token && userStr) {
        // User is authenticated, continue to load profile
        // Don't redirect to login
      } else {
        goto('/login');
        return;
      }
    } else {
      // Redirect to login if not authenticated (only if we didn't just sync)
      if (!$authStore.isAuthenticated) {
        goto('/login');
        return;
      }
    }

    // Load existing profile data if available
    loadProfileData();
  });

  async function loadProfileData() {
    // Load from authStore first (might have data from OAuth)
    if ($authStore.user) {
      firstName = $authStore.user.firstName || firstName;
      lastName = $authStore.user.lastName || lastName;
    }

    try {
      const token = $authStore.token;
      if (!token) return;

      const response = await fetch('/api/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          firstName = data.user.firstName || firstName;
          lastName = data.user.lastName || lastName;
          phoneNumber = data.user.phoneNumber || '';
          institution = data.user.institution || '';
          program = data.user.program || '';
          semester = data.user.semester?.toString() || '';
          province = data.user.province || '';
          city = data.user.city || '';
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  }

  async function handleSubmit() {
    // Validation
    if (!firstName || !lastName || !phoneNumber || !institution || !program || !semester || !province || !city) {
      error = 'Mohon lengkapi semua field';
      return;
    }

    isLoading = true;
    error = '';

    try {
      const token = $authStore.token;
      if (!token) {
        error = 'Tidak ada token autentikasi';
        isLoading = false;
        return;
      }

      const response = await fetch('/api/me/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          phoneNumber,
          institution,
          program,
          semester: parseInt(semester),
          province,
          city,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal memperbarui profil');
      }

      // Update auth store with new user data
      if (data.user) {
        if (typeof window !== 'undefined') {
          const currentUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
          const updatedUser = { ...currentUser, ...data.user };
          localStorage.setItem('auth_user', JSON.stringify(updatedUser));
        }
        authStore.init();
      }

      // Redirect to dashboard
      console.log('Profile updated successfully, redirecting to dashboard');
      goto('/dashboard');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Gagal memperbarui profil';
    } finally {
      isLoading = false;
    }
  }

  function handleKeydown(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter') {
      handleSubmit();
    }
  }
</script>

<svelte:head>
  <title>Lengkapi Profil - IDEA</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
    <!-- Header -->
    <div class="text-center">
      <div class="mx-auto h-12 w-12 bg-primary-600 rounded-xl flex items-center justify-center mb-4">
        <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      <h2 class="text-3xl font-bold text-gray-900">Lengkapi Profil Anda</h2>
      <p class="mt-2 text-sm text-gray-600">
        Mohon lengkapi data diri Anda untuk melanjutkan
      </p>
    </div>

    <!-- Error Alert -->
    {#if error}
      <div class="mb-6">
        <Alert type="error" message={error} />
      </div>
    {/if}

    <!-- Profile Form -->
    <form on:submit|preventDefault={handleSubmit} class="space-y-6">
      <!-- Name Fields -->
      <div class="grid grid-cols-2 gap-4">
        <FormField
          label="Nama Depan"
          type="text"
          placeholder="John"
          bind:value={firstName}
          required
          on:keydown={handleKeydown}
        />

        <FormField
          label="Nama Belakang"
          type="text"
          placeholder="Doe"
          bind:value={lastName}
          required
          on:keydown={handleKeydown}
        />
      </div>

      <!-- Phone Number -->
      <FormField
        label="WhatsApp Number"
        type="tel"
        placeholder="e.g. 081234567890"
        bind:value={phoneNumber}
        required
        on:keydown={handleKeydown}
      />

      <!-- Institution -->
      <FormField
        label="Institution"
        type="text"
        placeholder="Institution name"
        bind:value={institution}
        required
        on:keydown={handleKeydown}
      />

      <!-- Study Program -->
      <FormField
        label="Study Program"
        type="text"
        placeholder="Study program name"
        bind:value={program}
        required
        on:keydown={handleKeydown}
      />

      <!-- Semester -->
      <div class="space-y-1">
        <label for="semester" class="block text-sm font-medium text-gray-700">
          Semester <span class="text-red-500">*</span>
        </label>
        <select
          id="semester"
          bind:value={semester}
          class="input-field"
          required
        >
          <option value="">Select Semester</option>
          <option value="1">Semester 1</option>
          <option value="2">Semester 2</option>
          <option value="3">Semester 3</option>
          <option value="4">Semester 4</option>
          <option value="5">Semester 5</option>
          <option value="6">Semester 6</option>
          <option value="7">Semester 7</option>
          <option value="8">Semester 8</option>
        </select>
      </div>

      <!-- Province and City -->
      <div class="grid grid-cols-2 gap-4">
        <FormField
          label="Province"
          type="text"
          placeholder="Province name"
          bind:value={province}
          required
          on:keydown={handleKeydown}
        />

        <FormField
          label="City"
          type="text"
          placeholder="City name"
          bind:value={city}
          required
          on:keydown={handleKeydown}
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={isLoading}
        disabled={isLoading}
      >
        {isLoading ? 'Menyimpan...' : 'Simpan & Lanjutkan'}
      </Button>
    </form>
  </div>
</div>

