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
    files: [] as File[],
    existingFiles: [] as any[]
  };
  let submitting = false;
  let showFileViewer = false;
  let selectedFile: any = null;
  let showEditForm = false;
  let showDeleteConfirm = false;
  let editing = false;
  let deleting = false;

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
        submissionForm = { answer: '', files: [], existingFiles: [] };
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

  function parseUploadedFiles(answer: string) {
    try {
      const parts = answer.split('--- Attached Files ---');
      if (parts.length > 1) {
        const fileData = parts[1].trim();
        const files = JSON.parse(fileData);
        return Array.isArray(files) ? files : [];
      }
    } catch (err) {
      console.error('Error parsing uploaded files:', err);
    }
    return [];
  }

  function getCleanAnswer(answer: string) {
    try {
      const parts = answer.split('--- Attached Files ---');
      return parts[0].trim();
    } catch (err) {
      console.error('Error parsing answer:', err);
      return answer;
    }
  }

  function canPreviewFile(file: any) {
    const previewableTypes = ['text/plain', 'image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    return previewableTypes.includes(file.type) || file.name.endsWith('.txt') || file.name.endsWith('.pdf');
  }

  function viewFile(file: any) {
    selectedFile = file;
    showFileViewer = true;
  }

  function closeFileViewer() {
    showFileViewer = false;
    selectedFile = null;
  }

  function downloadFile(file: any) {
    try {
      if (file.content) {
        // For text files, create a blob and download
        const blob = new Blob([file.content], { type: file.type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // For other files, try to download from the stored path
        window.open(`/api/download/${file.name}`, '_blank');
      }
    } catch (err) {
      console.error('Error downloading file:', err);
      alert('Error downloading file. Please try again.');
    }
  }

  function isOverdue() {
    if (!exercise?.dueDate) return false;
    return new Date() > new Date(exercise.dueDate);
  }

  function canEditSubmission() {
    return submission && submission.score === null && !isOverdue();
  }

  function canDeleteSubmission() {
    return submission && submission.score === null && !isOverdue();
  }

  function startEdit() {
    if (!submission) return;
    
    // Parse existing answer and files
    submissionForm.answer = getCleanAnswer(submission.answer);
    
    // Parse existing files
    submissionForm.existingFiles = parseUploadedFiles(submission.answer);
    
    showEditForm = true;
  }

  function cancelEdit() {
    showEditForm = false;
    submissionForm = { answer: '', files: [], existingFiles: [] };
  }

  async function updateSubmission() {
    if (!submissionForm.answer.trim()) {
      error = 'Please provide an answer';
      return;
    }

    try {
      editing = true;
      error = '';

      const formData = new FormData();
      formData.append('exerciseId', $page.params.id as string);
      formData.append('answer', submissionForm.answer.trim());
      
      // Add new files if any
      submissionForm.files.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });

      const response = await fetch(`/api/exercise-submissions/${submission.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${$authStore.token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        submission = data.submission;
        showEditForm = false;
        submissionForm = { answer: '', files: [], existingFiles: [] };
        await loadSubmissions();
      } else {
        const errorData = await response.json();
        error = errorData.error || 'Failed to update submission';
      }
    } catch (err) {
      console.error('Error updating submission:', err);
      error = 'Error updating submission';
    } finally {
      editing = false;
    }
  }

  function confirmDelete() {
    showDeleteConfirm = true;
  }

  function cancelDelete() {
    showDeleteConfirm = false;
  }

  async function deleteSubmission() {
    if (!submission) return;

    try {
      deleting = true;
      error = '';

      const response = await fetch(`/api/exercise-submissions/${submission.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        submission = null;
        showDeleteConfirm = false;
        await loadSubmissions();
      } else {
        const errorData = await response.json();
        error = errorData.error || 'Failed to delete submission';
      }
    } catch (err) {
      console.error('Error deleting submission:', err);
      error = 'Error deleting submission';
    } finally {
      deleting = false;
    }
  }
</script>

<svelte:head>
  <title>{exercise?.title || 'Exercise'} - IDEA</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
    <!-- Header -->
    <div class="mb-8">
      <div class="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div class="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <button 
                class="text-white hover:text-gray-200 transition-colors"
                on:click={goBack}
                aria-label="Go back to class"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 class="text-2xl font-bold text-white">
                  {exercise?.title || 'Exercise'}
                </h1>
                <p class="text-indigo-100 mt-1">
                  {exercise?.description || 'No description available'}
                </p>
              </div>
            </div>
            {#if exercise && ['TEACHER', 'ADMIN'].includes($authStore.user?.role || '')}
              <Button variant="secondary" on:click={editExercise}>
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Exercise
              </Button>
            {/if}
          </div>
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

    <!-- Exercise Content -->
    {#if exercise && !loading && !error}
      <div class="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <!-- Exercise Info -->
        <div class="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Exercise Details</h3>
              <div class="grid grid-cols-2 gap-4">
                <div class="bg-white rounded-lg p-3 border border-gray-200">
                  <div class="text-xs text-gray-500 uppercase tracking-wide">Type</div>
                  <div class="text-sm font-semibold text-gray-900">{exercise.type}</div>
                </div>
                <div class="bg-white rounded-lg p-3 border border-gray-200">
                  <div class="text-xs text-gray-500 uppercase tracking-wide">Class</div>
                  <div class="text-sm font-semibold text-gray-900">{exercise.class?.name}</div>
                </div>
                <div class="bg-white rounded-lg p-3 border border-gray-200">
                  <div class="text-xs text-gray-500 uppercase tracking-wide">Created</div>
                  <div class="text-sm font-semibold text-gray-900">
                    {new Date(exercise.createdAt).toLocaleDateString()}
                  </div>
                </div>
                {#if exercise.dueDate}
                  <div class="bg-white rounded-lg p-3 border border-gray-200">
                    <div class="text-xs text-gray-500 uppercase tracking-wide">Due Date</div>
                    <div class="text-sm font-semibold text-gray-900">
                      {new Date(exercise.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                {/if}
              </div>
            </div>
            
               <div class="flex items-center justify-center">
                 <div class="text-center">
                   <div class="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                     <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>
                   </div>
                   <div class="space-y-2">
                     <span class="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold {exercise.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                       {exercise.isActive ? 'Active' : 'Inactive'}
                     </span>
                     {#if exercise.dueDate}
                       <div class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium {isOverdue() ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}">
                         <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                         {isOverdue() ? 'Overdue' : 'Open'}
                       </div>
                     {/if}
                   </div>
                 </div>
               </div>
          </div>
        </div>

        <div class="p-6">
          <!-- Exercise Content -->
          <div class="mb-8">
            <div class="flex items-center space-x-3 mb-6">
              <div class="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-gray-900">Exercise Content</h3>
            </div>
            <div class="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200 p-6">
              {#if exercise.content}
                <div class="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {exercise.content}
                </div>
              {:else}
                <div class="text-center py-8">
                  <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p class="text-gray-500 italic">No content available for this exercise.</p>
                </div>
              {/if}
            </div>
          </div>

          <!-- Reading Text Reference -->
          {#if exercise.readingText}
            <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6">
              <div class="flex items-center space-x-3 mb-4">
                <div class="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 class="text-xl font-semibold text-purple-800">Related Reading Text</h3>
              </div>
              <div class="bg-white rounded-lg p-4 border border-purple-200">
                <h4 class="font-semibold text-gray-900 mb-2">{exercise.readingText.title}</h4>
                <a 
                  href="/reading-texts/{exercise.readingText.id}" 
                  class="inline-flex items-center text-purple-600 hover:text-purple-800 font-medium transition-colors"
                >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View Reading Text
                </a>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Student Submission Section -->
      {#if $authStore.user?.role === 'STUDENT'}
        <div class="bg-white rounded-xl shadow-lg border border-gray-200 mt-6 overflow-hidden">
          <div class="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 class="text-xl font-semibold text-gray-900">Your Submission</h2>
            </div>
          </div>
          
          <div class="p-6">
            
            {#if submission}
              <!-- Existing Submission -->
              <div class="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 mb-6">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex items-center">
                    <div class="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                      <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 class="text-lg font-semibold text-green-800">Submission Submitted</h4>
                      <p class="text-sm text-green-600">
                        Submitted on {new Date(submission.submittedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {#if submission.score !== null}
                    <div class="text-right">
                      <div class="text-2xl font-bold text-green-600">{submission.score}/100</div>
                      <div class="text-sm text-green-600">Score</div>
                    </div>
                  {/if}
                </div>
                
                {#if submission.feedback}
                  <div class="bg-white rounded-lg p-4 border border-green-200">
                    <h5 class="text-sm font-semibold text-green-800 mb-2 flex items-center">
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Teacher Feedback
                    </h5>
                    <p class="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{submission.feedback}</p>
                  </div>
                {/if}

                <!-- Action Buttons -->
                {#if canEditSubmission() || canDeleteSubmission()}
                  <div class="flex justify-end space-x-3 mt-4">
                    {#if canEditSubmission()}
                      <button
                        on:click={startEdit}
                        class="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Submission
                      </button>
                    {/if}
                    {#if canDeleteSubmission()}
                      <button
                        on:click={confirmDelete}
                        class="inline-flex items-center px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Submission
                      </button>
                    {/if}
                  </div>
                {/if}
              </div>
              
              <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
                <h5 class="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Your Answer
                </h5>
                <div class="bg-white rounded-lg p-4 border border-blue-200">
                  <div class="text-sm text-gray-700 whitespace-pre-wrap">{getCleanAnswer(submission.answer)}</div>
                </div>
              </div>

              <!-- Uploaded Files -->
              {#if submission.answer && submission.answer.includes('--- Attached Files ---')}
                <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6 mt-6">
                  <h5 class="text-lg font-semibold text-purple-800 mb-4 flex items-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Uploaded Files
                  </h5>
                  <div class="space-y-3">
                    {#each parseUploadedFiles(submission.answer) as file, index}
                      <div class="bg-white rounded-lg p-4 border border-purple-200">
                        <div class="flex items-center justify-between">
                          <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div>
                              <p class="text-sm font-semibold text-gray-900">{file.name}</p>
                              <p class="text-xs text-gray-500">
                                {(file.size / 1024).toFixed(1)} KB • {file.type} • {new Date(file.uploadDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div class="flex items-center space-x-2">
                            {#if canPreviewFile(file)}
                              <button
                                on:click={() => viewFile(file)}
                                class="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                              >
                                <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View
                              </button>
                            {/if}
                            <button
                              on:click={() => downloadFile(file)}
                              class="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors"
                            >
                              <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            {:else}
              <!-- No Submission Yet -->
              <div class="text-center py-12">
                <div class="w-20 h-20 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg class="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 class="text-xl font-semibold text-gray-900 mb-3">Ready to Submit?</h4>
                <p class="text-gray-600 mb-8 max-w-md mx-auto">Submit your answer to complete this exercise and get feedback from your teacher.</p>
                
                {#if !showSubmissionForm && (!submission || submission.score === null)}
                  <Button variant="primary" size="lg" on:click={() => showSubmissionForm = true}>
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Submit Answer
                  </Button>
                {/if}
              </div>
            {/if}

            <!-- Submission Form -->
            {#if showSubmissionForm && (!submission || submission.score === null)}
              <div class="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6 mt-6">
                <div class="flex items-center space-x-3 mb-6">
                  <div class="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <h4 class="text-xl font-semibold text-indigo-800">Submit Your Answer</h4>
                </div>
                
                <form on:submit|preventDefault={submitExercise}>
                  <div class="space-y-6">
                    <!-- Answer Text -->
                    <div class="bg-white rounded-lg border border-gray-200 p-4">
                      <label for="answer" class="block text-sm font-semibold text-gray-700 mb-3">
                        <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Your Answer *
                      </label>
                      <textarea
                        id="answer"
                        bind:value={submissionForm.answer}
                        rows="6"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="Write your detailed answer here..."
                        required
                      ></textarea>
                    </div>

                    <!-- File Upload -->
                    <div class="bg-white rounded-lg border border-gray-200 p-4">
                      <label for="files" class="block text-sm font-semibold text-gray-700 mb-3">
                        <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        Attach Files (Optional)
                      </label>
                      <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
                        <input
                          id="files"
                          type="file"
                          multiple
                          on:change={handleFileSelect}
                          class="hidden"
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                        />
                        <label for="files" class="cursor-pointer">
                          <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p class="text-sm text-gray-600 mb-2">Click to upload files or drag and drop</p>
                          <p class="text-xs text-gray-500">PDF, DOC, DOCX, TXT, JPG, PNG, GIF (Max 10MB each)</p>
                        </label>
                      </div>
                    </div>

                    <!-- Selected Files -->
                    {#if submissionForm.files.length > 0}
                      <div class="bg-white rounded-lg border border-gray-200 p-4">
                        <h5 class="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Selected Files ({submissionForm.files.length})
                        </h5>
                        <div class="space-y-3">
                          {#each submissionForm.files as file, index}
                            <div class="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                              <div class="flex items-center">
                                <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                                  <svg class="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <div>
                                  <span class="text-sm font-medium text-gray-900">{file.name}</span>
                                  <span class="text-xs text-gray-500 ml-2">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                on:click={() => removeFile(index)}
                                class="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg flex items-center justify-center transition-colors"
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
                    <div class="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                      <Button 
                        type="button" 
                        variant="secondary" 
                        on:click={() => showSubmissionForm = false}
                        disabled={submitting}
                      >
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
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
                          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Submit Answer
                        {/if}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            {:else if showEditForm}
              <!-- Edit Submission Form -->
              <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 mt-6">
                <div class="flex items-center space-x-3 mb-6">
                  <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <h4 class="text-xl font-semibold text-blue-800">Edit Your Submission</h4>
                </div>
                
                <form on:submit|preventDefault={updateSubmission}>
                  <div class="space-y-6">
                    <!-- Answer Text -->
                    <div class="bg-white rounded-lg border border-gray-200 p-4">
                      <label for="edit-answer" class="block text-sm font-semibold text-gray-700 mb-3">
                        <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Your Answer *
                      </label>
                      <textarea
                        id="edit-answer"
                        bind:value={submissionForm.answer}
                        rows="6"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Write your detailed answer here..."
                        required
                      ></textarea>
                    </div>

                    <!-- Existing Files -->
                    {#if submissionForm.existingFiles && submissionForm.existingFiles.length > 0}
                      <div class="bg-white rounded-lg border border-gray-200 p-4">
                        <h5 class="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Current Files ({submissionForm.existingFiles.length})
                        </h5>
                        <div class="space-y-3">
                          {#each submissionForm.existingFiles as file, index}
                            <div class="flex items-center justify-between bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-3 border border-gray-200">
                              <div class="flex items-center">
                                <div class="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center mr-3">
                                  <svg class="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <div>
                                  <span class="text-sm font-medium text-gray-900">{file.name}</span>
                                  <span class="text-xs text-gray-500 ml-2">({(file.size / 1024).toFixed(1)} KB)</span>
                                </div>
                              </div>
                              <div class="flex items-center space-x-2">
                                {#if canPreviewFile(file)}
                                  <button
                                    type="button"
                                    on:click={() => viewFile(file)}
                                    class="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-medium transition-colors"
                                  >
                                    View
                                  </button>
                                {/if}
                                <button
                                  type="button"
                                  on:click={() => downloadFile(file)}
                                  class="px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs font-medium transition-colors"
                                >
                                  Download
                                </button>
                              </div>
                            </div>
                          {/each}
                        </div>
                        <p class="text-xs text-gray-500 mt-2">
                          <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Current files will be kept. You can add new files below.
                        </p>
                      </div>
                    {/if}

                    <!-- File Upload -->
                    <div class="bg-white rounded-lg border border-gray-200 p-4">
                      <label for="edit-files" class="block text-sm font-semibold text-gray-700 mb-3">
                        <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        Add New Files (Optional)
                      </label>
                      <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                        <input
                          id="edit-files"
                          type="file"
                          multiple
                          on:change={handleFileSelect}
                          class="hidden"
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                        />
                        <label for="edit-files" class="cursor-pointer">
                          <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p class="text-sm text-gray-600 mb-2">Click to upload additional files</p>
                          <p class="text-xs text-gray-500">PDF, DOC, DOCX, TXT, JPG, PNG, GIF (Max 10MB each)</p>
                        </label>
                      </div>
                    </div>

                    <!-- Selected Files -->
                    {#if submissionForm.files.length > 0}
                      <div class="bg-white rounded-lg border border-gray-200 p-4">
                        <h5 class="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          New Files ({submissionForm.files.length})
                        </h5>
                        <div class="space-y-3">
                          {#each submissionForm.files as file, index}
                            <div class="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                              <div class="flex items-center">
                                <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                                  <svg class="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <div>
                                  <span class="text-sm font-medium text-gray-900">{file.name}</span>
                                  <span class="text-xs text-gray-500 ml-2">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                on:click={() => removeFile(index)}
                                class="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg flex items-center justify-center transition-colors"
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
                    <div class="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                      <Button 
                        type="button" 
                        variant="secondary" 
                        on:click={cancelEdit}
                        disabled={editing}
                      >
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        variant="primary"
                        disabled={editing}
                      >
                        {#if editing}
                          <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Updating...
                        {:else}
                          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Update Submission
                        {/if}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            {:else if submission && submission.score !== null}
              <!-- Submission Already Graded - Cannot Edit -->
              <div class="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-200 p-6 mt-6">
                <div class="flex items-center space-x-3 mb-4">
                  <div class="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h4 class="text-lg font-semibold text-red-800">Submission Locked</h4>
                </div>
                <p class="text-red-700 mb-4">
                  This submission has been graded and cannot be modified. Your answer and files are now locked for review.
                </p>
                <div class="bg-white rounded-lg p-4 border border-red-200">
                  <p class="text-sm text-gray-600">
                    <strong>Score:</strong> {submission.score}/100<br>
                    <strong>Graded on:</strong> {new Date(submission.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    {/if}
  </div>

  <!-- File Viewer Modal -->
  {#if showFileViewer && selectedFile}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" on:click={closeFileViewer} on:keydown role="dialog" aria-modal="true" aria-labelledby="file-viewer-title" tabindex="-1">
      <div class="bg-white rounded-xl shadow-2xl max-w-4xl max-h-[90vh] w-full mx-4" role="document">
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 id="file-viewer-title" class="text-lg font-semibold text-gray-900">{selectedFile.name}</h3>
              <p class="text-sm text-gray-500">
                {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type}
              </p>
            </div>
          </div>
          <button
            on:click={closeFileViewer}
            class="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close file viewer"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Modal Content -->
        <div class="flex-1 overflow-y-auto p-6">
          {#if selectedFile.type.startsWith('text/') || selectedFile.name.endsWith('.txt')}
            <!-- Text File Preview -->
            <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <pre class="text-sm text-gray-700 whitespace-pre-wrap font-mono">{selectedFile.content || 'No content available'}</pre>
            </div>
          {:else if selectedFile.type.startsWith('image/')}
            <!-- Image Preview -->
            <div class="text-center">
              <img 
                src="data:image/{selectedFile.type.split('/')[1]};base64,{selectedFile.content}" 
                alt={selectedFile.name}
                class="max-w-full max-h-96 rounded-lg shadow-lg mx-auto"
              />
            </div>
          {:else if selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf')}
            <!-- PDF Preview Placeholder -->
            <div class="text-center py-16">
              <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 class="text-lg font-semibold text-gray-900 mb-2">PDF Preview Not Available</h4>
              <p class="text-gray-600 mb-6">PDF files cannot be previewed in the browser. Please download the file to view it.</p>
              <button
                on:click={() => downloadFile(selectedFile)}
                class="inline-flex items-center px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </button>
            </div>
          {:else}
            <!-- Unsupported File Type -->
            <div class="text-center py-16">
              <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 class="text-lg font-semibold text-gray-900 mb-2">Preview Not Available</h4>
              <p class="text-gray-600 mb-6">This file type cannot be previewed in the browser. Please download the file to view it.</p>
              <button
                on:click={() => downloadFile(selectedFile)}
                class="inline-flex items-center px-4 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download File
              </button>
            </div>
          {/if}
        </div>

        <!-- Modal Footer -->
        <div class="flex justify-end space-x-4 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            on:click={closeFileViewer}
            class="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            Close
          </button>
          <button
            on:click={() => downloadFile(selectedFile)}
            class="inline-flex items-center px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Delete Confirmation Modal -->
  {#if showDeleteConfirm}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" on:click={cancelDelete} on:keydown role="dialog" aria-modal="true" aria-labelledby="delete-title" tabindex="-1">
      <div class="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4" role="document">
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 id="delete-title" class="text-lg font-semibold text-gray-900">Delete Submission</h3>
          </div>
          <button
            on:click={cancelDelete}
            class="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close delete confirmation"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Modal Content -->
        <div class="p-6">
          <div class="text-center">
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h4 class="text-lg font-semibold text-gray-900 mb-2">Are you sure?</h4>
            <p class="text-gray-600 mb-6">
              This action cannot be undone. Your submission and all uploaded files will be permanently deleted.
            </p>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="flex justify-end space-x-4 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            on:click={cancelDelete}
            class="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            on:click={deleteSubmission}
            class="inline-flex items-center px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            disabled={deleting}
          >
            {#if deleting}
              <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Deleting...
            {:else}
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Submission
            {/if}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
