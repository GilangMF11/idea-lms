<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { authStore } from '$lib/stores/auth.js';
  import Button from '$lib/components/Button.svelte';

  let classData: any = null;
  let exercises: any[] = [];
  let readingTexts: any[] = [];
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
    }
  }

  function goBack() {
    goto('/dashboard');
  }
</script>

<svelte:head>
  <title>{classData?.name || 'Class Details'} - LMS IDEA</title>
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

    <!-- Reading Texts Section -->
    <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900">Reading Materials ({readingTexts.length})</h3>
        </div>
      </div>

      {#if readingTexts.length > 0}
        <div class="space-y-4">
          {#each readingTexts as readingText}
            <button 
              class="w-full group bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 hover:shadow-md transition-all duration-200 text-left"
              on:click={() => goto(`/reading-texts/${readingText.id}`)}
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-3 mb-2">
                    <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{readingText.title}</p>
                      <p class="text-xs text-gray-600">{readingText.author || 'No author'}</p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-4 text-xs text-gray-500">
                    <div class="flex items-center space-x-1">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span>{readingText._aggr_count_annotations || 0} annotations</span>
                    </div>
                    <div class="flex items-center space-x-1">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Created {new Date(readingText.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Reading Text
                  </span>
                  <svg class="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          {/each}
        </div>
      {:else}
        <div class="text-center py-12">
          <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No reading materials yet</h3>
          <p class="text-sm text-gray-500 mb-6">Reading materials will appear here when your teacher adds them.</p>
        </div>
      {/if}
    </div>

    <!-- Assignments Section -->
    <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900">Assignments ({exercises.length})</h3>
        </div>
      </div>

      {#if exercises.length > 0}
        <div class="space-y-6">
          {#each readingTexts as readingText}
            <!-- Reading Text Group -->
            <div class="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200 p-4">
              <div class="flex items-center space-x-3 mb-4">
                <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h4 class="text-lg font-semibold text-gray-900">{readingText.title}</h4>
                  <p class="text-sm text-gray-600">{readingText.author || 'No author'}</p>
                </div>
              </div>
              
              <!-- Related Assignments -->
              {#if exercises.filter(ex => ex.readingTextId === readingText.id).length > 0}
                <div class="space-y-3">
                  {#each exercises.filter(ex => ex.readingTextId === readingText.id) as exercise}
                    <button 
                      class="w-full group bg-white rounded-lg border border-gray-200 p-4 hover:border-purple-300 hover:shadow-md transition-all duration-200 text-left"
                      on:click={() => goto(`/exercises/${exercise.id}`)}
                    >
                      <div class="flex items-center justify-between">
                        <div class="flex-1">
                          <div class="flex items-center space-x-3 mb-2">
                            <div class="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center">
                              <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                            </div>
                            <div>
                              <p class="text-sm font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">{exercise.title}</p>
                              <p class="text-xs text-gray-600">{exercise.description || 'No description'}</p>
                            </div>
                          </div>
                          <div class="flex items-center space-x-4 text-xs text-gray-500">
                            <div class="flex items-center space-x-1">
                              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Due {exercise.dueDate ? new Date(exercise.dueDate).toLocaleDateString() : 'No due date'}</span>
                            </div>
                            <div class="flex items-center space-x-1">
                              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span>{exercise.type}</span>
                            </div>
                          </div>
                        </div>
                        <div class="flex items-center space-x-2">
                          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Assignment
                          </span>
                          <svg class="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  {/each}
                </div>
              {:else}
                <div class="text-center py-6">
                  <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p class="text-sm text-gray-500">No assignments related to this reading text yet</p>
                </div>
              {/if}
            </div>
          {/each}
          
          <!-- Standalone Assignments (without reading text) -->
          {#if exercises.filter(ex => !ex.readingTextId).length > 0}
            <div class="bg-gradient-to-r from-gray-50 to-purple-50 rounded-xl border border-gray-200 p-4">
              <div class="flex items-center space-x-3 mb-4">
                <div class="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h4 class="text-lg font-semibold text-gray-900">General Assignments</h4>
                  <p class="text-sm text-gray-600">Assignments not related to specific reading materials</p>
                </div>
              </div>
              
              <div class="space-y-3">
                {#each exercises.filter(ex => !ex.readingTextId) as exercise}
                  <button 
                    class="w-full group bg-white rounded-lg border border-gray-200 p-4 hover:border-purple-300 hover:shadow-md transition-all duration-200 text-left"
                    on:click={() => goto(`/exercises/${exercise.id}`)}
                  >
                    <div class="flex items-center justify-between">
                      <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-2">
                          <div class="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center">
                            <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <div>
                            <p class="text-sm font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">{exercise.title}</p>
                            <p class="text-xs text-gray-600">{exercise.description || 'No description'}</p>
                          </div>
                        </div>
                        <div class="flex items-center space-x-4 text-xs text-gray-500">
                          <div class="flex items-center space-x-1">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Due {exercise.dueDate ? new Date(exercise.dueDate).toLocaleDateString() : 'No due date'}</span>
                          </div>
                          <div class="flex items-center space-x-1">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>{exercise.type}</span>
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center space-x-2">
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Assignment
                        </span>
                        <svg class="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <div class="text-center py-12">
          <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
          <p class="text-sm text-gray-500 mb-6">Assignments will appear here when your teacher creates them.</p>
          <Button variant="primary" size="md" on:click={() => goto('/assignments')}>
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View All Assignments
          </Button>
        </div>
      {/if}
    </div>
  </div>
</div>