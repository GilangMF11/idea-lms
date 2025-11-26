<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.js';
  import Button from '$lib/components/Button.svelte';
  import Alert from '$lib/components/Alert.svelte';

  let classes: any[] = [];
  let loading = true;
  let error = '';
  let success = '';
  let enrollingClassId: string | null = null;
  let searchTerm = '';

  // Filtered classes berdasarkan pencarian (kelas & dosen dalam satu field)
  $: filteredClasses = classes.filter((classItem) => {
    const className = (classItem.name || '').toLowerCase();
    const classDesc = (classItem.description || '').toLowerCase();
    const teacherName = `${classItem.teacher?.firstName || ''} ${classItem.teacher?.lastName || ''}`.toLowerCase();
    const term = searchTerm.toLowerCase().trim();

    if (!term) return true;

    return (
      className.includes(term) ||
      classDesc.includes(term) ||
      teacherName.includes(term)
    );
  });

  onMount(async () => {
    authStore.init();
    
    if (!$authStore.isAuthenticated) {
      goto('/login');
      return;
    }

    if ($authStore.user?.role !== 'STUDENT') {
      goto('/dashboard');
      return;
    }

    await loadAvailableClasses();
  });

  async function loadAvailableClasses() {
    try {
      loading = true;
      error = '';
      const token = $authStore.token;
      if (!token) return;

      const response = await fetch('/api/classes/available', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        classes = data.classes || [];
      } else {
        error = 'Gagal memuat daftar kelas';
      }
    } catch (err) {
      console.error('Error loading classes:', err);
      error = 'Terjadi kesalahan saat memuat data';
    } finally {
      loading = false;
    }
  }

  async function enrollToClass(classId: string) {
    try {
      enrollingClassId = classId;
      error = '';
      success = '';
      const token = $authStore.token;
      if (!token) return;

      const response = await fetch('/api/classes/enroll', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ classId }),
      });

      const data = await response.json();

      if (response.ok) {
        success = data.message || 'Berhasil mendaftar ke kelas';
        await loadAvailableClasses();
        setTimeout(() => { success = ''; }, 3000);
      } else {
        error = data.error || 'Gagal mendaftar ke kelas';
      }
    } catch (err) {
      error = 'Terjadi kesalahan saat mendaftar';
    } finally {
      enrollingClassId = null;
    }
  }

  function viewClass(classId: string) {
    goto(`/classes/${classId}`);
  }
</script>

<svelte:head>
  <title>Browse Classes - IDEA</title>
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
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Page Header -->
    <div class="mb-8">
      <h2 class="text-3xl font-bold text-gray-900">Browse Classes</h2>
      <p class="mt-2 text-sm text-gray-600">
        Jelajahi dan daftarkan diri Anda ke kelas yang tersedia
      </p>
    </div>

    <!-- Filter / Search (satu field) -->
    <div class="mb-6 bg-white shadow rounded-lg p-4 border border-gray-100">
      <div>
        <label for="searchTerm" class="block text-sm font-medium text-gray-700 mb-1">
          Cari kelas atau dosen
        </label>
        <input
          id="searchTerm"
          type="text"
          placeholder="Nama kelas, deskripsi, atau nama dosen..."
          bind:value={searchTerm}
          class="input-field"
        />
      </div>
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

    <!-- Classes Grid -->
    {#if loading}
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span class="ml-2 text-gray-600">Memuat kelas...</span>
      </div>
    {:else if classes.length === 0}
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">Tidak ada kelas tersedia</h3>
        <p class="mt-1 text-sm text-gray-500">Belum ada kelas yang dibuat.</p>
      </div>
    {:else if filteredClasses.length === 0}
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">Kelas tidak ditemukan</h3>
        <p class="mt-1 text-sm text-gray-500">
          Coba ubah kata kunci pencarian kelas atau dosen.
        </p>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each filteredClasses as classItem}
          <div class="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
            <div class="p-6">
              <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">{classItem.name}</h3>
                  <p class="text-sm text-gray-600 line-clamp-2 mb-4">
                    {classItem.description || 'Tidak ada deskripsi'}
                  </p>
                </div>
              </div>

              <div class="space-y-2 mb-4">
                <div class="flex items-center text-sm text-gray-600">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Dosen: {classItem.teacher?.firstName} {classItem.teacher?.lastName}</span>
                </div>
                <div class="flex items-center text-sm text-gray-600">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>{classItem._count?.students || 0} Mahasiswa</span>
                </div>
              </div>

              <div class="flex items-center space-x-2">
                {#if classItem.isEnrolled}
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Terdaftar
                  </span>
                  <Button variant="secondary" size="sm" fullWidth on:click={() => viewClass(classItem.id)}>
                    Lihat Kelas
                  </Button>
                {:else}
                  <Button 
                    variant="primary" 
                    size="sm" 
                    fullWidth 
                    on:click={() => enrollToClass(classItem.id)}
                    loading={enrollingClassId === classItem.id}
                    disabled={enrollingClassId !== null}
                  >
                    {enrollingClassId === classItem.id ? 'Mendaftar...' : 'Daftar Sekarang'}
                  </Button>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </main>
</div>

