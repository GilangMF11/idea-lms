<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.js';
  import Button from '$lib/components/Button.svelte';

  let exercises: any[] = [];
  let loading = true;

  $: completedCount = exercises.filter(ex => ex.submissionStatus && ex.submissionStatus.score !== null).length;
  $: pendingCount = exercises.filter(ex => !ex.submissionStatus).length;

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
        for (let exercise of exercises) {
          try {
            const sub = await fetch(`/api/exercise-submissions?exerciseId=${exercise.id}&userId=${$authStore.user?.id}`, {
              headers: { 'Authorization': `Bearer ${$authStore.token}`, 'Content-Type': 'application/json' }
            });
            if (sub.ok) {
              const d = await sub.json();
              exercise.submissionStatus = d.submission || null;
            }
          } catch {
            exercise.submissionStatus = null;
          }
        }
      }
    } catch {
      // silent
    } finally {
      loading = false;
    }
  });

  function statusLabel(exercise: any) {
    if (!exercise.submissionStatus) return { text: 'To do', class: 'bg-yellow-100 text-yellow-800' };
    if (exercise.submissionStatus.score !== null) return { text: `Done · ${exercise.submissionStatus.score}/100`, class: 'bg-green-100 text-green-800' };
    return { text: 'Submitted', class: 'bg-blue-100 text-blue-800' };
  }

  function goBack() {
    goto('/dashboard');
  }
</script>

<svelte:head>
  <title>Exit Tickets - IDEA</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Header (same style as dashboard) -->
  <header class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between py-3 sm:py-4">
        <div class="flex items-center min-w-0 flex-1">
          <div class="mr-4">
            <Button variant="secondary" size="sm" on:click={goBack}>
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Button>
          </div>
          <div>
            <h1 class="text-lg sm:text-xl font-semibold text-gray-900">Exit Tickets</h1>
            <p class="text-sm text-gray-500">From your enrolled classes</p>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- Main -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {#if loading}
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span class="ml-2 text-gray-600">Loading...</span>
      </div>
    {:else if exercises.length === 0}
      <div class="card p-6">
        <div class="text-center py-8">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No exit tickets yet</h3>
          <p class="mt-1 text-sm text-gray-500">Exit tickets will appear here when your teachers post them.</p>
          <div class="mt-6">
            <Button variant="primary" size="sm" on:click={goBack}>Back to Dashboard</Button>
          </div>
        </div>
      </div>
    {:else}
      <!-- Stats (same style as dashboard stats) -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="card p-6">
          <div class="flex items-center">
            <div class="p-2 bg-primary-100 rounded-lg">
              <svg class="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Total</p>
              <p class="text-2xl font-semibold text-gray-900">{exercises.length}</p>
            </div>
          </div>
        </div>
        <div class="card p-6">
          <div class="flex items-center">
            <div class="p-2 bg-green-100 rounded-lg">
              <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Completed</p>
              <p class="text-2xl font-semibold text-gray-900">{completedCount}</p>
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
              <p class="text-sm font-medium text-gray-600">Pending</p>
              <p class="text-2xl font-semibold text-gray-900">{pendingCount}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- List card (same style as dashboard "Recent Exit Tickets" card) -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">All exit tickets</h3>
        <div class="space-y-3">
          {#each exercises as exercise (exercise.id)}
            <button
              type="button"
              class="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              on:click={() => goto(`/exercises/${exercise.id}`)}
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900">{exercise.title}</p>
                <p class="text-xs text-gray-500 mt-0.5">
                  {exercise.class?.name ?? 'Class'}
                  {#if exercise.dueDate}
                    · Due {new Date(exercise.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  {/if}
                </p>
              </div>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-3 {statusLabel(exercise).class}">
                {statusLabel(exercise).text}
              </span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </main>
</div>
