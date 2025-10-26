<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { authStore } from '$lib/stores/auth.js';
  import Button from '$lib/components/Button.svelte';

  let classData: any = null;
  let exercises: any[] = [];
  let error = '';

  onMount(async () => {
    authStore.init();
    
    // Redirect if not authenticated
    if (!$authStore.isAuthenticated) {
      goto('/login');
      return;
    }
    
    await loadClassData();
  });

  async function loadClassData() {
    try {
      const token = $authStore.token;
      const classId = $page.params.id;
      
      if (!classId) {
        error = 'Class ID not found';
        return;
      }

      // Load class details
      const classResponse = await fetch(`/api/classes?id=${classId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (classResponse.ok) {
        const classResult = await classResponse.json();
        classData = classResult.class;
      }

      // Load exercises
      const exercisesResponse = await fetch(`/api/exercises?classId=${classId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (exercisesResponse.ok) {
        const exercisesResult = await exercisesResponse.json();
        exercises = exercisesResult.exercises || [];
      }

    } catch (err) {
      console.error('Error loading class data:', err);
      error = 'Failed to load class data';
    }
  }

  function goBack() {
    goto('/dashboard');
  }
</script>

<svelte:head>
  <title>{classData?.name || 'Class Details'} - LMS Light</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
    <!-- Header -->
    <div class="mb-8">
      <button class="text-gray-600 hover:text-gray-900 mb-4" on:click={goBack}>
        <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
        Back to Dashboard
      </button>
      
      {#if classData}
        <h1 class="text-3xl font-bold text-gray-900">{classData.name}</h1>
        <p class="text-gray-600 mt-2">{classData.description || 'No description'}</p>
      {:else}
        <h1 class="text-3xl font-bold text-gray-900">Class Details</h1>
        <p class="text-gray-600 mt-2">Loading...</p>
      {/if}
    </div>

    <!-- Error State -->
    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Error</h3>
            <div class="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Assignments Section -->
    <div class="card p-6">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-lg font-semibold text-gray-900">Assignments ({exercises.length})</h3>
      </div>

      {#if exercises.length > 0}
        <div class="space-y-4">
          {#each exercises as exercise}
            <div class="border border-gray-200 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <h4 class="text-sm font-medium text-gray-900">{exercise.title}</h4>
                  <p class="text-sm text-gray-500 mt-1">{exercise.description || 'No description'}</p>
                  <div class="flex items-center mt-2 space-x-4">
                    <span class="text-xs text-gray-500">
                      Due: {exercise.dueDate ? new Date(exercise.dueDate).toLocaleDateString() : 'No due date'}
                    </span>
                    <span class="text-xs text-gray-500">
                      Class: {exercise.class?.name}
                    </span>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <Button variant="primary" size="sm" on:click={() => goto(`/exercises/${exercise.id}`)}>
                    View
                  </Button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="text-center py-12">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No assignments yet</h3>
          <p class="mt-1 text-sm text-gray-500">Assignments will appear here when created.</p>
        </div>
      {/if}
    </div>
  </div>
</div>