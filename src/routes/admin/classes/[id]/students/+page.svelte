<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.js';
  import Button from '$lib/components/Button.svelte';
  import Alert from '$lib/components/Alert.svelte';

  const classId = $page.params.id;

  let availableStudents: any[] = [];
  let enrolledStudents: any[] = [];
  let loading = true;
  let saving = false;
  let error = '';
  let success = '';

  let selectedAvailable: Set<string> = new Set();
  let selectedEnrolled: Set<string> = new Set();
  let hasUnsavedChanges = false;

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

    await fetchMapping();
  });

  async function fetchMapping() {
    loading = true;
    error = '';
    try {
      const res = await fetch(`/api/admin/classes/${classId}/students`, {
        headers: { 'Authorization': `Bearer ${$authStore.token}` }
      });
      if (!res.ok) throw new Error('Failed to retrieve class plotting data');
      const data = await res.json();
      availableStudents = data.availableStudents || [];
      enrolledStudents = data.enrolledStudents || [];
      hasUnsavedChanges = false;
      selectedAvailable.clear();
      selectedEnrolled.clear();
      // force svelte to detect map updates
      selectedAvailable = selectedAvailable;
      selectedEnrolled = selectedEnrolled;
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function toggleSelection(id: string, isAvailableList: boolean) {
    if (isAvailableList) {
      if (selectedAvailable.has(id)) selectedAvailable.delete(id);
      else selectedAvailable.add(id);
      selectedAvailable = new Set(selectedAvailable);
    } else {
      if (selectedEnrolled.has(id)) selectedEnrolled.delete(id);
      else selectedEnrolled.add(id);
      selectedEnrolled = new Set(selectedEnrolled);
    }
  }

  function toggleSelectAll(isAvailableList: boolean) {
    if (isAvailableList) {
      if (selectedAvailable.size === availableStudents.length && availableStudents.length > 0) {
        selectedAvailable.clear();
      } else {
        availableStudents.forEach(s => selectedAvailable.add(s.id));
      }
      selectedAvailable = new Set(selectedAvailable);
    } else {
      if (selectedEnrolled.size === enrolledStudents.length && enrolledStudents.length > 0) {
        selectedEnrolled.clear();
      } else {
        enrolledStudents.forEach(s => selectedEnrolled.add(s.id));
      }
      selectedEnrolled = new Set(selectedEnrolled);
    }
  }

  function moveRight() {
    const toMove = availableStudents.filter(s => selectedAvailable.has(s.id));
    availableStudents = availableStudents.filter(s => !selectedAvailable.has(s.id));
    enrolledStudents = [...enrolledStudents, ...toMove];
    selectedAvailable.clear();
    selectedAvailable = new Set(selectedAvailable);
    hasUnsavedChanges = true;
  }

  function moveLeft() {
    const toMove = enrolledStudents.filter(s => selectedEnrolled.has(s.id));
    enrolledStudents = enrolledStudents.filter(s => !selectedEnrolled.has(s.id));
    availableStudents = [...availableStudents, ...toMove];
    selectedEnrolled.clear();
    selectedEnrolled = new Set(selectedEnrolled);
    hasUnsavedChanges = true;
  }

  async function syncPlotting() {
    saving = true;
    error = '';
    success = '';
    try {
      const studentIds = enrolledStudents.map(s => s.id);
      const res = await fetch(`/api/admin/classes/${classId}/students`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ studentIds })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync student array');

      success = `Successfully synchronized student plotting! (Added: ${data.added}, Removed: ${data.removed})`;
      hasUnsavedChanges = false;
    } catch (err: any) {
      error = err.message;
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Plot Students to Class - IDEA</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex flex-col">
  <header class="bg-white shadow-sm border-b border-gray-200 py-4">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
      <div class="flex items-center">
        <a href="/admin/classes" aria-label="Back to Classes Navigation" class="text-gray-500 hover:text-gray-900 transition mr-4">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        </a>
        <h1 class="text-2xl font-bold text-gray-900">Class Distro Strategy</h1>
      </div>
      <div class="flex space-x-3 items-center">
        {#if hasUnsavedChanges}
          <span class="text-amber-600 font-medium animate-pulse hidden sm:inline-block">Unsaved Changes!</span>
        {/if}
        <Button variant="primary" on:click={syncPlotting} loading={saving} disabled={saving || !hasUnsavedChanges}>
          <div class="flex items-center">
            <svg class="w-5 h-5 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            Deploy Changes
          </div>
        </Button>
      </div>
    </div>
  </header>

  <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full flex flex-col">
    {#if success}
      <div class="mb-4"><Alert type="success" message={success} /></div>
    {/if}
    {#if error}
      <div class="mb-4"><Alert type="error" message={error} /></div>
    {/if}

    {#if loading}
      <div class="flex justify-center items-center py-20">
        <svg class="animate-spin h-10 w-10 text-primary-600" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
      </div>
    {:else}
      <!-- Transfer Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 flex-1 min-h-[500px]">
        
        <!-- Left Panel: Available -->
        <div class="bg-white border text-gray-800 shadow-sm rounded-xl flex flex-col h-full overflow-hidden">
          <div class="bg-gray-100 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 class="font-bold flex items-center">
              Available Global Students
              <span class="ml-2 bg-gray-200 text-gray-700 py-0.5 px-2 rounded-full text-xs">{availableStudents.length}</span>
            </h3>
            <button class="text-sm text-primary-600 hover:text-primary-800 font-semibold" on:click={() => toggleSelectAll(true)}>
              {selectedAvailable.size === availableStudents.length && availableStudents.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          
          <div class="flex-1 overflow-y-auto p-2">
            {#if availableStudents.length === 0}
              <div class="text-center text-gray-400 py-10 italic">No available students to add.</div>
            {/if}
            {#each availableStudents as student}
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <div class="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition select-none" on:click={() => toggleSelection(student.id, true)}>
                <input type="checkbox" checked={selectedAvailable.has(student.id)} class="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 mr-3">
                <div>
                  <div class="font-medium text-gray-900">{student.firstName} {student.lastName}</div>
                  <div class="text-xs text-gray-500">{student.username}</div>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Middle Transfer Buttons -->
        <div class="flex lg:flex-col justify-center items-center gap-4 py-4 lg:py-0 shrink-0">
          <Button variant="primary" class="!px-3 !py-2" disabled={selectedAvailable.size === 0} on:click={moveRight} title="Move Selected to Class">
            <span class="hidden lg:inline mr-2">Plot</span>
            <svg class="w-6 h-6 transform rotate-90 lg:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </Button>
          <Button variant="secondary" class="!px-3 !py-2 hover:bg-red-50 hover:text-red-700 hover:border-red-300" disabled={selectedEnrolled.size === 0} on:click={moveLeft} title="Remove Selected from Class">
            <svg class="w-6 h-6 transform rotate-90 lg:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            <span class="hidden lg:inline ml-2">Expel</span>
          </Button>
        </div>

        <!-- Right Panel: Enrolled -->
        <div class="bg-white border-2 border-primary-100 shadow-md shadow-primary-500/10 rounded-xl flex flex-col h-full overflow-hidden">
          <div class="bg-primary-50 px-4 py-3 border-b border-primary-100 flex justify-between items-center">
            <h3 class="font-bold text-primary-900 flex items-center">
              Active Enrolled Lineup
              <span class="ml-2 bg-primary-200 text-primary-800 py-0.5 px-2 rounded-full text-xs">{enrolledStudents.length}</span>
            </h3>
            <button class="text-sm text-primary-700 hover:text-primary-900 font-semibold" on:click={() => toggleSelectAll(false)}>
              {selectedEnrolled.size === enrolledStudents.length && enrolledStudents.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          
          <div class="flex-1 overflow-y-auto p-2">
            {#if enrolledStudents.length === 0}
              <div class="text-center text-primary-400 py-10 italic">This class is currently empty.<br>Select students from the left panel to populate.</div>
            {/if}
            {#each enrolledStudents as student}
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <div class="flex items-center p-3 hover:bg-primary-50/50 rounded-lg cursor-pointer transition select-none" on:click={() => toggleSelection(student.id, false)}>
                <input type="checkbox" checked={selectedEnrolled.has(student.id)} class="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 mr-3">
                <div class="flex-1 flex justify-between items-center">
                  <div>
                    <div class="font-semibold text-gray-900">{student.firstName} {student.lastName}</div>
                    <div class="text-xs text-gray-500">{student.email}</div>
                  </div>
                  <div class="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Plotted Successfully"></div>
                </div>
              </div>
            {/each}
          </div>
        </div>

      </div>
    {/if}
  </main>
</div>
