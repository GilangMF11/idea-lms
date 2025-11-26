<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.js';
  import Button from '$lib/components/Button.svelte';
  import Alert from '$lib/components/Alert.svelte';
  import FormField from '$lib/components/FormField.svelte';
  
  let users: any[] = [];
  let loading = true;
  let error = '';
  let success = '';
  let searchQuery = '';
  let roleFilter = '';
  let statusFilter = '';
  let totalUsers = 0;
  let currentPage = 1;
  let pageSize = 20;
  
  // Edit modal
  let showEditModal = false;
  let editingUser: any = null;
  let editFirstName = '';
  let editLastName = '';
  let editEmail = '';
  let editRole: 'STUDENT' | 'TEACHER' | 'ADMIN' = 'STUDENT';
  let editIsActive = true;
  let editPhoneNumber = '';
  let editInstitution = '';
  let editProgram = '';
  let editSemester = '';
  let editProvince = '';
  let editCity = '';
  let isSaving = false;

  onMount(async () => {
    authStore.init();
    
    // Check authentication and admin role
    if (!$authStore.isAuthenticated) {
      goto('/login');
      return;
    }

    if ($authStore.user?.role !== 'ADMIN') {
      goto('/dashboard');
      return;
    }

    await loadUsers();
  });

  async function loadUsers() {
    try {
      loading = true;
      error = '';
      const token = $authStore.token;
      if (!token) {
        goto('/login');
        return;
      }

      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter !== '') params.append('isActive', statusFilter);
      params.append('limit', pageSize.toString());
      params.append('offset', ((currentPage - 1) * pageSize).toString());

      const response = await fetch(`/api/users?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        users = data.users || [];
        totalUsers = data.total || 0;
      } else if (response.status === 403) {
        error = 'Anda tidak memiliki akses untuk melihat daftar user';
        goto('/dashboard');
      } else {
        error = 'Gagal memuat daftar user';
      }
    } catch (err) {
      console.error('Error loading users:', err);
      error = 'Terjadi kesalahan saat memuat data';
    } finally {
      loading = false;
    }
  }

  function handleSearch() {
    currentPage = 1;
    loadUsers();
  }

  function handleFilter() {
    currentPage = 1;
    loadUsers();
  }

  function openEditModal(user: any) {
    editingUser = user;
    editFirstName = user.firstName || '';
    editLastName = user.lastName || '';
    editEmail = user.email || '';
    editRole = user.role || 'STUDENT';
    editIsActive = user.isActive !== undefined ? user.isActive : true;
    editPhoneNumber = user.phoneNumber || '';
    editInstitution = user.institution || '';
    editProgram = user.program || '';
    editSemester = user.semester?.toString() || '';
    editProvince = user.province || '';
    editCity = user.city || '';
    showEditModal = true;
  }

  function closeEditModal() {
    showEditModal = false;
    editingUser = null;
  }

  async function handleSave() {
    if (!editingUser) return;

    isSaving = true;
    error = '';
    success = '';

    try {
      const token = $authStore.token;
      if (!token) return;

      const response = await fetch(`/api/users?id=${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          role: editRole,
          isActive: editIsActive,
          phoneNumber: editPhoneNumber,
          institution: editInstitution,
          program: editProgram,
          semester: editSemester ? parseInt(editSemester) : null,
          province: editProvince,
          city: editCity,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        success = 'User berhasil diperbarui';
        closeEditModal();
        await loadUsers();
        setTimeout(() => { success = ''; }, 3000);
      } else {
        error = data.error || 'Gagal memperbarui user';
      }
    } catch (err) {
      error = 'Terjadi kesalahan saat memperbarui user';
    } finally {
      isSaving = false;
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm('Apakah Anda yakin ingin menonaktifkan user ini?')) {
      return;
    }

    try {
      const token = $authStore.token;
      if (!token) return;

      const response = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        success = 'User berhasil dinonaktifkan';
        await loadUsers();
        setTimeout(() => { success = ''; }, 3000);
      } else {
        const data = await response.json();
        error = data.error || 'Gagal menonaktifkan user';
      }
    } catch (err) {
      error = 'Terjadi kesalahan saat menonaktifkan user';
    }
  }

  async function toggleUserStatus(user: any) {
    try {
      const token = $authStore.token;
      if (!token) return;

      const response = await fetch(`/api/users?id=${user.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !user.isActive,
        }),
      });

      if (response.ok) {
        await loadUsers();
      } else {
        const data = await response.json();
        error = data.error || 'Gagal mengubah status user';
      }
    } catch (err) {
      error = 'Terjadi kesalahan saat mengubah status user';
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

  const totalPages = Math.ceil(totalUsers / pageSize);
</script>

<svelte:head>
  <title>Manage Users - IDEA</title>
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
      <h2 class="text-3xl font-bold text-gray-900">Manage Users</h2>
      <p class="mt-2 text-sm text-gray-600">
        Kelola semua user dalam sistem
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

    <!-- Filters and Search -->
    <div class="bg-white shadow rounded-lg p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Search -->
        <div class="md:col-span-2">
          <label for="searchQuery" class="block text-sm font-medium text-gray-700 mb-1">Cari User</label>
          <input
            id="searchQuery"
            type="text"
            placeholder="Nama, email, atau username..."
            bind:value={searchQuery}
            on:keydown={(e) => {
              if (e instanceof KeyboardEvent && e.key === 'Enter') {
                handleSearch();
              }
            }}
            class="input-field"
          />
        </div>

        <!-- Role Filter -->
        <div>
          <label for="roleFilter" class="block text-sm font-medium text-gray-700 mb-1">Filter Peran</label>
          <select
            id="roleFilter"
            bind:value={roleFilter}
            on:change={handleFilter}
            class="input-field"
          >
            <option value="">Semua Peran</option>
            <option value="STUDENT">Mahasiswa</option>
            <option value="TEACHER">Dosen</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <!-- Status Filter -->
        <div>
          <label for="statusFilter" class="block text-sm font-medium text-gray-700 mb-1">Filter Status</label>
          <select
            id="statusFilter"
            bind:value={statusFilter}
            on:change={handleFilter}
            class="input-field"
          >
            <option value="">Semua Status</option>
            <option value="true">Aktif</option>
            <option value="false">Tidak Aktif</option>
          </select>
        </div>
      </div>

      <div class="mt-4">
        <Button variant="primary" size="sm" on:click={handleSearch}>
          Cari
        </Button>
      </div>
    </div>

    <!-- Users Table -->
    <div class="bg-white shadow rounded-lg overflow-hidden">
      {#if loading}
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span class="ml-2 text-gray-600">Memuat data...</span>
        </div>
      {:else if users.length === 0}
        <div class="text-center py-12">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">Tidak ada user</h3>
          <p class="mt-1 text-sm text-gray-500">Tidak ada user yang ditemukan.</p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peran</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institusi</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bergabung</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each users as user}
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="h-10 w-10 bg-primary-600 rounded-full flex items-center justify-center">
                        <span class="text-sm font-medium text-white">
                          {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                        </span>
                      </div>
                      <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div class="text-sm text-gray-500">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">{user.institution || '-'}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    {#if user.isActive}
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Aktif
                      </span>
                    {:else}
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Tidak Aktif
                      </span>
                    {/if}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('id-ID')}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex items-center justify-end space-x-2">
                      <button
                        type="button"
                        on:click={() => openEditModal(user)}
                        class="text-primary-600 hover:text-primary-900"
                        title="Edit"
                      >
                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        on:click={() => toggleUserStatus(user)}
                        class={user.isActive ? "text-yellow-600 hover:text-yellow-900" : "text-green-600 hover:text-green-900"}
                        title={user.isActive ? "Nonaktifkan" : "Aktifkan"}
                      >
                        {#if user.isActive}
                          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        {:else}
                          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        {/if}
                      </button>
                      {#if user.id !== $authStore.user?.id}
                        <button
                          type="button"
                          on:click={() => handleDelete(user.id)}
                          class="text-red-600 hover:text-red-900"
                          title="Hapus"
                        >
                          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      {/if}
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        {#if totalPages > 1}
          <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div class="flex-1 flex justify-between sm:hidden">
              <button
                type="button"
                on:click={() => { currentPage = Math.max(1, currentPage - 1); loadUsers(); }}
                disabled={currentPage === 1}
                class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                on:click={() => { currentPage = Math.min(totalPages, currentPage + 1); loadUsers(); }}
                disabled={currentPage === totalPages}
                class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Selanjutnya
              </button>
            </div>
            <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p class="text-sm text-gray-700">
                  Menampilkan <span class="font-medium">{(currentPage - 1) * pageSize + 1}</span> sampai <span class="font-medium">{Math.min(currentPage * pageSize, totalUsers)}</span> dari <span class="font-medium">{totalUsers}</span> user
                </p>
              </div>
              <div>
                <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    type="button"
                    on:click={() => { currentPage = Math.max(1, currentPage - 1); loadUsers(); }}
                    disabled={currentPage === 1}
                    class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Sebelumnya
                  </button>
                  {#each Array(totalPages) as _, i}
                    {#if i + 1 === currentPage || i + 1 === 1 || i + 1 === totalPages || (i + 1 >= currentPage - 1 && i + 1 <= currentPage + 1)}
                      <button
                        type="button"
                        on:click={() => { currentPage = i + 1; loadUsers(); }}
                        class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium {i + 1 === currentPage ? 'text-primary-600 bg-primary-50' : 'text-gray-700 hover:bg-gray-50'}"
                      >
                        {i + 1}
                      </button>
                    {:else if i + 1 === currentPage - 2 || i + 1 === currentPage + 2}
                      <span class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                        ...
                      </span>
                    {/if}
                  {/each}
                  <button
                    type="button"
                    on:click={() => { currentPage = Math.min(totalPages, currentPage + 1); loadUsers(); }}
                    disabled={currentPage === totalPages}
                    class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Selanjutnya
                  </button>
                </nav>
              </div>
            </div>
          </div>
        {/if}
      {/if}
    </div>
  </main>
</div>

<!-- Edit User Modal -->
{#if showEditModal && editingUser}
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
    role="dialog"
    aria-modal="true"
    aria-labelledby="edit-user-title"
    tabindex="-1"
    on:click={closeEditModal}
    on:keydown={(e) => {
      if (e instanceof KeyboardEvent && e.key === 'Escape') {
        closeEditModal();
      }
    }}
  >
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div 
      class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" 
      role="document"
      on:click|stopPropagation
    >
      <div class="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
        <h3 id="edit-user-title" class="text-lg font-medium text-gray-900">Edit User</h3>
        <button
          type="button"
          on:click={closeEditModal}
          class="text-gray-400 hover:text-gray-500"
          aria-label="Tutup modal"
        >
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="px-6 py-5 space-y-6">
        <!-- Name Fields -->
        <div class="grid grid-cols-2 gap-4">
          <FormField
            label="Nama Depan"
            type="text"
            bind:value={editFirstName}
            required
          />
          <FormField
            label="Nama Belakang"
            type="text"
            bind:value={editLastName}
            required
          />
        </div>

        <!-- Email (Read-only) -->
        <div>
          <label for="editEmail" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            id="editEmail"
            type="email"
            value={editEmail}
            disabled
            class="input-field bg-gray-50 cursor-not-allowed"
          />
          <p class="text-xs text-gray-500 mt-1">Email tidak dapat diubah</p>
        </div>

        <!-- Role -->
        <div>
          <label for="editRole" class="block text-sm font-medium text-gray-700 mb-1">Peran</label>
          <select id="editRole" bind:value={editRole} class="input-field">
            <option value="STUDENT">Mahasiswa</option>
            <option value="TEACHER">Dosen</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <!-- Status -->
        <div class="flex items-center">
          <input
            type="checkbox"
            id="editIsActive"
            bind:checked={editIsActive}
            class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label for="editIsActive" class="ml-2 block text-sm text-gray-700">
            User Aktif
          </label>
        </div>

        <!-- Biodata Fields -->
        <div class="border-t border-gray-200 pt-4">
          <h4 class="text-sm font-medium text-gray-900 mb-4">Informasi Tambahan</h4>
          
          <FormField
            label="No WhatsApp"
            type="tel"
            bind:value={editPhoneNumber}
          />

          <FormField
            label="Institusi"
            type="text"
            bind:value={editInstitution}
          />

          <FormField
            label="Program Studi"
            type="text"
            bind:value={editProgram}
          />

          <div>
            <label for="editSemester" class="block text-sm font-medium text-gray-700 mb-1">Semester</label>
            <select id="editSemester" bind:value={editSemester} class="input-field">
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

          <div class="grid grid-cols-2 gap-4">
            <FormField
              label="Provinsi"
              type="text"
              bind:value={editProvince}
            />
            <FormField
              label="Kota"
              type="text"
              bind:value={editCity}
            />
          </div>
        </div>
      </div>

      <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
        <Button variant="secondary" size="md" on:click={closeEditModal} disabled={isSaving}>
          Batal
        </Button>
        <Button variant="primary" size="md" on:click={handleSave} loading={isSaving} disabled={isSaving}>
          {isSaving ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </div>
    </div>
  </div>
{/if}
