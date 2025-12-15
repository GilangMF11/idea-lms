<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.js';
  import Button from '$lib/components/Button.svelte';

  let exercise: any = null;
  let loading = true;
  let saving = false;
  let error = '';

  // Form data
  let formData = {
    title: '',
    description: '',
    content: '',
    dueDate: '',
    readingTextId: ''
  };

  let readingTexts: any[] = [];

  onMount(async () => {
    authStore.init();
    
    // Redirect if not authenticated
    if (!$authStore.isAuthenticated) {
      goto('/login');
      return;
    }

    // Check if user can edit exercises
    if (!['TEACHER', 'ADMIN'].includes($authStore.user?.role || '')) {
      goto('/login');
      return;
    }

    await Promise.all([loadExercise(), loadReadingTexts()]);
  });

  async function loadExercise() {
    try {
      loading = true;
      const response = await fetch(`/api/exercises/${$page.params.id}`, {
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        exercise = data.exercise;
        
        // Populate form data
        formData = {
          title: exercise.title || '',
          description: exercise.description || '',
          content: exercise.content || '',
          dueDate: exercise.dueDate ? new Date(exercise.dueDate).toISOString().split('T')[0] : '',
          readingTextId: exercise.readingTextId || ''
        };
      } else {
        const errorData = await response.json();
        error = errorData.error || 'Failed to load exercise';
      }
    } catch (err) {
      console.error('Error loading exercise:', err);
      error = 'Error loading exercise';
    } finally {
      loading = false;
    }
  }

  async function loadReadingTexts() {
    try {
      const response = await fetch(`/api/reading-texts?classId=${exercise?.classId}`, {
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        readingTexts = data.readingTexts || [];
      }
    } catch (err) {
      console.error('Error loading reading texts:', err);
    }
  }

  async function saveExercise() {
    if (!formData.title.trim()) {
      error = 'Title is required';
      return;
    }

    try {
      saving = true;
      error = '';

      const response = await fetch('/api/exercises', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: $page.params.id,
          title: formData.title.trim(),
          description: formData.description.trim(),
          content: formData.content.trim(),
          dueDate: formData.dueDate || null,
          readingTextId: formData.readingTextId || null
        })
      });

      if (response.ok) {
        const data = await response.json();
        exercise = data.exercise;
        
        // Navigate to view page
        goto(`/exercises/${$page.params.id}`);
      } else {
        const errorData = await response.json();
        error = errorData.error || 'Failed to update exercise';
      }
    } catch (err) {
      console.error('Error updating exercise:', err);
      error = 'Error updating exercise';
    } finally {
      saving = false;
    }
  }

  function cancel() {
    goto(`/exercises/${$page.params.id}`);
  }

  function goBack() {
    goto(`/classes/${exercise?.classId}/manage`);
  }
</script>

<svelte:head>
  <title>Edit {exercise?.title || 'Exercise'} - IDEA</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <button 
            class="text-gray-600 hover:text-gray-900 mb-4"
            on:click={goBack}
          >
            <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Class Management
          </button>
          <h1 class="text-3xl font-bold text-gray-900">
            Edit Exercise
          </h1>
          <p class="text-gray-600 mt-2">
            Update exercise details and content
          </p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    {#if loading}
      <div class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span class="ml-3 text-gray-600">Loading exercise...</span>
      </div>
    {/if}

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

    <!-- Edit Form -->
    {#if exercise && !loading && !error}
      <div class="bg-white shadow rounded-lg">
        <form on:submit|preventDefault={saveExercise}>
          <div class="px-6 py-8">
            <!-- Basic Information -->
            <div class="mb-8">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              
              <div class="grid grid-cols-1 gap-6">
                <!-- Title -->
                <div>
                  <label for="title" class="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    bind:value={formData.title}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter exit ticket title"
                    required
                  />
                </div>

                <!-- Description -->
                <div>
                  <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    bind:value={formData.description}
                    rows="3"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter exercise description"
                  ></textarea>
                </div>

                <!-- Content -->
                <div>
                  <label for="content" class="block text-sm font-medium text-gray-700 mb-2">
                    Exercise Content
                  </label>
                  <textarea
                    id="content"
                    bind:value={formData.content}
                    rows="8"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter exercise content and instructions"
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- Additional Settings -->
            <div class="mb-8">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Additional Settings</h3>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Due Date -->
                <div>
                  <label for="dueDate" class="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    id="dueDate"
                    bind:value={formData.dueDate}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <!-- Reading Text -->
                <div>
                  <label for="readingTextId" class="block text-sm font-medium text-gray-700 mb-2">
                    Related Reading Text
                  </label>
                  <select
                    id="readingTextId"
                    bind:value={formData.readingTextId}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">No reading text</option>
                    {#each readingTexts as readingText}
                      <option value={readingText.id}>{readingText.title}</option>
                    {/each}
                  </select>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Button 
                type="button" 
                variant="secondary" 
                on:click={cancel}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="primary"
                disabled={saving}
              >
                {#if saving}
                  <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                {:else}
                  Save Changes
                {/if}
              </Button>
            </div>
          </div>
        </form>
      </div>
    {/if}
  </div>
</div>
