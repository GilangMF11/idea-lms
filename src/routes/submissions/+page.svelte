<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.js';
  import Button from '$lib/components/Button.svelte';

  let submissions: any[] = [];
  let error = '';
  let showFileViewer = false;
  let selectedFile: any = null;
  let selectedExercise: any = null;
  let showExerciseDetail = false;
  let exerciseSubmissions: any[] = [];
  let filterStatus = 'all'; // all, submitted, not_submitted, graded, not_graded
  let showSubmissionViewer = false;
  let selectedSubmission: any = null;
  let gradingScore = '';
  let gradingFeedback = '';
  let showToast = false;
  let toastMessage = '';
  let toastType = 'success'; // success, error, info

  onMount(async () => {
    authStore.init();
    
    // Redirect if not authenticated
    if (!$authStore.isAuthenticated) {
      goto('/login');
      return;
    }

    // Redirect if not teacher or admin
    if (!['TEACHER', 'ADMIN'].includes($authStore.user?.role || '')) {
      goto('/dashboard');
      return;
    }

    await loadSubmissions();
  });

  async function loadSubmissions() {
    try {
      // Get all exercises first
      const exercisesResponse = await fetch('/api/exercises', {
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!exercisesResponse.ok) {
        throw new Error('Failed to load exercises');
      }

      const exercisesData = await exercisesResponse.json();
      const exercises = exercisesData.exercises || [];

      // Load submissions for each exercise
      const exercisesWithSubmissions = [];
      for (const exercise of exercises) {
        try {
          const submissionsResponse = await fetch(`/api/exercise-submissions?exerciseId=${exercise.id}`, {
            headers: {
              'Authorization': `Bearer ${$authStore.token}`,
              'Content-Type': 'application/json'
            }
          });

          if (submissionsResponse.ok) {
            const submissionsData = await submissionsResponse.json();
            if (submissionsData.submissions && submissionsData.submissions.length > 0) {
              // Add exercise to list if it has submissions
              exercisesWithSubmissions.push({
                ...exercise,
                submissionCount: submissionsData.submissions.length
              });
            }
          }
        } catch (err) {
          console.error('Error loading submissions for exercise:', exercise.id, err);
        }
      }

      submissions = exercisesWithSubmissions;
    } catch (err) {
      console.error('Error loading submissions:', err);
      error = 'Error loading submissions';
    }
  }

  function downloadFile(file: any) {
    // For now, we'll just show an alert since files are not actually stored
    // In a real implementation, you'd have actual file URLs
    alert(`File: ${file.name}\nSize: ${(file.size / 1024).toFixed(1)} KB\nType: ${file.type}\n\nNote: In a real implementation, this would download the actual file.`);
  }

  function viewFile(file: any) {
    selectedFile = file;
    showFileViewer = true;
  }

  function closeFileViewer() {
    showFileViewer = false;
    selectedFile = null;
  }

  function canPreviewFile(file: any) {
    const previewableTypes = [
      'text/plain',
      'text/html',
      'text/css',
      'text/javascript',
      'application/json',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf'
    ];
    return previewableTypes.includes(file.type);
  }

  async function openExerciseDetail(exercise: any) {
    selectedExercise = exercise;
    showExerciseDetail = true;
    await loadExerciseSubmissions(exercise.id);
  }

  function closeExerciseDetail() {
    showExerciseDetail = false;
    selectedExercise = null;
    exerciseSubmissions = [];
    filterStatus = 'all';
  }

  async function loadExerciseSubmissions(exerciseId: string) {
    try {
      // Load all students in the class
      const classResponse = await fetch(`/api/classes?id=${selectedExercise.classId}`, {
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!classResponse.ok) {
        throw new Error('Failed to load class students');
      }

      const classData = await classResponse.json();
      // API returns students in nested structure: classData.class.students[].student
      const classStudents = classData.class?.students?.map((cs: any) => ({
        studentId: cs.student.id,
        username: cs.student.username,
        firstName: cs.student.firstName,
        lastName: cs.student.lastName
      })) || [];

      // Load submissions for this exercise
      const submissionsResponse = await fetch(`/api/exercise-submissions?exerciseId=${exerciseId}`, {
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      let submissions = [];
      if (submissionsResponse.ok) {
        const submissionsData = await submissionsResponse.json();
        submissions = submissionsData.submissions || [];
      }

      // Create a complete list of students with submission status
      exerciseSubmissions = classStudents.map((student: any) => {
        const submission = submissions.find((sub: any) => sub.userId === student.studentId);
        return {
          student: student,
          submission: submission,
          hasSubmitted: !!submission,
          isGraded: submission?.score !== null && submission?.score !== undefined
        };
      });

      // Sort: submitted first, then not submitted
      exerciseSubmissions.sort((a, b) => {
        if (a.hasSubmitted && !b.hasSubmitted) return -1;
        if (!a.hasSubmitted && b.hasSubmitted) return 1;
        return 0;
      });

    } catch (err) {
      console.error('Error loading exercise submissions:', err);
      error = 'Error loading exercise submissions';
    }
  }

  function getExerciseStatus(exercise: any) {
    if (!exercise.dueDate) return 'open';
    
    const now = new Date();
    const dueDate = new Date(exercise.dueDate);
    
    if (now > dueDate) return 'expired';
    return 'open';
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'open':
        return 'clock';
      case 'expired':
        return 'warning';
      default:
        return 'info';
    }
  }

  function getFilteredSubmissions() {
    let filtered = exerciseSubmissions;

    switch (filterStatus) {
      case 'submitted':
        filtered = filtered.filter(item => item.hasSubmitted);
        break;
      case 'not_submitted':
        filtered = filtered.filter(item => !item.hasSubmitted);
        break;
      case 'graded':
        filtered = filtered.filter(item => item.isGraded);
        break;
      case 'not_graded':
        filtered = filtered.filter(item => item.hasSubmitted && !item.isGraded);
        break;
      default:
        // all - no filtering
        break;
    }

    return filtered;
  }

  function viewSubmission(submission: any) {
    selectedSubmission = submission;
    gradingScore = submission.score ? submission.score.toString() : '';
    gradingFeedback = submission.feedback || '';
    showSubmissionViewer = true;
  }

  function closeSubmissionViewer() {
    showSubmissionViewer = false;
    selectedSubmission = null;
    gradingScore = '';
    gradingFeedback = '';
  }

  function showToastNotification(message: string, type: 'success' | 'error' | 'info' = 'success') {
    toastMessage = message;
    toastType = type;
    showToast = true;
    
    // Auto hide after 3 seconds
    setTimeout(() => {
      showToast = false;
    }, 3000);
  }

  async function submitGrade() {
    if (!selectedSubmission || !gradingScore) return;
    
    try {
      const response = await fetch(`/api/exercise-submissions?id=${selectedSubmission.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          score: parseInt(gradingScore),
          feedback: gradingFeedback
        })
      });

      if (response.ok) {
        // Update the submission in the list
        const updatedSubmission = await response.json();
        const submissionIndex = exerciseSubmissions.findIndex(item => 
          item.submission && item.submission.id === selectedSubmission.id
        );
        
        if (submissionIndex !== -1) {
          exerciseSubmissions[submissionIndex].submission = updatedSubmission.submission;
          exerciseSubmissions[submissionIndex].isGraded = true;
        }
        
        // Update the selectedSubmission to reflect the changes
        selectedSubmission.score = parseInt(gradingScore);
        selectedSubmission.feedback = gradingFeedback;
        
        showToastNotification('Grade submitted successfully!', 'success');
        
        // Auto close modal after 1.5 seconds
        setTimeout(() => {
          closeSubmissionViewer();
        }, 1500);
      } else {
        throw new Error('Failed to submit grade');
      }
    } catch (err) {
      console.error('Error submitting grade:', err);
      showToastNotification('Error submitting grade. Please try again.', 'error');
    }
  }
</script>

<svelte:head>
  <title>Submissions Management - LMS</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Submissions Management</h1>
          <p class="text-gray-600 mt-2">
            Review and grade student exercise submissions
          </p>
        </div>
        <div class="flex items-center space-x-4">
          <span class="text-sm text-gray-500">
            {submissions.length} exercises with submissions
          </span>
        </div>
      </div>
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

    <!-- Exercises List -->
    {#if submissions.length > 0}
      <div class="space-y-4">
        <h2 class="text-xl font-semibold text-gray-900">Exercises with Submissions</h2>
        <div class="grid gap-6">
          {#each submissions as exercise}
            <button type="button" class="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl hover:border-primary-300 transition-all duration-200 cursor-pointer w-full text-left group" 
                    on:click={() => openExerciseDetail(exercise)}>
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-3 mb-3">
                    <div class="flex-shrink-0">
                      <div class="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                      </div>
                    </div>
                    <div class="flex-1">
                      <h3 class="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {exercise.title}
                      </h3>
                      <p class="text-sm text-gray-600 mt-1">
                        {exercise.description || 'No description provided'}
                      </p>
                    </div>
                  </div>
                  
                  <div class="flex items-center space-x-6 text-sm text-gray-500 mb-4">
                    <div class="flex items-center space-x-2">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                      </svg>
                      <span class="font-medium">{exercise.class?.name}</span>
                    </div>
                    
                    <div class="flex items-center space-x-2">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <span>{exercise.dueDate ? new Date(exercise.dueDate).toLocaleDateString() : 'No due date'}</span>
                    </div>
                    
                    <div class="flex items-center space-x-2">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                      </svg>
                      <span class="font-medium">{exercise.submissionCount} submission{exercise.submissionCount > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
                
                <div class="flex flex-col items-end space-y-3">
                  <!-- Status Badge -->
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium {getStatusColor(getExerciseStatus(exercise))}">
                    {#if getStatusIcon(getExerciseStatus(exercise)) === 'clock'}
                      <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    {:else if getStatusIcon(getExerciseStatus(exercise)) === 'warning'}
                      <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                      </svg>
                    {:else}
                      <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    {/if}
                    {getExerciseStatus(exercise).charAt(0).toUpperCase() + getExerciseStatus(exercise).slice(1)}
                  </span>
                  
                  <!-- Submission Count Badge -->
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                    {exercise.submissionCount} submission{exercise.submissionCount > 1 ? 's' : ''}
                  </span>
                  
                  <!-- Click Indicator -->
                  <div class="flex items-center text-xs text-gray-400 group-hover:text-primary-500 transition-colors">
                    <span>Click to view details</span>
                    <svg class="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </button>
          {/each}
        </div>
      </div>
    {:else}
      <!-- Empty State -->
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No exercises with submissions yet</h3>
        <p class="text-gray-600">Exercises with student submissions will appear here.</p>
      </div>
    {/if}
  </div>
</div>

<!-- File Viewer Modal -->
{#if showFileViewer && selectedFile}
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
    on:click={(e) => e.target === e.currentTarget && closeFileViewer()}
    on:keydown={(e) => e.key === 'Escape' && closeFileViewer()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div 
      class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] transform transition-all" 
      role="dialog"
      tabindex="0"
    >
      <div class="p-6">
        <!-- Modal Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">
              {selectedFile.name}
            </h3>
            <p class="text-sm text-gray-500">
              {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type}
            </p>
          </div>
          <div class="flex items-center space-x-2">
            <button
              type="button"
              class="text-primary-600 hover:text-primary-800 text-sm font-medium"
              on:click={() => downloadFile(selectedFile)}
            >
              Download
            </button>
            <button
              type="button"
              on:click={closeFileViewer}
              class="text-gray-400 hover:text-gray-600"
              aria-label="Close modal"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- File Content -->
        <div class="border border-gray-200 rounded-lg overflow-hidden max-h-[60vh]">
          {#if selectedFile.type.startsWith('image/')}
            <!-- Image Preview -->
            <div class="flex items-center justify-center bg-gray-100 p-8">
              {#if selectedFile.content}
                <!-- Try to display image from content -->
                <img 
                  src="data:{selectedFile.type};base64,{btoa(selectedFile.content)}" 
                  alt="{selectedFile.name}"
                  class="max-w-full max-h-96 object-contain rounded-lg shadow-lg"
                  on:error={() => {
                    // Fallback to placeholder if image fails to load
                    console.log('Image failed to load, showing placeholder');
                  }}
                />
              {:else}
                <!-- Fallback placeholder -->
                <div class="text-center">
                  <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p class="text-sm text-gray-600">Image Preview</p>
                  <p class="text-xs text-gray-500 mt-1">
                    Image content not available
                  </p>
                </div>
              {/if}
            </div>
          {:else if selectedFile.type === 'application/pdf'}
            <!-- PDF Preview -->
            <div class="flex items-center justify-center bg-gray-100 p-8">
              <div class="text-center">
                <svg class="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <p class="text-sm text-gray-600">PDF Preview</p>
                <p class="text-xs text-gray-500 mt-1">
                  In a real implementation, this would show the PDF content
                </p>
              </div>
            </div>
          {:else if selectedFile.type.startsWith('text/') || selectedFile.type === 'application/json'}
            <!-- Text Preview -->
            <div class="bg-gray-50 p-4">
              <div class="bg-white rounded border p-4 max-h-96 overflow-y-auto">
                <pre class="text-sm text-gray-800 whitespace-pre-wrap">{selectedFile.content || 'File content not available'}</pre>
              </div>
            </div>
          {:else}
            <!-- Unsupported File Type -->
            <div class="flex items-center justify-center bg-gray-100 p-8">
              <div class="text-center">
                <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p class="text-sm text-gray-600">Preview Not Available</p>
                <p class="text-xs text-gray-500 mt-1">
                  This file type cannot be previewed. Please download to view.
                </p>
              </div>
            </div>
          {/if}
        </div>

        <!-- File Info -->
        <div class="mt-4 bg-gray-50 rounded-lg p-4">
          <h4 class="text-sm font-medium text-gray-900 mb-2">File Information</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-500">Name:</span>
              <span class="ml-2 text-gray-900">{selectedFile.name}</span>
            </div>
            <div>
              <span class="text-gray-500">Size:</span>
              <span class="ml-2 text-gray-900">{(selectedFile.size / 1024).toFixed(1)} KB</span>
            </div>
            <div>
              <span class="text-gray-500">Type:</span>
              <span class="ml-2 text-gray-900">{selectedFile.type}</span>
            </div>
            <div>
              <span class="text-gray-500">Uploaded:</span>
              <span class="ml-2 text-gray-900">{new Date(selectedFile.uploadedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Exercise Detail Modal -->
{#if showExerciseDetail && selectedExercise}
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
    on:click={(e) => e.target === e.currentTarget && closeExerciseDetail()}
    on:keydown={(e) => e.key === 'Escape' && closeExerciseDetail()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div 
      class="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] transform transition-all" 
      role="dialog"
      tabindex="0"
      on:click|stopPropagation
      on:keydown
    >
      <div class="p-6">
        <!-- Modal Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-xl font-semibold text-gray-900">
              {selectedExercise.title}
            </h3>
            <p class="text-sm text-gray-600 mt-1">
              {selectedExercise.description || 'No description'}
            </p>
            <div class="flex items-center space-x-4 text-sm text-gray-500 mt-2">
              <span>Class: {selectedExercise.class?.name}</span>
              <span>Due: {selectedExercise.dueDate ? new Date(selectedExercise.dueDate).toLocaleDateString() : 'No due date'}</span>
            </div>
          </div>
          <button
            type="button"
            on:click={closeExerciseDetail}
            class="text-gray-400 hover:text-gray-600"
            aria-label="Close modal"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Exercise Content -->
        <div class="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 class="text-sm font-medium text-gray-900 mb-2">Exercise Content</h4>
          <p class="text-sm text-gray-700 whitespace-pre-wrap">{selectedExercise.content}</p>
        </div>

        <!-- Filter and Stats -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-4">
            <div class="text-sm text-gray-600">
              Total Students: {exerciseSubmissions.length}
            </div>
            <div class="text-sm text-gray-600">
              Submitted: {exerciseSubmissions.filter(item => item.hasSubmitted).length}
            </div>
            <div class="text-sm text-gray-600">
              Not Submitted: {exerciseSubmissions.filter(item => !item.hasSubmitted).length}
            </div>
            <div class="text-sm text-gray-600">
              Graded: {exerciseSubmissions.filter(item => item.isGraded).length}
            </div>
          </div>
          
          <div class="flex items-center space-x-2">
            <label for="filter" class="text-sm font-medium text-gray-700">Filter:</label>
            <select
              id="filter"
              bind:value={filterStatus}
              class="px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
            >
              <option value="all">All Students</option>
              <option value="submitted">Submitted</option>
              <option value="not_submitted">Not Submitted</option>
              <option value="graded">Graded</option>
              <option value="not_graded">Not Graded</option>
            </select>
          </div>
        </div>

        <!-- Students List -->
        <div class="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each getFilteredSubmissions() as item}
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span class="text-sm font-medium text-primary-600">
                          {item.student.firstName.charAt(0)}{item.student.lastName.charAt(0)}
                        </span>
                      </div>
                      <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">
                          {item.student.firstName} {item.student.lastName}
                        </div>
                        <div class="text-sm text-gray-500">
                          @{item.student.username}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    {#if item.hasSubmitted}
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Submitted
                      </span>
                    {:else}
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Not Submitted
                      </span>
                    {/if}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {#if item.hasSubmitted}
                      {new Date(item.submission.submittedAt).toLocaleDateString()}
                    {:else}
                      -
                    {/if}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {#if item.isGraded}
                      <span class="font-medium text-green-600">{item.submission.score}/100</span>
                    {:else if item.hasSubmitted}
                      <span class="text-yellow-600">Pending</span>
                    {:else}
                      -
                    {/if}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {#if item.hasSubmitted}
                      <button
                        type="button"
                        class="text-primary-600 hover:text-primary-800 font-medium"
                        on:click={() => viewSubmission(item.submission)}
                      >
                        View & Grade
                      </button>
                    {:else}
                      <span class="text-gray-400">No submission</span>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Submission Viewer Modal -->
{#if showSubmissionViewer && selectedSubmission}
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
    on:click={(e) => e.target === e.currentTarget && closeSubmissionViewer()}
    on:keydown={(e) => e.key === 'Escape' && closeSubmissionViewer()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div 
      class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] transform transition-all flex flex-col" 
      role="dialog"
      tabindex="0"
      on:click|stopPropagation
      on:keydown
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
        <div>
          <h3 class="text-xl font-semibold text-gray-900">
            Submission Details
          </h3>
          <p class="text-sm text-gray-600 mt-1">
            {selectedSubmission.user.firstName} {selectedSubmission.user.lastName}
          </p>
          <p class="text-sm text-gray-500">
            Submitted on {new Date(selectedSubmission.submittedAt).toLocaleString()}
          </p>
        </div>
        <button
          type="button"
          on:click={closeSubmissionViewer}
          class="text-gray-400 hover:text-gray-600"
          aria-label="Close modal"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <!-- Submission Content -->
        <div class="space-y-6">
          <!-- Answer Section -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h4 class="text-sm font-medium text-gray-900 mb-3">Student Answer</h4>
            <div class="bg-white rounded border p-4 max-h-64 overflow-y-auto">
              <pre class="text-sm text-gray-800 whitespace-pre-wrap">{selectedSubmission.answer}</pre>
            </div>
          </div>

          <!-- Files Section -->
          {#if selectedSubmission.answer.includes('--- Attached Files ---')}
            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="text-sm font-medium text-gray-900 mb-3">Attached Files</h4>
              <div class="space-y-2">
                {#each JSON.parse(selectedSubmission.answer.split('--- Attached Files ---')[1].trim()) as file}
                  <div class="bg-white rounded border p-3 flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                      <div class="flex-shrink-0">
                        {#if file.type.startsWith('image/')}
                          <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        {:else if file.type === 'application/pdf'}
                          <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        {:else}
                          <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        {/if}
                      </div>
                      <div>
                        <p class="text-sm font-medium text-gray-900">{file.name}</p>
                        <p class="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB • {file.type}</p>
                      </div>
                    </div>
                    <div class="flex space-x-2">
                      <button
                        type="button"
                        class="text-primary-600 hover:text-primary-800 text-sm"
                        on:click={() => viewFile(file)}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        class="text-gray-600 hover:text-gray-800 text-sm"
                        on:click={() => downloadFile(file)}
                      >
                        Download
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Grading Section -->
          <div class="bg-blue-50 rounded-lg p-4">
            <h4 class="text-sm font-medium text-blue-900 mb-4">Grade & Feedback</h4>
            
            <!-- Current Grade Display -->
            {#if selectedSubmission.score !== null}
              <div class="mb-4 p-3 bg-green-100 rounded-lg">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-green-800">Current Grade</p>
                    <p class="text-2xl font-bold text-green-600">{selectedSubmission.score}/100</p>
                  </div>
                  {#if selectedSubmission.feedback}
                    <div class="text-right">
                      <p class="text-sm font-medium text-green-800">Feedback:</p>
                      <p class="text-sm text-green-700 max-w-xs">{selectedSubmission.feedback}</p>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}

            <!-- Grading Form -->
            <div class="space-y-4">
              <!-- Score Input -->
              <div>
                <label for="modal-score" class="block text-sm font-medium text-gray-700 mb-2">
                  Score (0-100) *
                </label>
                <input
                  type="number"
                  id="modal-score"
                  bind:value={gradingScore}
                  min="0"
                  max="100"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter score (0-100)"
                />
              </div>

              <!-- Feedback Input -->
              <div>
                <label for="modal-feedback" class="block text-sm font-medium text-gray-700 mb-2">
                  Feedback (Optional)
                </label>
                <textarea
                  id="modal-feedback"
                  bind:value={gradingFeedback}
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Provide feedback for the student..."
                ></textarea>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Fixed Footer -->
      <div class="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-white rounded-b-lg flex-shrink-0">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          on:click={closeSubmissionViewer}
        >
          Close
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          on:click={submitGrade}
          disabled={!gradingScore || isNaN(parseInt(gradingScore)) || parseInt(gradingScore) < 0 || parseInt(gradingScore) > 100}
        >
          {selectedSubmission.score !== null ? 'Update Grade' : 'Save Grade'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Toast Notification -->
{#if showToast}
  <div 
    class="fixed top-4 right-4 z-50 transform transition-all duration-300 ease-in-out"
    class:translate-x-0={showToast}
    class:-translate-x-full={!showToast}
  >
    <div 
      class="flex items-center p-4 rounded-lg shadow-lg max-w-sm w-full"
      class:bg-green-50={toastType === 'success'}
      class:bg-red-50={toastType === 'error'}
      class:bg-blue-50={toastType === 'info'}
      class:border-green-200={toastType === 'success'}
      class:border-red-200={toastType === 'error'}
      class:border-blue-200={toastType === 'info'}
      class:border={true}
    >
      <!-- Icon -->
      <div class="flex-shrink-0">
        {#if toastType === 'success'}
          <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        {:else if toastType === 'error'}
          <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        {:else}
          <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        {/if}
      </div>
      
      <!-- Message -->
      <div class="ml-3 flex-1">
        <p 
          class="text-sm font-medium"
          class:text-green-800={toastType === 'success'}
          class:text-red-800={toastType === 'error'}
          class:text-blue-800={toastType === 'info'}
        >
          {toastMessage}
        </p>
      </div>
      
      <!-- Close Button -->
      <div class="ml-4 flex-shrink-0">
        <button
          type="button"
          class="inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2"
          class:text-green-500={toastType === 'success'}
          class:text-red-500={toastType === 'error'}
          class:text-blue-500={toastType === 'info'}
          class:hover:text-green-600={toastType === 'success'}
          class:hover:text-red-600={toastType === 'error'}
          class:hover:text-blue-600={toastType === 'info'}
          class:focus:ring-green-600={toastType === 'success'}
          class:focus:ring-red-600={toastType === 'error'}
          class:focus:ring-blue-600={toastType === 'info'}
          on:click={() => showToast = false}
        >
          <span class="sr-only">Close</span>
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  </div>
{/if}
