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

      // Load students
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
</script>

<svelte:head>
  <title>{classData?.name || 'Class Details'} - LMS Light</title>
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
        <div class="flex justify-between items-center py-4">
          <div class="flex items-center">
            <div class="mr-4">
              <Button variant="secondary" size="sm" on:click={goBack}>
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Button>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">{classData.name}</h1>
              <p class="text-sm text-gray-600">{classData.description || 'No description'}</p>
            </div>
          </div>
          
          <div class="flex items-center space-x-4">
            <div class="text-right">
              <p class="text-sm font-medium text-gray-900">
                {classData.teacher?.firstName} {classData.teacher?.lastName}
              </p>
              <p class="text-xs text-gray-500">Teacher</p>
            </div>
            <div class="h-10 w-10 bg-primary-600 rounded-full flex items-center justify-center">
              <span class="text-sm font-medium text-white">
                {classData.teacher?.firstName?.charAt(0)}{classData.teacher?.lastName?.charAt(0)}
              </span>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-500">Class Code</p>
              <p class="text-lg font-semibold text-gray-900">{classData.code}</p>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="card p-6">
          <div class="flex items-center">
            <div class="p-2 bg-blue-100 rounded-lg">
              <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Students</p>
              <p class="text-2xl font-semibold text-gray-900">{students.length}</p>
            </div>
          </div>
        </div>

        <div class="card p-6">
          <div class="flex items-center">
            <div class="p-2 bg-green-100 rounded-lg">
              <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Reading Texts</p>
              <p class="text-2xl font-semibold text-gray-900">{readingTexts.length}</p>
            </div>
          </div>
        </div>

        <div class="card p-6">
          <div class="flex items-center">
            <div class="p-2 bg-yellow-100 rounded-lg">
              <svg class="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Assignments</p>
              <p class="text-2xl font-semibold text-gray-900">{exercises.length}</p>
            </div>
          </div>
        </div>

        <div class="card p-6">
          <div class="flex items-center">
            <div class="p-2 bg-purple-100 rounded-lg">
              <svg class="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Completion Rate</p>
              <p class="text-2xl font-semibold text-gray-900">-</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="mb-8">
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex space-x-8">
            <button
              class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'overview' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
              on:click={() => activeTab = 'overview'}
            >
              Overview
            </button>
            <button
              class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'students' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
              on:click={() => activeTab = 'students'}
            >
              Students ({students.length})
            </button>
            <button
              class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'assignments' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
              on:click={() => activeTab = 'assignments'}
            >
              Assignments ({exercises.length})
            </button>
            <button
              class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'materials' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
              on:click={() => activeTab = 'materials'}
            >
              Reading Materials ({readingTexts.length})
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

<!-- Overview Tab -->
{#snippet overviewTab()}
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <!-- Class Information -->
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Class Information</h3>
      <div class="space-y-4">
        <div>
          <div class="text-sm font-medium text-gray-500">Class Name</div>
          <p class="text-sm text-gray-900">{classData.name}</p>
        </div>
        <div>
          <div class="text-sm font-medium text-gray-500">Description</div>
          <p class="text-sm text-gray-900">{classData.description || 'No description provided'}</p>
        </div>
        <div>
          <div class="text-sm font-medium text-gray-500">Teacher</div>
          <p class="text-sm text-gray-900">{classData.teacher?.firstName} {classData.teacher?.lastName}</p>
        </div>
        <div>
          <div class="text-sm font-medium text-gray-500">Created</div>
          <p class="text-sm text-gray-900">{new Date(classData.createdAt).toLocaleDateString()}</p>
        </div>
        <div>
          <div class="text-sm font-medium text-gray-500">Status</div>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Active
          </span>
        </div>
      </div>
    </div>

    <!-- Class Information -->
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Class Information</h3>
      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div class="text-sm font-medium text-gray-500">Class Code</div>
            <p class="text-lg font-semibold text-gray-900">{classData.code}</p>
          </div>
          <div>
            <div class="text-sm font-medium text-gray-500">Status</div>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {classData.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
              {classData.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div>
            <div class="text-sm font-medium text-gray-500">Created</div>
            <p class="text-sm text-gray-900">{new Date(classData.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <div class="text-sm font-medium text-gray-500">Last Updated</div>
            <p class="text-sm text-gray-900">{new Date(classData.updatedAt).toLocaleDateString()}</p>
          </div>
        </div>
        
        {#if classData.description}
          <div>
            <div class="text-sm font-medium text-gray-500">Description</div>
            <p class="text-sm text-gray-900 mt-1">{classData.description}</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
      <div class="space-y-3">
        {#if $authStore.user?.role === 'ADMIN' || $authStore.user?.role === 'TEACHER'}
          <Button variant="primary" size="md" fullWidth on:click={() => goto(`/classes/${classData.id}/manage`)}>
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Manage Class
          </Button>
        {/if}
        <Button variant="secondary" size="md" fullWidth on:click={() => goto('/analytics')}>
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          View Analytics
        </Button>
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
  <div class="card p-6">
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-lg font-semibold text-gray-900">Students ({students.length})</h3>
      <div class="text-sm text-gray-500">
        Total enrolled students
      </div>
    </div>

    {#if students.length > 0}
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each students as student}
              <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                      <span class="text-sm font-medium text-primary-600">
                        {student.student?.firstName?.charAt(0)}{student.student?.lastName?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div class="text-sm font-medium text-gray-900">
                        {student.student?.firstName} {student.student?.lastName}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {student.student?.email}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {student.student?.username}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(student.createdAt).toLocaleDateString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
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
        <div class="mt-6">
          <Button variant="primary" size="sm" on:click={() => goto(`/classes/${classData.id}/manage`)}>
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Manage Class
          </Button>
        </div>
      </div>
    {/if}
  </div>
{/snippet}

<!-- Assignments Tab -->
{#snippet assignmentsTab()}
  <div class="card p-6">
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-lg font-semibold text-gray-900">Assignments ({exercises.length})</h3>
      <div class="text-sm text-gray-500">
        Total assignments
      </div>
    </div>

    {#if exercises.length > 0}
      <div class="space-y-4">
        {#each exercises as exercise}
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
                {#if $authStore.user?.role === 'ADMIN' || $authStore.user?.role === 'TEACHER'}
                  <Button variant="secondary" size="sm">
                    Edit
                  </Button>
                {/if}
                <Button variant="primary" size="sm">
                  View
                </Button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No assignments yet</h3>
        <p class="mt-1 text-sm text-gray-500">Create assignments for this class to get started.</p>
        <div class="mt-6">
          {#if $authStore.user?.role === 'ADMIN' || $authStore.user?.role === 'TEACHER'}
            <Button variant="primary" size="sm">
              Create Assignment
            </Button>
          {/if}
        </div>
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
                {#if $authStore.user?.role === 'ADMIN' || $authStore.user?.role === 'TEACHER'}
                  <Button variant="secondary" size="sm">
                    Edit
                  </Button>
                {/if}
                <Button variant="primary" size="sm" on:click={() => goto(`/reading-texts/${text.id}`)}>
                  View & Annotate
                </Button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No reading materials yet</h3>
        <p class="mt-1 text-sm text-gray-500">Add reading materials for this class to get started.</p>
        <div class="mt-6">
          {#if $authStore.user?.role === 'ADMIN' || $authStore.user?.role === 'TEACHER'}
            <Button variant="primary" size="sm">
              Add Material
            </Button>
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/snippet}
