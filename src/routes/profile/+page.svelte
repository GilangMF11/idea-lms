<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.js';
  import FormField from '$lib/components/FormField.svelte';
  import Button from '$lib/components/Button.svelte';
  import Alert from '$lib/components/Alert.svelte';
  
  let firstName = '';
  let lastName = '';
  let email = '';
  let username = '';
  let phoneNumber = '';
  let institution = '';
  let program = '';
  let semester = '';
  let province = '';
  let city = '';
  let avatar = '';
  let role = '';
  let createdAt = '';
  
  let isEditing = false;
  let error = '';
  let success = '';
  let isLoading = false;
  let loadingProfile = true;

  onMount(async () => {
    authStore.init();
    
    // Redirect to login if not authenticated
    if (!$authStore.isAuthenticated) {
      goto('/login');
      return;
    }

    // Load profile data
    await loadProfile();
  });

  async function loadProfile() {
    try {
      loadingProfile = true;
      const token = $authStore.token;
      if (!token) {
        goto('/login');
        return;
      }

      const response = await fetch('/api/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          firstName = data.user.firstName || '';
          lastName = data.user.lastName || '';
          email = data.user.email || '';
          username = data.user.username || '';
          phoneNumber = data.user.phoneNumber || '';
          institution = data.user.institution || '';
          program = data.user.program || '';
          semester = data.user.semester?.toString() || '';
          province = data.user.province || '';
          city = data.user.city || '';
          avatar = data.user.avatar || '';
          role = data.user.role || '';
          createdAt = data.user.createdAt ? new Date(data.user.createdAt).toLocaleDateString('id-ID') : '';
        }
      } else if (response.status === 401) {
        goto('/login');
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      error = 'Gagal memuat data profil';
    } finally {
      loadingProfile = false;
    }
  }

  function startEdit() {
    isEditing = true;
    error = '';
    success = '';
  }

  function cancelEdit() {
    isEditing = false;
    error = '';
    success = '';
    // Reload original data
    loadProfile();
  }

  async function handleSubmit() {
    // Validation
    if (!firstName || !lastName || !phoneNumber || !institution || !program || !semester || !province || !city) {
      error = 'Mohon lengkapi semua field';
      return;
    }

    isLoading = true;
    error = '';
    success = '';

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

      success = 'Profil berhasil diperbarui';
      isEditing = false;
      
      // Reload profile to get updated data
      await loadProfile();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Gagal memperbarui profil';
    } finally {
      isLoading = false;
    }
  }

  function handleKeydown(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter' && isEditing) {
      handleSubmit();
    }
  }

  function getRoleLabel(role: string) {
    const labels: Record<string, string> = {
      'STUDENT': 'Mahasiswa',
      'TEACHER': 'Dosen',
      'ADMIN': 'Admin',
    };
    return labels[role] || role;
  }
</script>

