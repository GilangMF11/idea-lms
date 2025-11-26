<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.js';
  import Button from '$lib/components/Button.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import Alert from '$lib/components/Alert.svelte';

  let name = '';
  let description = '';
  let loading = false;
  let error = '';

  onMount(() => {
    if (!$authStore.isAuthenticated || !['TEACHER', 'ADMIN'].includes($authStore.user?.role || '')) {
      goto('/dashboard');
      return;
    }
  });

  async function handleSubmit() {
    if (!name.trim()) {
      error = 'Class name is required';
      return;
    }

    try {
      loading = true;
      error = '';

      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        goto(`/classes/${data.class.id}/manage`);
      } else {
        error = data.error || 'Failed to create class';
      }
    } catch (err) {
      console.error('Create class error:', err);
      error = 'Failed to create class';
    } finally {
      loading = false;
    }
  }

  function goBack() {
    goto('/dashboard');
  }

  function handleKeydown(event: Event) {
    const e = event as KeyboardEvent;
    if (e.key === 'Enter') {
      handleSubmit();
    }
  }
</script>

<svelte:head>
  <title>Create Class - IDEA</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white shadow">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center">
          <Button variant="secondary" size="sm" on:click={goBack} class="mr-4">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Button>
          <h1 class="text-xl font-semibold text-gray-900">Create New Class</h1>
        </div>
      </div>
    </div>
  </div>

  <!-- Form -->
  <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="bg-white rounded-lg shadow p-6">
      <form on:submit|preventDefault={handleSubmit} on:keydown={handleKeydown}>
        <div class="space-y-6">
          <div>
            <h2 class="text-lg font-medium text-gray-900 mb-4">Class Information</h2>
            
            {#if error}
              <Alert type="error" message={error} />
            {/if}

            <div class="space-y-4">
              <FormField
                label="Class Name"
                type="text"
                bind:value={name}
                placeholder="Enter class name"
                required
              />

              <div>
                <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  bind:value={description}
                  rows="4"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter class description (optional)"
                ></textarea>
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
              {loading ? 'Creating...' : 'Create Class'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  </div>
</div>
