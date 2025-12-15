<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.js';
  import Button from '$lib/components/Button.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import Alert from '$lib/components/Alert.svelte';

  let title = '';
  let description = '';
  let dueDate = '';
  let classId = '';
  let readingTextId = '';
  let classes: any[] = [];
  let readingTexts: any[] = [];
  let loading = false;
  let error = '';
  let content = '';
  let timerMinutes = '';
  let autoSubmitOnTimeout = true;

  onMount(() => {
    if (!$authStore.isAuthenticated || !['TEACHER', 'ADMIN'].includes($authStore.user?.role || '')) {
      goto('/dashboard');
      return;
    }

    // Get classId from URL params
    classId = $page.url.searchParams.get('classId') || '';
    loadClasses();
  });

  async function loadClasses() {
    try {
      const response = await fetch('/api/classes', {
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        classes = data.classes || [];
      }
    } catch (err) {
      console.error('Error loading classes:', err);
    }
  }

  async function loadReadingTexts() {
    if (!classId) {
      readingTexts = [];
      readingTextId = '';
      return;
    }

    try {
      const response = await fetch(`/api/reading-texts?classId=${classId}`, {
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
      readingTexts = [];
    }
  }

  $: if (classId) {
    loadReadingTexts();
    readingTextId = ''; // Reset reading text selection when class changes
  }

  async function handleSubmit() {
    if (!title.trim()) {
      error = 'Title is required';
      return;
    }

    if (!classId) {
      error = 'Please select a class';
      return;
    }

    if (!content.trim()) {
      error = 'Question content is required';
      return;
    }

    try {
    loading = true;
    error = '';

    const parsedMinutes = timerMinutes ? Number(timerMinutes) : 0;
    if (timerMinutes && (Number.isNaN(parsedMinutes) || parsedMinutes < 0)) {
      error = 'Timer value must be a positive number';
      loading = false;
      return;
    }

    const timerDuration = parsedMinutes > 0 ? parsedMinutes * 60 : null;

    const response = await fetch('/api/exercises', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${$authStore.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        content: content.trim(),
        classId,
        readingTextId: readingTextId || null,
        dueDate: dueDate || null,
        timerDuration,
        autoSubmitOnTimeout
      })
    });

      const data = await response.json();

      if (response.ok) {
        goto(`/classes/${classId}/manage`);
      } else {
        error = data.error || 'Failed to create exercise';
      }
    } catch (err) {
      console.error('Create exercise error:', err);
      error = 'Failed to create exercise';
    } finally {
      loading = false;
    }
  }

  function goBack() {
    if (classId) {
      goto(`/classes/${classId}/manage`);
    } else {
      goto('/dashboard');
    }
  }

</script>

<svelte:head>
  <title>Create Exercise - IDEA</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white shadow">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center">
          <div class="mr-4">
            <Button variant="secondary" size="sm" on:click={goBack}>
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Button>
          </div>
          <h1 class="text-xl font-semibold text-gray-900">Create New Exit Tickets</h1>
        </div>
      </div>
    </div>
  </div>

  <!-- Form -->
  <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="bg-white rounded-lg shadow p-6">
      <form on:submit|preventDefault={handleSubmit}>
        <div class="space-y-6">
          <div>
            <h2 class="text-lg font-medium text-gray-900 mb-4">Exit Tickets Information</h2>
            
            {#if error}
              <Alert type="error" message={error} />
            {/if}

            <div class="space-y-4">
              <FormField
                label="Exit Ticket Title"
                type="text"
                bind:value={title}
                placeholder="Enter exit ticket title"
                required
              />

              <div>
                <label for="content" class="block text-sm font-medium text-gray-700 mb-2">
                  Question Content
                </label>
                <textarea
                  id="content"
                  bind:value={content}
                  rows="5"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Paste the question or prompt that students should read before answering"
                  required
                ></textarea>
              </div>

              <div>
                <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  bind:value={description}
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter exercise description (optional)"
                ></textarea>
              </div>

              <div>
                <label for="classId" class="block text-sm font-medium text-gray-700 mb-2">
                  Class
                </label>
                <select
                  id="classId"
                  bind:value={classId}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  <option value="">Select a class</option>
                  {#each classes as cls}
                    <option value={cls.id}>{cls.name}</option>
                  {/each}
                </select>
              </div>

              {#if classId}
                <div>
                  <label for="readingTextId" class="block text-sm font-medium text-gray-700 mb-2">
                    Reading Text (Optional)
                    <span class="text-xs font-normal text-gray-500 ml-1">- Link to a reading text</span>
                  </label>
                  <select
                    id="readingTextId"
                    bind:value={readingTextId}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">No reading text</option>
                    {#each readingTexts as text}
                      <option value={text.id}>{text.title} {#if text.group}(Group: {text.group.name}){/if}</option>
                    {/each}
                  </select>
                  {#if readingTexts.length === 0 && classId}
                    <p class="mt-1 text-xs text-gray-500">No reading texts available in this class. Create a reading text first.</p>
                  {/if}
                </div>
              {/if}

              <div>
                <label for="dueDate" class="block text-sm font-medium text-gray-700 mb-2">
                  Due Date (Optional)
                </label>
                <input
                  id="dueDate"
                  type="datetime-local"
                  bind:value={dueDate}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="timerMinutes" class="block text-sm font-medium text-gray-700 mb-2">
                    Timer (minutes, optional)
                  </label>
                  <input
                    id="timerMinutes"
                    type="number"
                    min="0"
                    step="1"
                    bind:value={timerMinutes}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g. 10"
                  />
                  <p class="text-xs text-gray-500 mt-1">
                    Set to 0 or leave blank to disable the countdown.
                  </p>
                </div>
                <div class="flex items-center space-x-3">
                  <input
                    id="autoSubmitOnTimeout"
                    type="checkbox"
                    class="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    bind:checked={autoSubmitOnTimeout}
                  />
                  <label for="autoSubmitOnTimeout" class="text-sm font-medium text-gray-700">
                    Auto submit when timer ends
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-end space-x-3">
            <Button type="button" variant="secondary" on:click={goBack}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {#if loading}
                <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              {/if}
              {loading ? 'Creating...' : 'Create Exercise'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  </div>
</div>
