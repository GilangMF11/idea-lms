<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.js';
  import Button from '$lib/components/Button.svelte';

  let exercise: any = null;
  let loading = true;
  let error = '';
  let submission: any = null;
  let submissions: any[] = [];
  let showSubmissionForm = false;
  let submissionForm = {
    answer: '',
    files: [] as File[]
  };
  let submitting = false;

  onMount(async () => {
    authStore.init();
    
    // Redirect if not authenticated
    if (!$authStore.isAuthenticated) {
      goto('/login');
      return;
    }

    await loadExercise();
    await loadSubmissions();
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

  function editExercise() {
    goto(`/exercises/${$page.params.id}/edit`);
  }

  async function loadSubmissions() {
    try {
      const response = await fetch(`/api/exercise-submissions?exerciseId=${$page.params.id}`, {
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        submissions = data.submissions || [];
        
        // Find current user's submission
        submission = submissions.find(sub => sub.userId === $authStore.user?.id);
      }
    } catch (err) {
      console.error('Error loading submissions:', err);
    }
  }

  async function submitExercise() {
    if (!submissionForm.answer.trim()) {
      error = 'Please provide an answer';
      return;
    }

    try {
      submitting = true;
      error = '';

      const formData = new FormData();
      formData.append('exerciseId', $page.params.id as string);
      formData.append('answer', submissionForm.answer.trim());
      
      // Add files if any
      submissionForm.files.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });

      const response = await fetch('/api/exercise-submissions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${$authStore.token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        submission = data.submission;
        showSubmissionForm = false;
        submissionForm = { answer: '', files: [] };
        await loadSubmissions();
      } else {
        const errorData = await response.json();
        error = errorData.error || 'Failed to submit exercise';
      }
    } catch (err) {
      console.error('Error submitting exercise:', err);
      error = 'Error submitting exercise';
    } finally {
      submitting = false;
    }
  }

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files) {
      submissionForm.files = Array.from(target.files);
    }
  }

  function removeFile(index: number) {
    submissionForm.files = submissionForm.files.filter((_, i) => i !== index);
  }

  function goBack() {
    if ($authStore.user?.role === 'STUDENT') {
      goto(`/classes/${exercise?.classId}`);
    } else {
      goto(`/classes/${exercise?.classId}/manage`);
    }
  }
</script>

