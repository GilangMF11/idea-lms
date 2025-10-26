<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.js';

  let exercises: any[] = [];

  onMount(async () => {
    authStore.init();
    
    // Redirect if not authenticated
    if (!$authStore.isAuthenticated) {
      goto('/login');
      return;
    }

    // Redirect if not student
    if ($authStore.user?.role !== 'STUDENT') {
      goto('/dashboard');
      return;
    }

    // Load assignments directly
    try {
      const response = await fetch('/api/exercises', {
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        exercises = data.exercises || [];
      }
    } catch (err) {
      console.error('Error loading assignments:', err);
    }
  });

  function viewExercise(exerciseId: string) {
    goto(`/exercises/${exerciseId}`);
  }
</script>

<svelte:head>
  <title>My Assignments - LMS</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">My Assignments</h1>
      <p class="text-gray-600 mt-2">View and manage your exercise assignments</p>
    </div>

    <!-- Assignments List -->
    {#if exercises.length > 0}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each exercises as exercise}
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div class="p-6">
              <!-- Header -->
              <div class="mb-4">
                <h3 class="text-lg font-medium text-gray-900 mb-2">
                  {exercise.title}
                </h3>
                <p class="text-sm text-gray-600 mb-2">
                  {exercise.description || 'No description'}
                </p>
              </div>

              <!-- Class Info -->
              <div class="mb-4">
                <div class="text-sm text-gray-500 mb-1">
                  Class: {exercise.class?.name}
                </div>
                
                {#if exercise.dueDate}
                  <div class="text-sm text-gray-500">
                    Due: {new Date(exercise.dueDate).toLocaleDateString()}
                  </div>
                {/if}
              </div>

              <!-- Reading Text -->
              {#if exercise.readingText}
                <div class="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div class="text-sm text-blue-700">
                    Related: {exercise.readingText.title}
                  </div>
                </div>
              {/if}

              <!-- Actions -->
              <div class="flex justify-end">
                <button 
                  class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  on:click={() => viewExercise(exercise.id)}
                >
                  Start Assignment
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <!-- Empty State -->
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
        <p class="text-gray-600">Your teachers will assign exercises to your classes.</p>
      </div>
    {/if}
  </div>
</div>