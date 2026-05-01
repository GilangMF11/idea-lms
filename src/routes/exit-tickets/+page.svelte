<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.js';
  import Button from '$lib/components/Button.svelte';

  let exercises: any[] = [];
  let submissions: any[] = [];
  let loading = true;
  let filter: 'all' | 'todo' | 'submitted' | 'graded' | 'overdue' = 'all';

  $: submissionMap = new Map(submissions.map((s: any) => [s.exerciseId, s]));

  function getStatus(exercise: any) {
    const sub = submissionMap.get(exercise.id);
    const isOverdue = exercise.dueDate && new Date() > new Date(exercise.dueDate);

    if (sub) {
      if (sub.score !== null) return { key: 'graded', label: `${sub.score}/100`, dot: 'bg-green-500' };
      return { key: 'submitted', label: 'Submitted', dot: 'bg-blue-500' };
    }
    if (isOverdue) return { key: 'overdue', label: 'Overdue', dot: 'bg-red-500' };
    return { key: 'todo', label: 'To Do', dot: 'bg-yellow-400' };
  }

  $: filtered = filter === 'all'
    ? exercises
    : exercises.filter((e: any) => getStatus(e).key === filter);

  $: counts = {
    all: exercises.length,
    todo: exercises.filter((e: any) => getStatus(e).key === 'todo').length,
    submitted: exercises.filter((e: any) => getStatus(e).key === 'submitted').length,
    graded: exercises.filter((e: any) => getStatus(e).key === 'graded').length,
    overdue: exercises.filter((e: any) => getStatus(e).key === 'overdue').length,
  };

  onMount(async () => {
    authStore.init();
    if (!$authStore.isAuthenticated) { goto('/login'); return; }
    if ($authStore.user?.role !== 'STUDENT') { goto('/dashboard'); return; }

    try {
      const headers = {
        'Authorization': `Bearer ${$authStore.token}`,
        'Content-Type': 'application/json'
      };

      const [exRes, subRes] = await Promise.all([
        fetch('/api/exercises', { headers }),
        fetch('/api/exercise-submissions/all', { headers })
      ]);

      if (exRes.ok) {
        const data = await exRes.json();
        exercises = data.exercises || [];
      }
      if (subRes.ok) {
        const data = await subRes.json();
        submissions = data.submissions || [];
      }
    } catch {
      // silent
    } finally {
      loading = false;
    }
  });

  function goBack() { goto('/dashboard'); }

  const filterOptions: Array<{ key: 'all' | 'todo' | 'submitted' | 'graded' | 'overdue'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'todo', label: 'To Do' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'graded', label: 'Graded' },
    { key: 'overdue', label: 'Overdue' },
  ];
</script>

<svelte:head>
  <title>Exit Tickets - IDEA</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <header class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between py-3 sm:py-4">
        <div class="flex items-center min-w-0 flex-1">
          <div class="mr-3 sm:mr-4 flex-shrink-0">
            <Button variant="secondary" size="sm" on:click={goBack}>
              <svg class="w-4 h-4 mr-0 sm:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span class="hidden sm:inline">Back</span>
            </Button>
          </div>
          <div class="min-w-0">
            <h1 class="text-lg sm:text-xl font-semibold text-gray-900">Exit Tickets</h1>
            <p class="text-xs sm:text-sm text-gray-500 truncate">{exercises.length} ticket{exercises.length !== 1 ? 's' : ''} from your classes</p>
          </div>
        </div>
      </div>
    </div>
  </header>

  <main class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
    {#if loading}
      <div class="flex items-center justify-center py-16">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
        <span class="ml-2 text-sm text-gray-500">Loading...</span>
      </div>
    {:else if exercises.length === 0}
      <div class="text-center py-16">
        <svg class="mx-auto h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="mt-3 text-sm text-gray-500">No exit tickets yet.</p>
        <div class="mt-4">
          <Button variant="secondary" size="sm" on:click={goBack}>Back to Dashboard</Button>
        </div>
      </div>
    {:else}
      <!-- Filter tabs -->
      <div class="flex items-center gap-1 mb-6 overflow-x-auto scrollbar-hide">
        {#each filterOptions as opt}
          <button
            type="button"
            class="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors {filter === opt.key ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}"
            on:click={() => filter = opt.key}
          >
            {opt.label}
            {#if counts[opt.key] > 0}
              <span class="ml-1 {filter === opt.key ? 'text-gray-300' : 'text-gray-400'}">{counts[opt.key]}</span>
            {/if}
          </button>
        {/each}
      </div>

      <!-- List -->
      {#if filtered.length > 0}
        <div class="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {#each filtered as exercise (exercise.id)}
            {@const status = getStatus(exercise)}
            <button
              type="button"
              class="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              on:click={() => goto(`/submissions/${exercise.id}`)}
            >
              <div class="w-1.5 h-1.5 rounded-full flex-shrink-0 {status.dot}"></div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-gray-900 truncate">{exercise.title}</p>
                <p class="text-xs text-gray-400 mt-0.5">
                  {exercise.class?.name ?? ''}
                  {#if exercise.dueDate}
                    &middot; Due {new Date(exercise.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  {/if}
                </p>
              </div>
              <span class="text-xs flex-shrink-0 {status.key === 'graded' ? 'text-green-600' : status.key === 'overdue' ? 'text-red-500' : status.key === 'submitted' ? 'text-blue-600' : 'text-yellow-600'}">
                {status.label}
              </span>
              <svg class="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          {/each}
        </div>
      {:else}
        <p class="text-sm text-gray-400 text-center py-8">No tickets match this filter.</p>
      {/if}
    {/if}
  </main>
</div>