<svelte:head>
  <title>{exercise?.title || 'Exercise'} - LMS</title>
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
            {exercise?.title || 'Exercise'}
          </h1>
          <p class="text-gray-600 mt-2">
            {exercise?.description || 'No description available'}
          </p>
        </div>
        {#if exercise && ['TEACHER', 'ADMIN'].includes($authStore.user?.role || '')}
          <Button variant="primary" on:click={editExercise}>
            Edit Exercise
          </Button>
        {/if}
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

    <!-- Exercise Content -->
    {#if exercise && !loading && !error}
      <div class="bg-white shadow rounded-lg">
        <div class="px-6 py-8">
          <!-- Exercise Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide">Exercise Details</h3>
              <dl class="mt-2 space-y-2">
                <div>
                  <dt class="text-sm font-medium text-gray-900">Type</dt>
                  <dd class="text-sm text-gray-600">{exercise.type}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-900">Class</dt>
                  <dd class="text-sm text-gray-600">{exercise.class?.name}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-900">Created</dt>
                  <dd class="text-sm text-gray-600">
                    {new Date(exercise.createdAt).toLocaleDateString()}
                  </dd>
                </div>
                {#if exercise.dueDate}
                  <div>
                    <dt class="text-sm font-medium text-gray-900">Due Date</dt>
                    <dd class="text-sm text-gray-600">
                      {new Date(exercise.dueDate).toLocaleDateString()}
                    </dd>
                  </div>
                {/if}
              </dl>
            </div>
            
            <div>
              <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide">Status</h3>
              <div class="mt-2">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {exercise.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                  {exercise.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          <!-- Exercise Content -->
          <div class="border-t border-gray-200 pt-8">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Exercise Content</h3>
            <div class="prose max-w-none">
              {#if exercise.content}
                <div class="whitespace-pre-wrap text-gray-700">
                  {exercise.content}
                </div>
              {:else}
                <p class="text-gray-500 italic">No content available for this exercise.</p>
              {/if}
            </div>
          </div>

          <!-- Reading Text Reference -->
          {#if exercise.readingText}
            <div class="border-t border-gray-200 pt-8">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Related Reading Text</h3>
              <div class="bg-gray-50 rounded-lg p-4">
                <h4 class="font-medium text-gray-900">{exercise.readingText.title}</h4>
                <p class="text-sm text-gray-600 mt-1">
                  <a 
                    href="/reading-texts/{exercise.readingText.id}" 
                    class="text-primary-600 hover:text-primary-900"
                  >
                    View Reading Text →
                  </a>
                </p>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Student Submission Section -->
      {#if $authStore.user?.role === 'STUDENT'}
        <div class="bg-white shadow rounded-lg mt-6">
          <div class="px-6 py-8">
            <h3 class="text-lg font-medium text-gray-900 mb-6">Your Submission</h3>
            
            {#if submission}
              <!-- Existing Submission -->
              <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div class="flex items-center mb-2">
                  <svg class="h-5 w-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h4 class="text-sm font-medium text-green-800">Submission Submitted</h4>
                </div>
                <p class="text-sm text-green-700 mb-2">
                  Submitted on {new Date(submission.submittedAt).toLocaleString()}
                </p>
                {#if submission.score !== null}
                  <p class="text-sm text-green-700">
                    Score: {submission.score}/100
                  </p>
                {/if}
                {#if submission.feedback}
                  <div class="mt-3">
                    <h5 class="text-sm font-medium text-green-800">Feedback:</h5>
                    <p class="text-sm text-green-700 mt-1">{submission.feedback}</p>
                  </div>
                {/if}
              </div>
              
              <div class="bg-gray-50 rounded-lg p-4">
                <h5 class="text-sm font-medium text-gray-900 mb-2">Your Answer:</h5>
                <div class="text-sm text-gray-700 whitespace-pre-wrap">{submission.answer}</div>
              </div>
            {:else}
              <!-- No Submission Yet -->
              <div class="text-center py-8">
                <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h4 class="text-lg font-medium text-gray-900 mb-2">No Submission Yet</h4>
                <p class="text-gray-600 mb-6">Submit your answer to complete this exercise.</p>
                
                {#if !showSubmissionForm}
                  <Button variant="primary" on:click={() => showSubmissionForm = true}>
                    Submit Answer
                  </Button>
                {/if}
              </div>
            {/if}

            <!-- Submission Form -->
            {#if showSubmissionForm && !submission}
              <div class="border-t border-gray-200 pt-6">
                <h4 class="text-lg font-medium text-gray-900 mb-4">Submit Your Answer</h4>
                
                <form on:submit|preventDefault={submitExercise}>
                  <div class="space-y-4">
                    <!-- Answer Text -->
                    <div>
                      <label for="answer" class="block text-sm font-medium text-gray-700 mb-2">
                        Your Answer *
                      </label>
                      <textarea
                        id="answer"
                        bind:value={submissionForm.answer}
                        rows="6"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Write your answer here..."
                        required
                      ></textarea>
                    </div>

                    <!-- File Upload -->
                    <div>
                      <label for="files" class="block text-sm font-medium text-gray-700 mb-2">
                        Attach Files (Optional)
                      </label>
                      <input
                        id="files"
                        type="file"
                        multiple
                        on:change={handleFileSelect}
                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                      />
                      <p class="text-xs text-gray-500 mt-1">
                        Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG, GIF (Max 10MB each)
                      </p>
                    </div>

                    <!-- Selected Files -->
                    {#if submissionForm.files.length > 0}
                      <div>
                        <h5 class="text-sm font-medium text-gray-700 mb-2">Selected Files:</h5>
                        <div class="space-y-2">
                          {#each submissionForm.files as file, index}
                            <div class="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                              <div class="flex items-center">
                                <svg class="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span class="text-sm text-gray-700">{file.name}</span>
                                <span class="text-xs text-gray-500 ml-2">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                              </div>
                              <button
                                type="button"
                                on:click={() => removeFile(index)}
                                class="text-red-600 hover:text-red-800"
                                aria-label="Remove file"
                              >
                                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/if}

                    <!-- Submit Buttons -->
                    <div class="flex justify-end space-x-4 pt-4">
                      <Button 
                        type="button" 
                        variant="secondary" 
                        on:click={() => showSubmissionForm = false}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        variant="primary"
                        disabled={submitting}
                      >
                        {#if submitting}
                          <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting...
                        {:else}
                          Submit Answer
                        {/if}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>
