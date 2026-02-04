<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.js';
  import Button from '$lib/components/Button.svelte';

  let classes: any[] = [];
  let loading = true;
  let error = '';
  let classSearchQuery = '';

  $: filteredClasses =
    classSearchQuery.trim() === ''
      ? classes
      : classes.filter(
          (c) =>
            (c.name || '').toLowerCase().includes(classSearchQuery.trim().toLowerCase()) ||
            (c.description || '').toLowerCase().includes(classSearchQuery.trim().toLowerCase()) ||
            (c.code || '').toLowerCase().includes(classSearchQuery.trim().toLowerCase())
        );

  onMount(() => {
    authStore.init();
    if (!$authStore.isAuthenticated) {
      goto('/login');
      return;
    }
    loadClasses();
  });

  async function loadClasses() {
    try {
      loading = true;
      error = '';
      const token = $authStore.token;
      if (!token) {
        error = 'Please log in again.';
        return;
      }
      const response = await fetch('/api/classes', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        classes = data.classes || [];
      } else {
        error = 'Failed to load classes';
      }
    } catch (err) {
      console.error('Error loading classes:', err);
      error = 'Failed to load classes';
    } finally {
      loading = false;
    }
  }

  function goBack() {
    goto('/dashboard');
  }

  const isTeacher = $authStore.user?.role === 'TEACHER' || $authStore.user?.role === 'ADMIN';
</script>

<svelte:head>
  <title>My Classes - IDEA</title>
</svelte:head>

{#if loading}
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
      <p class="text-sm text-gray-500 mt-4">Loading classes...</p>
    </div>
  </div>
{:else if error}
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <p class="text-red-600 mb-4">{error}</p>
      <Button variant="primary" on:click={goBack}>Back to Dashboard</Button>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
          <div class="flex items-center">
            <Button variant="secondary" size="sm" on:click={goBack}>
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Button>
            <div class="ml-4">
              <h1 class="text-xl font-bold text-gray-900">My Classes</h1>
              <p class="text-sm text-gray-600">
                {#if isTeacher}
                  All your teaching classes
                {:else}
                  All classes you're enrolled in
                {/if}
              </p>
            </div>
          </div>
          {#if isTeacher}
            <Button variant="primary" size="sm" on:click={() => goto('/classes/create')}>
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Class
            </Button>
          {:else}
            <Button variant="primary" size="sm" on:click={() => goto('/classes/browse')}>
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Browse classes
            </Button>
          {/if}
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="card p-6">
        <div class="mb-4">
          <label for="my-classes-search" class="sr-only">Search classes</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              id="my-classes-search"
              type="text"
              bind:value={classSearchQuery}
              placeholder="Search by name, description, or code..."
              class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {#if classes.length === 0}
          <div class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">No classes yet</h3>
            <p class="mt-1 text-sm text-gray-500">
              {#if isTeacher}
                Create your first class to start teaching.
              {:else}
                Join a class to get started.
              {/if}
            </p>
            <div class="mt-6">
              {#if isTeacher}
                <Button variant="primary" size="sm" on:click={() => goto('/classes/create')}>Create Class</Button>
              {:else}
                <Button variant="primary" size="sm" on:click={() => goto('/classes/browse')}>Browse Classes</Button>
              {/if}
            </div>
          </div>
        {:else if filteredClasses.length === 0}
          <p class="text-sm text-gray-500 text-center py-8">No classes match your search.</p>
        {:else}
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each filteredClasses as classItem (classItem.id)}
              <button
                type="button"
                class="block w-full text-left overflow-hidden rounded-xl border border-gray-200 bg-white hover:border-primary-300 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                on:click={() => (isTeacher ? goto(`/classes/${classItem.id}/manage`) : goto(`/classes/${classItem.id}`))}
              >
                <div class="h-28 bg-primary-100 flex items-center justify-center">
                  <svg class="w-12 h-12 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div class="p-5 text-center">
                  <p class="font-semibold text-gray-900 truncate w-full">{classItem.name || 'Unnamed Class'}</p>
                  {#if isTeacher}
                    <p class="text-sm text-gray-500 mt-1">{classItem._count?.students ?? 0} students</p>
                    {#if classItem.description}
                      <p class="text-xs text-gray-500 mt-1 line-clamp-2">{classItem.description}</p>
                    {/if}
                  {:else}
                    <p class="text-sm text-gray-500 mt-1 line-clamp-2">{classItem.description || 'No description'}</p>
                    <span class="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">Active</span>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </main>
  </div>
{/if}