<svelte:head>
  <title>Profil - IDEA</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <header class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center py-4">
        <div class="flex items-center">
          <a href="/dashboard" class="flex items-center">
            <div class="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
              <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 class="text-xl font-semibold text-gray-900">IDEA</h1>
          </a>
        </div>
        
        <div class="flex items-center space-x-4">
          <a href="/dashboard" class="text-sm text-gray-700 hover:text-gray-900">
            Dashboard
          </a>
        </div>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {#if loadingProfile}
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span class="ml-2 text-gray-600">Memuat profil...</span>
      </div>
    {:else}
      <!-- Page Header -->
      <div class="mb-8">
        <h2 class="text-3xl font-bold text-gray-900">Profil Saya</h2>
        <p class="mt-2 text-sm text-gray-600">
          Kelola informasi profil dan data pribadi Anda
        </p>
      </div>

      <!-- Success Alert -->
      {#if success}
        <div class="mb-6">
          <Alert type="success" message={success} />
        </div>
      {/if}

      <!-- Error Alert -->
      {#if error}
        <div class="mb-6">
          <Alert type="error" message={error} />
        </div>
      {/if}

      <!-- Profile Card -->
      <div class="bg-white shadow rounded-lg overflow-hidden">
        <div class="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-lg font-medium text-gray-900">Informasi Profil</h3>
          {#if !isEditing}
            <Button
              variant="primary"
              size="sm"
              on:click={startEdit}
            >
              Edit Profil
            </Button>
          {:else}
            <div class="flex space-x-2">
              <Button
                variant="secondary"
                size="sm"
                on:click={cancelEdit}
                disabled={isLoading}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                on:click={handleSubmit}
                loading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          {/if}
        </div>

        <div class="px-6 py-5 space-y-6">
          <!-- Avatar Section -->
          <div class="flex items-center space-x-4">
            <div class="h-20 w-20 bg-primary-600 rounded-full flex items-center justify-center">
              {#if avatar}
                <img src={avatar} alt="Avatar" class="h-20 w-20 rounded-full object-cover" />
              {:else}
                <span class="text-2xl font-medium text-white">
                  {firstName.charAt(0)}{lastName.charAt(0)}
                </span>
              {/if}
            </div>
            <div>
              <p class="text-lg font-medium text-gray-900">{firstName} {lastName}</p>
              <p class="text-sm text-gray-500">{email}</p>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 mt-1">
                {getRoleLabel(role)}
              </span>
            </div>
          </div>

          <!-- Form Fields -->
          {#if isEditing}
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

              <!-- Email and Username (Read-only) -->
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    class="input-field bg-gray-50 cursor-not-allowed"
                  />
                  <p class="text-xs text-gray-500">Email tidak dapat diubah</p>
                </div>

                <div class="space-y-1">
                  <label class="block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    disabled
                    class="input-field bg-gray-50 cursor-not-allowed"
                  />
                  <p class="text-xs text-gray-500">Username tidak dapat diubah</p>
                </div>
              </div>

              <!-- Phone Number -->
              <FormField
                label="No WhatsApp"
                type="tel"
                placeholder="081234567890"
                bind:value={phoneNumber}
                required
                on:keydown={handleKeydown}
              />

              <!-- Institution -->
              <FormField
                label="Institusi"
                type="text"
                placeholder="Nama Institusi"
                bind:value={institution}
                required
                on:keydown={handleKeydown}
              />

              <!-- Program -->
              <FormField
                label="Program Studi"
                type="text"
                placeholder="Nama Program Studi"
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
                  <option value="">Pilih Semester</option>
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
                  label="Provinsi"
                  type="text"
                  placeholder="Nama Provinsi"
                  bind:value={province}
                  required
                  on:keydown={handleKeydown}
                />

                <FormField
                  label="Kota"
                  type="text"
                  placeholder="Nama Kota"
                  bind:value={city}
                  required
                  on:keydown={handleKeydown}
                />
              </div>
            </form>
          {:else}
            <!-- Read-only View -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Nama Lengkap</label>
                <p class="text-sm text-gray-900">{firstName} {lastName}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Email</label>
                <p class="text-sm text-gray-900">{email}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Username</label>
                <p class="text-sm text-gray-900">{username}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Peran</label>
                <p class="text-sm text-gray-900">{getRoleLabel(role)}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">No WhatsApp</label>
                <p class="text-sm text-gray-900">{phoneNumber || '-'}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Institusi</label>
                <p class="text-sm text-gray-900">{institution || '-'}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Program Studi</label>
                <p class="text-sm text-gray-900">{program || '-'}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Semester</label>
                <p class="text-sm text-gray-900">{semester ? `Semester ${semester}` : '-'}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Provinsi</label>
                <p class="text-sm text-gray-900">{province || '-'}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Kota</label>
                <p class="text-sm text-gray-900">{city || '-'}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Bergabung Sejak</label>
                <p class="text-sm text-gray-900">{createdAt || '-'}</p>
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </main>
</div>

