<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { authStore } from '$lib/stores/auth.js';
  import Button from '$lib/components/Button.svelte';

  let classData: any = null;
  let students: any[] = [];
  let exercises: any[] = [];
  let readingTexts: any[] = [];
  let loading = true;
  let error = '';
  let activeTab = 'overview';
  let showReadingTextDialog = false;
  let blockedExercise: any = null;

  onMount(() => {
    authStore.init();
    
    // Redirect if not authenticated
    if (!$authStore.isAuthenticated) {
      goto('/login');
      return;
    }
    
    loadClassData();
  });

  async function loadClassData() {
    try {
      loading = true;
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
        classData = classResult.classes?.[0] || classResult.class;
      }

      // Load students (only for teachers and admins)
      if ($authStore.user?.role === 'TEACHER' || $authStore.user?.role === 'ADMIN') {
      const studentsResponse = await fetch(`/api/class-students?classId=${classId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (studentsResponse.ok) {
        const studentsResult = await studentsResponse.json();
        students = studentsResult.students || [];
        }
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

      // Load reading texts
      const readingTextsResponse = await fetch(`/api/reading-texts?classId=${classId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (readingTextsResponse.ok) {
        const readingTextsResult = await readingTextsResponse.json();
        readingTexts = readingTextsResult.readingTexts || [];
      }

    } catch (err) {
      console.error('Error loading class data:', err);
      error = 'Failed to load class data';
    } finally {
      loading = false;
    }
  }

  function goBack() {
    goto('/dashboard');
  }

  async function handleExerciseClick(exercise: any) {
    // Check if exercise has reading text with timer
    if (exercise.readingTextId && exercise.readingText?.timerDuration && exercise.readingText.timerDuration > 0) {
      let timerFinished = false;
      
      // Check database timer first
      try {
        const timerResponse = await fetch(`/api/reading-text-timers?readingTextId=${exercise.readingTextId}`, {
          headers: {
            'Authorization': `Bearer ${$authStore.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (timerResponse.ok) {
          const timerData = await timerResponse.json();
          const timer = timerData.timer;

          if (timer) {
            // Timer exists in database - check if finished
            timerFinished = timer.isFinished || (timer.remainingSeconds !== undefined && timer.remainingSeconds <= 0);
          } else {
            // Timer doesn't exist in database - check localStorage as fallback
            if (typeof window !== 'undefined') {
              const key = `reading-text-timer-${exercise.readingTextId}`;
              const saved = localStorage.getItem(key);
              if (saved) {
                try {
                  const parsed = JSON.parse(saved);
                  const now = Date.now();
                  const remainingMs = parsed.end - now;
                  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
                  timerFinished = remainingSeconds <= 0;
                } catch (err) {
                  // If localStorage parse fails, assume timer not finished
                  timerFinished = false;
                }
              } else {
                // No timer in database or localStorage - timer hasn't started, block access
                timerFinished = false;
              }
            } else {
              // Server-side, assume timer not finished
              timerFinished = false;
            }
          }
        }
      } catch (err) {
        console.error('Error checking reading text timer:', err);
        // On error, block access to be safe
        timerFinished = false;
      }

      // If timer is not finished, show dialog
      if (!timerFinished) {
        blockedExercise = exercise;
        showReadingTextDialog = true;
        return;
      }
    }

    // If no timer restriction or timer is finished, proceed to exercise
    goto(`/submissions/${exercise.id}`);
  }

  function closeReadingTextDialog() {
    showReadingTextDialog = false;
    blockedExercise = null;
  }

  function goToReadingText() {
    if (blockedExercise?.readingTextId) {
      goto(`/reading-texts/${blockedExercise.readingTextId}`);
    }
    closeReadingTextDialog();
  }
</script>

<svelte:head>
  <title>{classData?.name || 'Class Details'} - IDEA</title>
</svelte:head>

{#if loading}
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
      <p class="text-sm text-gray-500 mt-4">Loading class details...</p>
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
{:else if classData}
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="py-3 sm:py-4">
          <!-- Top row: Back button and title -->
          <div class="flex items-center mb-3 sm:mb-0">
            <div class="mr-2 sm:mr-4 flex-shrink-0">
              <Button variant="secondary" size="sm" on:click={goBack}>
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                <span class="hidden sm:inline">Back</span>
              </Button>
            </div>
            <div class="min-w-0 flex-1">
              <h1 class="text-lg sm:text-2xl font-bold text-gray-900 truncate">{classData.name}</h1>
              <p class="text-xs sm:text-sm text-gray-600 truncate">{classData.description || 'No description'}</p>
            </div>
          </div>
          
          <!-- Bottom row: User info and class code -->
          <div class="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4 mt-3 sm:mt-0">
            <!-- User info - hidden on mobile, visible on sm and up -->
            {#if $authStore.user?.role === 'STUDENT'}
              <div class="hidden sm:flex items-center space-x-3">
                <div class="text-right">
                  <p class="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                    {$authStore.user?.firstName} {$authStore.user?.lastName}
                  </p>
                  <p class="text-xs text-gray-500">Student</p>
                </div>
                <div class="h-10 w-10 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span class="text-sm font-medium text-white">
                    {$authStore.user?.firstName?.charAt(0)}{$authStore.user?.lastName?.charAt(0)}
                  </span>
                </div>
              </div>
            {:else}
              <div class="hidden sm:flex items-center space-x-3">
                <div class="text-right">
                  <p class="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                    {classData.teacher?.firstName} {classData.teacher?.lastName}
                  </p>
                  <p class="text-xs text-gray-500">Teacher</p>
                </div>
                <div class="h-10 w-10 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span class="text-sm font-medium text-white">
                    {classData.teacher?.firstName?.charAt(0)}{classData.teacher?.lastName?.charAt(0)}
                  </span>
                </div>
              </div>
            {/if}
            <!-- Class Code -->
            <div class="text-right sm:text-right">
              <p class="text-xs sm:text-sm text-gray-500">Class Code</p>
              <p class="text-base sm:text-lg font-semibold text-gray-900">{classData.code}</p>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Stats Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div class="card p-4 sm:p-6">
          <div class="flex items-center">
            <div class="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <svg class="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div class="ml-2 sm:ml-4 min-w-0">
              <p class="text-xs sm:text-sm font-medium text-gray-600 truncate">Students</p>
              <p class="text-xl sm:text-2xl font-semibold text-gray-900">{students.length}</p>
            </div>
          </div>
        </div>

        <div class="card p-4 sm:p-6">
          <div class="flex items-center">
            <div class="p-2 bg-green-100 rounded-lg flex-shrink-0">
              <svg class="h-5 w-5 sm:h-6 sm:w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div class="ml-2 sm:ml-4 min-w-0">
              <p class="text-xs sm:text-sm font-medium text-gray-600 truncate">Reading Texts</p>
              <p class="text-xl sm:text-2xl font-semibold text-gray-900">{readingTexts.length}</p>
            </div>
          </div>
        </div>

        <div class="card p-4 sm:p-6">
          <div class="flex items-center">
            <div class="p-2 bg-yellow-100 rounded-lg flex-shrink-0">
              <svg class="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="ml-2 sm:ml-4 min-w-0">
              <p class="text-xs sm:text-sm font-medium text-gray-600 truncate">Exit Tickets</p>
              <p class="text-xl sm:text-2xl font-semibold text-gray-900">{exercises.length}</p>
            </div>
          </div>
        </div>

        <div class="card p-4 sm:p-6">
          <div class="flex items-center">
            <div class="p-2 bg-purple-100 rounded-lg flex-shrink-0">
              <svg class="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div class="ml-2 sm:ml-4 min-w-0">
              <p class="text-xs sm:text-sm font-medium text-gray-600 truncate">Completion Rate</p>
              <p class="text-xl sm:text-2xl font-semibold text-gray-900">-</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="mb-8">
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex space-x-3 sm:space-x-8 overflow-x-auto scrollbar-hide">
            <button
              class="py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 {activeTab === 'overview' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
              on:click={() => activeTab = 'overview'}
            >
              Overview
            </button>
            {#if $authStore.user?.role === 'TEACHER' || $authStore.user?.role === 'ADMIN'}
            <button
              class="py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 {activeTab === 'students' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
              on:click={() => activeTab = 'students'}
            >
              <span class="inline sm:hidden">Std </span>
              <span class="hidden sm:inline">Students </span>
              <span class="text-primary-600 font-semibold">({students.length})</span>
            </button>
            {/if}
            <button
              class="py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 {activeTab === 'assignments' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
              on:click={() => activeTab = 'assignments'}
            >
              <span class="inline sm:hidden">Tickets </span>
              <span class="hidden sm:inline">Exit Tickets </span>
              <span class="text-primary-600 font-semibold">({exercises.length})</span>
            </button>
            <button
              class="py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 {activeTab === 'materials' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
              on:click={() => activeTab = 'materials'}
            >
              <span class="inline sm:hidden">Read </span>
              <span class="hidden sm:inline">Materials </span>
              <span class="text-primary-600 font-semibold">({readingTexts.length})</span>
            </button>
          </nav>
        </div>
      </div>

      <!-- Tab Content -->
      {#if activeTab === 'overview'}
        {@render overviewTab()}
      {:else if activeTab === 'students'}
        {@render studentsTab()}
      {:else if activeTab === 'assignments'}
        {@render assignmentsTab()}
      {:else if activeTab === 'materials'}
        {@render materialsTab()}
      {/if}
    </main>
  </div>
{/if}

<!-- Reading Text Dialog -->
{#if showReadingTextDialog && blockedExercise}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" on:click={closeReadingTextDialog}>
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4" on:click|stopPropagation>
      <div class="flex items-center justify-center mb-4">
        <div class="bg-yellow-100 rounded-full p-3">
          <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      </div>
      <h3 class="text-lg font-semibold text-gray-900 text-center mb-2">Reading Required</h3>
      <p class="text-sm text-gray-600 text-center mb-6">
        You need to complete reading the text "<strong>{blockedExercise.readingText?.title || 'Reading Material'}</strong>" before you can access this exit ticket.
      </p>
      <div class="flex space-x-3">
        <Button variant="secondary" size="md" fullWidth on:click={closeReadingTextDialog}>
          Cancel
        </Button>
        <Button variant="primary" size="md" fullWidth on:click={goToReadingText}>
          Go to Reading Text
        </Button>
      </div>
    </div>
  </div>
{/if}

<!-- Overview Tab -->
{#snippet overviewTab()}
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <!-- Class Information -->
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Class Information</h3>
      <dl class="divide-y divide-gray-100">
        <div class="grid grid-cols-[minmax(0,7.5rem)_1fr] gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
          <dt class="text-sm font-medium text-gray-500">Class Name</dt>
          <dd class="text-sm text-gray-900">{classData.name}</dd>
        </div>
        <div class="grid grid-cols-[minmax(0,7.5rem)_1fr] gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
          <dt class="text-sm font-medium text-gray-500">Class Code</dt>
          <dd class="text-sm font-semibold text-gray-900">{classData.code}</dd>
        </div>
        <div class="grid grid-cols-[minmax(0,7.5rem)_1fr] gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
          <dt class="text-sm font-medium text-gray-500">Description</dt>
          <dd class="text-sm text-gray-900">{classData.description || 'No description provided'}</dd>
        </div>
        <div class="grid grid-cols-[minmax(0,7.5rem)_1fr] gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
          <dt class="text-sm font-medium text-gray-500">Teacher</dt>
          <dd class="text-sm text-gray-900">{classData.teacher?.firstName} {classData.teacher?.lastName}</dd>
        </div>
        <div class="grid grid-cols-[minmax(0,7.5rem)_1fr] gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
          <dt class="text-sm font-medium text-gray-500">Created</dt>
          <dd class="text-sm text-gray-900">{new Date(classData.createdAt).toLocaleDateString()}</dd>
        </div>
        <div class="grid grid-cols-[minmax(0,7.5rem)_1fr] gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
          <dt class="text-sm font-medium text-gray-500">Last Updated</dt>
          <dd class="text-sm text-gray-900">{classData.updatedAt ? new Date(classData.updatedAt).toLocaleDateString() : '—'}</dd>
        </div>
        <div class="grid grid-cols-[minmax(0,7.5rem)_1fr] gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
          <dt class="text-sm font-medium text-gray-500">Status</dt>
          <dd class="text-sm">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {classData.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
              {classData.isActive !== false ? 'Active' : 'Inactive'}
            </span>
          </dd>
        </div>
      </dl>
    </div>

    <!-- Statistics -->
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
      <dl class="divide-y divide-gray-100">
        <div class="grid grid-cols-[minmax(0,7.5rem)_1fr] gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
          <dt class="text-sm font-medium text-gray-500">Students</dt>
          <dd class="text-sm font-semibold text-gray-900">{students.length}</dd>
        </div>
        <div class="grid grid-cols-[minmax(0,7.5rem)_1fr] gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
          <dt class="text-sm font-medium text-gray-500">Reading Texts</dt>
          <dd class="text-sm font-semibold text-gray-900">{readingTexts.length}</dd>
        </div>
        <div class="grid grid-cols-[minmax(0,7.5rem)_1fr] gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
          <dt class="text-sm font-medium text-gray-500">Exit Tickets</dt>
          <dd class="text-sm font-semibold text-gray-900">{exercises.length}</dd>
        </div>
        <div class="grid grid-cols-[minmax(0,7.5rem)_1fr] gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
          <dt class="text-sm font-medium text-gray-500">Completion Rate</dt>
          <dd class="text-sm text-gray-900">—</dd>
        </div>
      </dl>
    </div>

    <!-- Quick Actions -->
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
      <div class="space-y-3">
        {#if $authStore.user?.role === 'TEACHER' || $authStore.user?.role === 'ADMIN'}
          <Button variant="primary" size="md" fullWidth on:click={() => goto(`/classes/${classData.id}/manage`)}>
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Manage Class
          </Button>
        {/if}
        {#if $authStore.user?.role === 'TEACHER' || $authStore.user?.role === 'ADMIN'}
          <Button variant="secondary" size="md" fullWidth on:click={() => goto('/analytics')}>
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            View Analytics
          </Button>
        {/if}
        <Button variant="secondary" size="md" fullWidth on:click={() => goto('/dashboard')}>
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
          </svg>
          Back to Dashboard
        </Button>
      </div>
    </div>
  </div>
{/snippet}

<!-- Students Tab -->
{#snippet studentsTab()}
  <div class="card p-4 sm:p-6">
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-2">
      <h3 class="text-lg font-semibold text-gray-900">Students ({students.length})</h3>
      <div class="text-xs sm:text-sm text-gray-500">
        Total enrolled students
      </div>
    </div>

    {#if students.length > 0}
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Email</th>
              <th class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Username</th>
              <th class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Joined</th>
              <th class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each students as student}
              <tr>
                <td class="px-3 sm:px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                      <span class="text-xs sm:text-sm font-medium text-primary-600">
                        {student.student?.firstName?.charAt(0)}{student.student?.lastName?.charAt(0)}
                      </span>
                    </div>
                    <div class="min-w-0">
                      <div class="text-xs sm:text-sm font-medium text-gray-900 truncate">
                        {student.student?.firstName} {student.student?.lastName}
                      </div>
                      <div class="text-xs text-gray-500 sm:hidden truncate">
                        {student.student?.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden sm:table-cell">
                  {student.student?.email}
                </td>
                <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                  {student.student?.username}
                </td>
                <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden lg:table-cell">
                  {new Date(student.createdAt).toLocaleDateString()}
                </td>
                <td class="px-3 sm:px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No students yet</h3>
        <p class="mt-1 text-sm text-gray-500">Add students to this class to get started.</p>
        {#if $authStore.user?.role === 'TEACHER' || $authStore.user?.role === 'ADMIN'}
          <div class="mt-6">
            <Button variant="primary" size="sm" on:click={() => goto(`/classes/${classData.id}/manage`)}>
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Manage Class
            </Button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/snippet}

<!-- Exit Tickets Tab -->
{#snippet assignmentsTab()}
  <div class="card p-6">
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-lg font-semibold text-gray-900">Exit Tickets ({exercises.length})</h3>
      <div class="text-sm text-gray-500">
        Total exit tickets
      </div>
    </div>

    {#if exercises.length > 0}
      <div class="space-y-4">
        {#each exercises as exercise}
          {#if $authStore.user?.role === 'STUDENT'}
            <!-- Student view: clickable card -->
            <div 
              class="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-primary-300 hover:shadow-md transition-all"
              on:click={() => handleExerciseClick(exercise)}
              role="button"
              tabindex="0"
              on:keydown={(e) => e.key === 'Enter' && handleExerciseClick(exercise)}
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <h4 class="text-sm font-medium text-gray-900">{exercise.title}</h4>
                  <p class="text-sm text-gray-500 mt-1">{exercise.description || 'No description'}</p>
                  <div class="flex items-center mt-2 space-x-4">
                    <span class="text-xs text-gray-500">
                      Due: {exercise.dueDate ? new Date(exercise.dueDate).toLocaleDateString() : 'No due date'}
                    </span>
                    <span class="text-xs text-gray-500">
                      Submissions: {exercise._count?.submissions || 0}
                    </span>
                  </div>
                </div>
                <div class="ml-4">
                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          {:else}
            <!-- Teacher/Admin view: card with buttons -->
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
                      Submissions: {exercise._count?.submissions || 0}
                    </span>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <Button variant="secondary" size="sm" on:click={() => goto(`/exercises/${exercise.id}/edit`)}>
                    Edit
                  </Button>
                  <Button variant="primary" size="sm" on:click={() => goto(`/submissions/${exercise.id}`)}>
                    View
                  </Button>
                </div>
              </div>
            </div>
          {/if}
        {/each}
      </div>
    {:else}
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No exit tickets yet</h3>
        <p class="mt-1 text-sm text-gray-500">Create exit tickets for this class to get started.</p>
        {#if $authStore.user?.role === 'TEACHER' || $authStore.user?.role === 'ADMIN'}
          <div class="mt-6">
            <Button variant="primary" size="sm" on:click={() => goto(`/exercises/create?classId=${classData.id}`)}>
              Create Exit Ticket
            </Button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/snippet}

<!-- Materials Tab -->
{#snippet materialsTab()}
  <div class="card p-6">
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-lg font-semibold text-gray-900">Reading Materials ({readingTexts.length})</h3>
      <div class="text-sm text-gray-500">
        Total reading materials
      </div>
    </div>

    {#if readingTexts.length > 0}
      <div class="space-y-4">
        {#each readingTexts as text}
          {#if $authStore.user?.role === 'STUDENT'}
            <!-- Student view: clickable card -->
            <div 
              class="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-primary-300 hover:shadow-md transition-all"
              on:click={() => goto(`/reading-texts/${text.id}`)}
              role="button"
              tabindex="0"
              on:keydown={(e) => e.key === 'Enter' && goto(`/reading-texts/${text.id}`)}
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <h4 class="text-sm font-medium text-gray-900">{text.title}</h4>
                  <p class="text-sm text-gray-500 mt-1">{text.author || 'Unknown author'}</p>
                  <p class="text-sm text-gray-500 mt-1">{text.source || 'No source'}</p>
                  <div class="flex items-center mt-2 space-x-4">
                    <span class="text-xs text-gray-500">
                      Created: {new Date(text.createdAt).toLocaleDateString()}
                    </span>
                    <span class="text-xs text-gray-500">
                      Status: {text.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div class="ml-4">
                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          {:else}
            <!-- Teacher/Admin view: card with buttons -->
            <div class="border border-gray-200 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <h4 class="text-sm font-medium text-gray-900">{text.title}</h4>
                  <p class="text-sm text-gray-500 mt-1">{text.author || 'Unknown author'}</p>
                  <p class="text-sm text-gray-500 mt-1">{text.source || 'No source'}</p>
                  <div class="flex items-center mt-2 space-x-4">
                    <span class="text-xs text-gray-500">
                      Created: {new Date(text.createdAt).toLocaleDateString()}
                    </span>
                    <span class="text-xs text-gray-500">
                      Status: {text.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <Button variant="secondary" size="sm" on:click={() => goto(`/reading-texts/${text.id}/edit`)}>
                    Edit
                  </Button>
                  <Button variant="primary" size="sm" on:click={() => goto(`/reading-texts/${text.id}`)}>
                    View & Annotate
                  </Button>
                </div>
              </div>
            </div>
          {/if}
        {/each}
      </div>
    {:else}
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No reading materials yet</h3>
        <p class="mt-1 text-sm text-gray-500">Add reading materials for this class to get started.</p>
        {#if $authStore.user?.role === 'TEACHER' || $authStore.user?.role === 'ADMIN'}
          <div class="mt-6">
            <Button 
              variant="primary" 
              size="sm" 
              on:click={() => goto(`/reading-texts/create?classId=${classData.id}`)}
            >
              Add Material
            </Button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/snippet}
