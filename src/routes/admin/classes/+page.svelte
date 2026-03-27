<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.js';
  import Button from '$lib/components/Button.svelte';
  import Alert from '$lib/components/Alert.svelte';

  let classes: any[] = [];
  let teachers: any[] = [];
  let loading = false;
  let fetchingTeachers = false;
  let error = '';
  let success = '';

  // Modal State
  let showCreateModal = false;
  let isCreating = false;
  let newClassName = '';
  let newClassDesc = '';
  let selectedTeacher = '';

  onMount(async () => {
    authStore.init();
    
    if (!$authStore.isAuthenticated) {
      goto('/login');
      return;
    }
    if ($authStore.user?.role !== 'ADMIN') {
      goto('/dashboard');
      return;
    }

    await fetchClasses();
  });

  async function fetchClasses() {
    loading = true;
    error = '';
    try {
      // Re-use existing GET /api/classes which correctly handles role === 'ADMIN'
      const res = await fetch('/api/classes', {
        headers: { 'Authorization': `Bearer ${$authStore.token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch master classes list');
      const data = await res.json();
      classes = data.classes || [];
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
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

  async function fetchTeachers() {
    fetchingTeachers = true;
    try {
      const res = await fetch('/api/users?role=TEACHER', {
        headers: { 'Authorization': `Bearer ${$authStore.token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch teachers catalog');
      const data = await res.json();
      // Filter the array ensuring we strictly only keep TEACHER role models locally just in case
      teachers = (data.users || []).filter((u: any) => u.role === 'TEACHER');
    } catch (err: any) {
      error = 'Could not load active teachers for class assignment.';
    } finally {
      fetchingTeachers = false;
    }
  }

  async function createAdminClass() {
    if (!newClassName || !selectedTeacher) {
      alert('Class name and Teacher selection are required.');
      return;
    }

    isCreating = true;
    error = '';
    success = '';

    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newClassName,
          description: newClassDesc,
          teacherId: selectedTeacher
        })
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to create Master Class');

      success = `Class "${body.class.name}" successfully created and assigned to teacher.`;
      showCreateModal = false;
      await fetchClasses();
    } catch (err: any) {
      error = err.message;
    } finally {
      isCreating = false;
    }
  }
</script>

<svelte:head>
  <title>Master Class Management - IDEA</title>
</svelte:head>

<!-- Create Class Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" on:click={() => !isCreating && (showCreateModal = false)}></div>
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">
            <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 class="text-lg leading-6 font-bold text-gray-900 mb-4" id="modal-title">
                Deploy New Master Class
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
                    <div class="mt-1 text-sm text-gray-500 italic">Fetching active teachers securely...</div>
                  {:else}
                    <select id="teacherSelect" bind:value={selectedTeacher} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border bg-white">
                      <option value="" disabled>-- Verify & Select a Teacher --</option>
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
          <Button variant="primary" loading={isCreating} disabled={isCreating || !newClassName || !selectedTeacher} class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm" on:click={createAdminClass}>
            Deploy Class
          </Button>
          <Button variant="secondary" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" on:click={() => showCreateModal = false}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}

<div class="min-h-screen bg-gray-50 pb-12">
  <header class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center py-4">
        <a href="/dashboard" class="flex items-center text-gray-500 hover:text-gray-700 mr-4 transition-colors">
          <svg class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Dashboard
        </a>
        <div class="flex items-center flex-1">
          <h1 class="text-xl font-bold text-gray-900 tracking-tight">Master Class Grid</h1>
        </div>
        <div>
          <Button variant="primary" on:click={openCreateModal}>
            + Create Master Class
          </Button>
        </div>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {#if success}
      <div class="mb-6"><Alert type="success" message={success} /></div>
    {/if}
    {#if error}
      <div class="mb-6"><Alert type="error" message={error} /></div>
    {/if}

    <div class="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2 mt-4">
      <div class="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
        <div>
          <h3 class="text-lg leading-6 font-semibold text-gray-900">Total Registered Classes</h3>
          <p class="mt-1 max-w-2xl text-sm text-gray-500">
            Select "Plot Students" on any class to adjust their bulk student rosters.
          </p>
        </div>
      </div>
      
      <div class="overflow-x-auto">
        {#if loading}
          <div class="flex justify-center p-8 text-gray-400">
            <svg class="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        {:else if classes.length === 0}
          <div class="text-center p-12 text-gray-500">
            <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p class="text-lg font-medium">No active classes structurally detected.</p>
          </div>
        {:else}
          <table class="min-w-full divide-y divide-gray-300">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Class Concept</th>
                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Deployed Code</th>
                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Lead Teacher</th>
                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Plotted Density</th>
                <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right">
                  <span class="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              {#each classes as cls}
                <tr class="hover:bg-gray-50 transition-colors">
                  <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                    <div class="font-medium text-gray-900">{cls.name}</div>
                    <div class="text-gray-500 text-xs truncate max-w-[200px]" title={cls.description || 'No description assigned'}>
                      {cls.description || 'No conceptual description'}
                    </div>
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm font-mono text-gray-500">
                    <span class="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-600/20">
                      {cls.code}
                    </span>
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    {#if cls.teacher}
                      <div class="flex items-center">
                        <div class="h-6 w-6 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold mr-2">
                          {cls.teacher.firstName[0]}
                        </div>
                        {cls.teacher.firstName} {cls.teacher.lastName}
                      </div>
                    {:else}
                      <span class="text-gray-400 italic">Unassigned Orbit</span>
                    {/if}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <div class="flex items-center font-medium">
                      <svg class="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      {cls._count?.students || 0} Pupils
                    </div>
                  </td>
                  <td class="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <a href={`/admin/classes/${cls.id}/students`} class="text-primary-600 hover:text-primary-900 bg-primary-50 px-3 py-1.5 rounded-md hover:bg-primary-100 transition-colors inline-block font-semibold">
                      Plot Students &rarr;
                    </a>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </div>
    </div>
  </main>
</div>
