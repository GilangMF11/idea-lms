<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.js';
  import { apiFetchJson } from '$lib/api.js';
  import Button from '$lib/components/Button.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

  let classes: any[] = [];
  let loading = true;
  let error = '';
  let teachers: any[] = [];
  let fetchingTeachers = false;

  // Create Modal State
  let showCreateModal = false;
  let isCreating = false;
  let newClassName = '';
  let newClassDesc = '';
  let selectedTeacher = '';

  // Edit Modal State
  let showEditModal = false;
  let isUpdating = false;
  let editingClassId = '';
  let editClassName = '';
  let editClassDesc = '';
  let editTeacher = '';

  // Search and Filter State
  let searchQuery = '';
  let searchInput = '';
  let searchTimeout: any;
  let filterTeacher = '';
  
  // Pagination State
  let currentPage = 1;
  let itemsPerPage = 10;
  let paginationInfo = { total: 0, page: 1, limit: 10, totalPages: 1 };

  // Confirm Dialog State
  let showConfirmDialog = false;
  let isConfirmLoading = false;
  let confirmDialogProps = {
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    confirmText: 'Confirm',
    onConfirm: async () => {},
  };

  onMount(() => {
    authStore.init();

    // Redirect if not authenticated or not admin
    if (!$authStore.isAuthenticated || $authStore.user?.role !== 'ADMIN') {
      goto('/dashboard');
      return;
    }

    loadClasses();
    fetchTeachers(); // Load teachers for filter dropdown
  });

  async function loadClasses(page = 1) {
    try {
      loading = true;

      if (!$authStore.token) {
        error = 'No authentication token found. Please login again.';
        return;
      }

      currentPage = page;
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchQuery,
        teacherId: filterTeacher
      });

      const data = await apiFetchJson(`/api/classes?${params.toString()}`);
      classes = data.classes || [];
      if (data.pagination) {
        paginationInfo = data.pagination;
      }
    } catch (err: any) {
      console.error('Error loading classes:', err);
      error = err.message || 'Failed to load classes';
    } finally {
      loading = false;
    }
  }

  function handleSearchInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchQuery = searchInput;
      loadClasses(1);
    }, 500);
  }

  $: if (filterTeacher !== undefined && classes) {
    // If filterTeacher changes drastically, reload from page 1.
    // Note: To avoid infinite loops, triggering is handled manually on input change if needed.
  }

  function changePage(newPage: number) {
    if (newPage >= 1 && newPage <= paginationInfo.totalPages) {
      loadClasses(newPage);
    }
  }

  async function deleteClass(classId: string, className: string, isPermanent = false) {
    const message = isPermanent 
      ? `Are you sure you want to PERMANENTLY delete class "${className}"? This action CANNOT be undone.`
      : `Are you sure you want to delete class "${className}"? This will deactivate it.`;

    confirmDialogProps = {
      title: isPermanent ? 'Permanent Delete' : 'Deactivate Class',
      message,
      confirmText: isPermanent ? 'Permanently Delete' : 'Deactivate',
      onConfirm: async () => {
        try {
          isConfirmLoading = true;
          const response = await fetch(`/api/classes/${classId}${isPermanent ? '?permanent=true' : ''}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${$authStore.token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            await loadClasses();
            showConfirmDialog = false;
          } else {
            const errorData = await response.json();
            alert(`Failed to delete class: ${errorData.error}`);
          }
        } catch (err: any) {
          console.error('Error deleting class:', err);
          alert(`Failed to delete class: ${err.message}`);
        } finally {
          isConfirmLoading = false;
        }
      }
    };
    showConfirmDialog = true;
  }

  async function toggleStatus(classId: string, currentStatus: boolean) {
    try {
      await apiFetchJson(`/api/admin/classes/${classId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !currentStatus })
      });
      await loadClasses(currentPage);
    } catch (err: any) {
      console.error('Error changing status:', err);
      alert(`Failed to change class status: ${err.message}`);
    }
  }

  function goBack() {
    goto('/dashboard');
  }

  async function fetchTeachers() {
    fetchingTeachers = true;
    try {
      const data = await apiFetchJson('/api/users?role=TEACHER');
      teachers = (data.users || []).filter((u: any) => u.role === 'TEACHER');
    } catch (err: any) {
      console.error('Error fetching teachers:', err);
    } finally {
      fetchingTeachers = false;
    }
  }

  async function openEditModal(cls: any) {
    showEditModal = true;
    editingClassId = cls.id;
    editClassName = cls.name;
    editClassDesc = cls.description || '';
    editTeacher = cls.teacherId || '';
    if (teachers.length === 0) {
      await fetchTeachers();
    }
  }

  async function openCreateModal() {
    showCreateModal = true;
    newClassName = '';
    newClassDesc = '';
    selectedTeacher = '';
    if (teachers.length === 0) {
      await fetchTeachers();
    }
  }

  async function createAdminClass() {
    if (!newClassName || !selectedTeacher) {
      alert('Class name and Teacher selection are required.');
      return;
    }

    isCreating = true;
    error = '';

    try {
      await apiFetchJson('/api/admin/classes', {
        method: 'POST',
        body: JSON.stringify({
          name: newClassName,
          description: newClassDesc,
          teacherId: selectedTeacher
        })
      });

      showCreateModal = false;
      await loadClasses();
    } catch (err: any) {
      alert(`Error creating class: ${err.message}`);
    } finally {
      isCreating = false;
    }
  }

  async function updateAdminClass() {
    if (!editClassName || !editTeacher) {
      alert('Class name and Teacher selection are required.');
      return;
    }

    isUpdating = true;
    error = '';

    try {
      await apiFetchJson(`/api/admin/classes/${editingClassId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editClassName,
          description: editClassDesc,
          teacherId: editTeacher
        })
      });

      showEditModal = false;
      await loadClasses();
    } catch (err: any) {
      alert(`Error updating class: ${err.message}`);
    } finally {
      isUpdating = false;
    }
  }
</script>

<svelte:head>
  <title>All Classes - IDEA</title>
</svelte:head>

<!-- Global Confirm Dialog for this page -->
<ConfirmDialog 
  show={showConfirmDialog}
  title={confirmDialogProps.title}
  message={confirmDialogProps.message}
  confirmText={confirmDialogProps.confirmText}
  loading={isConfirmLoading}
  on:confirm={confirmDialogProps.onConfirm}
  on:cancel={() => showConfirmDialog = false}
/>

{#if loading}
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <LoadingSpinner size="lg" />
      <p class="text-sm text-gray-500 mt-4">Loading classes...</p>
    </div>
  </div>
{:else if error}
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="text-red-500 text-lg font-medium mb-4">Error</div>
      <p class="text-gray-600 mb-6">{error}</p>
      <Button variant="primary" on:click={goBack}>
        Back to Dashboard
      </Button>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
          <div class="flex items-center">
            <div class="mr-4">
              <Button variant="secondary" size="sm" on:click={goBack}>
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Button>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">All Classes</h1>
              <p class="text-sm text-gray-600">Manage all classes in the system</p>
            </div>
          </div>
          
          <div class="flex items-center justify-between sm:justify-end space-x-4">
            <Button variant="primary" size="sm" on:click={openCreateModal}>
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Class
            </Button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="card p-6">
          <div class="flex items-center">
            <div class="p-2 bg-primary-100 rounded-lg">
              <svg class="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Total Classes</p>
              <p class="text-2xl font-semibold text-gray-900">{classes.length}</p>
            </div>
          </div>
        </div>

        <div class="card p-6">
          <div class="flex items-center">
            <div class="p-2 bg-green-100 rounded-lg">
              <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Total Students</p>
              <p class="text-2xl font-semibold text-gray-900">{classes.reduce((total, cls) => total + (cls._count?.students || 0), 0)}</p>
            </div>
          </div>
        </div>

        <div class="card p-6">
          <div class="flex items-center">
            <div class="p-2 bg-yellow-100 rounded-lg">
              <svg class="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Active Classes</p>
              <p class="text-2xl font-semibold text-gray-900">{classes.filter(cls => cls.isActive).length}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Search and Filter -->
      <div class="card p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Search -->
          <div>
            <label for="search" class="block text-sm font-medium text-gray-700 mb-2">Search Classes</label>
            <div class="relative">
              <input
                type="text"
                id="search"
                bind:value={searchInput}
                on:input={handleSearchInput}
                placeholder="Search by class name or description..."
                class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <!-- Filter by Teacher -->
          <div>
            <label for="teacherFilter" class="block text-sm font-medium text-gray-700 mb-2">Filter by Teacher</label>
            <div class="relative">
              <select
                id="teacherFilter"
                bind:value={filterTeacher}
                on:change={() => loadClasses(1)}
                class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="">All Teachers</option>
                {#each classes as cls}
                  {#if cls.teacher && !teachers.find(t => t.id === cls.teacherId)}
                    {@const teacher = cls.teacher}
                    <option value={cls.teacherId}>
                      {teacher.firstName} {teacher.lastName}
                    </option>
                  {/if}
                {/each}
                {#each teachers as teacher}
                  <option value={teacher.id}>
                    {teacher.firstName} {teacher.lastName}
                  </option>
                {/each}
              </select>
              <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Show active filters -->
        {#if searchQuery || filterTeacher}
          <div class="mt-4 flex flex-wrap gap-2">
            {#if searchQuery}
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                Search: "{searchQuery}"
                <button
                  type="button"
                  on:click={() => searchQuery = ''}
                  class="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary-200 text-primary-900 hover:bg-primary-300 focus:outline-none"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            {/if}
            {#if filterTeacher}
              {@const selectedTeacher = teachers.find(t => t.id === filterTeacher) || classes.find(c => c.teacherId === filterTeacher)?.teacher}
              {#if selectedTeacher}
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Teacher: {selectedTeacher.firstName} {selectedTeacher.lastName}
                  <button
                    type="button"
                    on:click={() => filterTeacher = ''}
                    class="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-200 text-green-900 hover:bg-green-300 focus:outline-none"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              {/if}
            {/if}
          </div>
        {/if}
      </div>

      <!-- Classes Table -->
      <div class="card p-6">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-semibold text-gray-900">
            Classes
            ({paginationInfo.total})
          </h3>
          <div class="flex space-x-2">
            <Button variant="secondary" size="sm">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Export
            </Button>
            <Button variant="primary" size="sm" on:click={openCreateModal}>
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Class
            </Button>
          </div>
        </div>

        {#if classes.length > 0}
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each classes as classItem}
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div class="text-sm font-medium text-gray-900">{classItem.name}</div>
                        <div class="text-sm text-gray-500">{classItem.description || 'No description'}</div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <div class="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                          <span class="text-sm font-medium text-primary-600">
                            {classItem.teacher?.firstName?.charAt(0)}{classItem.teacher?.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div class="text-sm font-medium text-gray-900">
                            {classItem.teacher?.firstName} {classItem.teacher?.lastName}
                          </div>
                          <div class="text-sm text-gray-500">{classItem.teacher?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {classItem._count?.students || 0}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(classItem.createdAt).toLocaleDateString()}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {classItem.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        {classItem.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex space-x-2">
                        <button
                          class="text-primary-600 hover:text-primary-900 bg-primary-50 px-2 py-1 rounded"
                          on:click={() => goto(`/classes/${classItem.id}`)}
                        >
                          View
                        </button>
                        <button
                          class="text-purple-600 hover:text-purple-900 bg-purple-50 px-2 py-1 rounded"
                          on:click={() => goto(`/classes/${classItem.id}/chat-statistics`)}
                        >
                          Analysis
                        </button>
                        <button
                          class="text-yellow-600 hover:text-yellow-900 bg-yellow-50 px-2 py-1 rounded"
                          on:click={() => openEditModal(classItem)}
                        >
                          Edit
                        </button>
                        <button
                          class="text-blue-600 hover:text-blue-900 bg-blue-50 px-2 py-1 rounded"
                          on:click={() => goto(`/admin/classes/${classItem.id}/students`)}
                        >
                          Plot Students
                        </button>
                        <button
                          class="text-gray-600 hover:text-gray-900 bg-gray-100 px-2 py-1 rounded"
                          on:click={() => toggleStatus(classItem.id, classItem.isActive)}
                        >
                          {classItem.isActive ? 'Inactivate' : 'Activate'}
                        </button>
                        <button
                          class="text-red-600 hover:text-red-900 bg-red-50 px-2 py-1 rounded"
                          on:click={() => deleteClass(classItem.id, classItem.name, true)}
                        >
                          Hard Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>

            <!-- Pagination -->
            <div class="border-t border-gray-200 bg-white px-4 py-3 sm:px-6 flex items-center justify-between">
              <div class="flex-1 flex justify-between sm:hidden">
                <button on:click={() => changePage(currentPage - 1)} disabled={currentPage === 1} class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                  Previous
                </button>
                <button on:click={() => changePage(currentPage + 1)} disabled={currentPage === paginationInfo.totalPages} class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                  Next
                </button>
              </div>
              <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p class="text-sm text-gray-700">
                    Showing
                    <span class="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                    to
                    <span class="font-medium">{Math.min(currentPage * itemsPerPage, paginationInfo.total)}</span>
                    of
                    <span class="font-medium">{paginationInfo.total}</span>
                    results
                  </p>
                </div>
                <div>
                  <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button on:click={() => changePage(currentPage - 1)} disabled={currentPage === 1} class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                      <span class="sr-only">Previous</span>
                      <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </button>
                    
                    {#each Array.from({ length: paginationInfo.totalPages }, (_, i) => i + 1) as page}
                      {#if page === 1 || page === paginationInfo.totalPages || (page >= currentPage - 1 && page <= currentPage + 1)}
                        <button on:click={() => changePage(page)} class={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === page ? 'z-10 bg-primary-50 border-primary-500 text-primary-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}>
                          {page}
                        </button>
                      {:else if page === currentPage - 2 || page === currentPage + 2}
                        <span class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                          ...
                        </span>
                      {/if}
                    {/each}

                    <button on:click={() => changePage(currentPage + 1)} disabled={currentPage === paginationInfo.totalPages} class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                      <span class="sr-only">Next</span>
                      <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        {:else if classes.length === 0}
          <div class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">No classes found</h3>
            <p class="mt-1 text-sm text-gray-500">Get started by creating a new class.</p>
            <div class="mt-6">
              <Button variant="primary" size="sm" on:click={openCreateModal}>
                Create Class
              </Button>
            </div>
          </div>
        {:else}
          <div class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">No classes match your search</h3>
            <p class="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
            <div class="mt-6">
              <button
                on:click={() => { searchQuery = ''; searchInput = ''; filterTeacher = ''; loadClasses(1); }}
                class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Clear Filters
              </button>
            </div>
          </div>
        {/if}
      </div>
    </main>
  </div>
{/if}

<!-- Create Class Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="create-modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" on:click={() => !isCreating && (showCreateModal = false)}></div>
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">
            <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 class="text-lg leading-6 font-bold text-gray-900 mb-4" id="create-modal-title">
                Deploy New Class
              </h3>

              <div class="space-y-4">
                <div>
                  <label for="className" class="block text-sm font-medium text-gray-700">Class Name (<span class="text-red-500">*</span>)</label>
                  <input type="text" id="className" bind:value={newClassName} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border" placeholder="E.g. Advanced Academic Writing 301">
                </div>

                <div>
                  <label for="classDesc" class="block text-sm font-medium text-gray-700">Description (Optional)</label>
                  <textarea id="classDesc" bind:value={newClassDesc} rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border" placeholder="A brief overview of the curriculum..."></textarea>
                </div>

                <div>
                  <label for="teacherSelect" class="block text-sm font-medium text-gray-700">Assign Lead Teacher (<span class="text-red-500">*</span>)</label>
                  {#if fetchingTeachers}
                    <div class="mt-1 text-sm text-gray-500 italic">Fetching teachers...</div>
                  {:else}
                    <select id="teacherSelect" bind:value={selectedTeacher} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border bg-white">
                      <option value="" disabled>-- Select a Teacher --</option>
                      {#each teachers as teacher}
                        <option value={teacher.id}>{teacher.firstName} {teacher.lastName} ({teacher.username})</option>
                      {/each}
                    </select>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            on:click={createAdminClass}
            disabled={isCreating || !newClassName || !selectedTeacher}
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if isCreating}
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            {:else}
              Create Class
            {/if}
          </button>
          <button
            type="button"
            on:click={() => showCreateModal = false}
            disabled={isCreating}
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Edit Class Modal -->
{#if showEditModal}
  <div class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="edit-modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" on:click={() => !isUpdating && (showEditModal = false)}></div>
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">
            <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 class="text-lg leading-6 font-bold text-gray-900 mb-4" id="edit-modal-title">
                Edit Class
              </h3>

              <div class="space-y-4">
                <div>
                  <label for="editClassName" class="block text-sm font-medium text-gray-700">Class Name (<span class="text-red-500">*</span>)</label>
                  <input type="text" id="editClassName" bind:value={editClassName} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border" placeholder="E.g. Advanced Academic Writing 301">
                </div>

                <div>
                  <label for="editClassDesc" class="block text-sm font-medium text-gray-700">Description (Optional)</label>
                  <textarea id="editClassDesc" bind:value={editClassDesc} rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border" placeholder="A brief overview of the curriculum..."></textarea>
                </div>

                <div>
                  <label for="editTeacherSelect" class="block text-sm font-medium text-gray-700">Assign Teacher (<span class="text-red-500">*</span>)</label>
                  {#if fetchingTeachers}
                    <div class="mt-1 text-sm text-gray-500 italic">Fetching teachers...</div>
                  {:else}
                    <select id="editTeacherSelect" bind:value={editTeacher} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border bg-white">
                      <option value="" disabled>-- Select a Teacher --</option>
                      {#each teachers as teacher}
                        <option value={teacher.id}>{teacher.firstName} {teacher.lastName} ({teacher.username})</option>
                      {/each}
                    </select>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            on:click={updateAdminClass}
            disabled={isUpdating || !editClassName || !editTeacher}
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if isUpdating}
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Updating...
            {:else}
              Update Class
            {/if}
          </button>
          <button
            type="button"
            on:click={() => showEditModal = false}
            disabled={isUpdating}
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
