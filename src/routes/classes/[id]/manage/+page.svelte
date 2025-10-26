<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.js';
  import Button from '$lib/components/Button.svelte';
  import Alert from '$lib/components/Alert.svelte';

  let classData: any = null;
  let students: any[] = [];
  let exercises: any[] = [];
  let readingTexts: any[] = [];
  let loading = true;
  let error = '';
  let showAddStudentModal = false;
  let showCreateStudentModal = false;
  let newStudentEmail = '';
  let addStudentLoading = false;
  let addStudentError = '';
  let allStudents: any[] = [];
  let selectedStudents: string[] = [];
  let searchQuery = '';
  let showRemoveConfirmModal = false;
  let studentToRemove: any = null;
  let removeStudentLoading = false;
  let showDeleteReadingTextModal = false;
  let readingTextToDelete: any = null;
  let deleteReadingTextLoading = false;
  
  // Create student form
  let createStudentForm = {
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: ''
  };
  let createStudentLoading = false;
  let createStudentError = '';
  let activeTab = 'overview';

  onMount(() => {
    console.log('Component mounted, checking auth...');
    if (!$authStore.isAuthenticated || !['TEACHER', 'ADMIN'].includes($authStore.user?.role || '')) {
      console.log('User not authenticated or not authorized, redirecting...');
      goto('/dashboard');
      return;
    }

    console.log('User authenticated, loading data...');
    loadClassData();
    loadAllStudents();
  });

  async function loadClassData() {
    try {
      console.log('Loading class data...');
      loading = true;
      const classId = $page.params.id;
      
      if (!classId) {
        error = 'Class ID not found';
        return;
      }

      // Load class details
      console.log('Fetching class details...');
      const classResponse = await fetch(`/api/classes?id=${classId}`, {
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Class response status:', classResponse.status);
      if (classResponse.ok) {
        const classResult = await classResponse.json();
        classData = classResult.class;
        console.log('Class data loaded:', classData?.name);
      } else {
        console.error('Failed to load class:', await classResponse.text());
      }

      // Load students
      console.log('Fetching students...');
      const studentsResponse = await fetch(`/api/class-students?classId=${classId}`, {
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Students response status:', studentsResponse.status);
      if (studentsResponse.ok) {
        const studentsResult = await studentsResponse.json();
        students = studentsResult.students || [];
        console.log('Students loaded:', students.length);
      } else {
        console.error('Failed to load students:', await studentsResponse.text());
      }

      // Load exercises
      console.log('Fetching exercises...');
      const exercisesResponse = await fetch(`/api/exercises?classId=${classId}`, {
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Exercises response status:', exercisesResponse.status);
      if (exercisesResponse.ok) {
        const exercisesResult = await exercisesResponse.json();
        exercises = exercisesResult.exercises || [];
        console.log('Exercises loaded:', exercises.length);
      } else {
        console.error('Failed to load exercises:', await exercisesResponse.text());
      }

      // Load reading texts
      console.log('Fetching reading texts...');
      const readingTextsResponse = await fetch(`/api/reading-texts?classId=${classId}`, {
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Reading texts response status:', readingTextsResponse.status);
      if (readingTextsResponse.ok) {
        const readingTextsResult = await readingTextsResponse.json();
        readingTexts = readingTextsResult.readingTexts || [];
        console.log('Reading texts loaded:', readingTexts.length);
      } else {
        console.error('Failed to load reading texts:', await readingTextsResponse.text());
      }

    } catch (err) {
      console.error('Error loading class data:', err);
      error = 'Failed to load class data';
    } finally {
      console.log('Class data loading completed');
      loading = false;
      // Force loading to false after 10 seconds as fallback
      setTimeout(() => {
        if (loading) {
          console.log('Force setting loading to false after timeout');
          loading = false;
        }
      }, 10000);
    }
  }

  function goBack() {
    goto('/dashboard');
  }

  function goToView() {
    goto(`/classes/${$page.params.id}`);
  }

  async function loadAllStudents() {
    try {
      console.log('Loading all students...');
      const response = await fetch('/api/users?role=STUDENT', {
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('All students response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        allStudents = data.users || [];
        console.log('All students loaded:', allStudents.length);
      } else {
        console.error('Failed to load all students:', await response.text());
      }
    } catch (err) {
      console.error('Error loading students:', err);
    }
  }

  function addStudent() {
    console.log('Add Student button clicked');
    console.log('Current loading state:', loading);
    console.log('Current showAddStudentModal state:', showAddStudentModal);
    showAddStudentModal = true;
    addStudentError = '';
    selectedStudents = [];
    console.log('Modal should be open now:', showAddStudentModal);
  }

  async function handleAddStudent() {
    if (selectedStudents.length === 0) {
      addStudentError = 'Please select at least one student';
      return;
    }

    try {
      addStudentLoading = true;
      addStudentError = '';

      // Add each selected student to the class
      for (const studentId of selectedStudents) {
        const response = await fetch('/api/class-students', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${$authStore.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            classId: $page.params.id,
            studentId: studentId
          })
        });

        if (!response.ok) {
          const data = await response.json();
          addStudentError = data.error || 'Failed to add student';
          return;
        }
      }

      // Reload class data
      await loadClassData();
      
      // Close modal
      showAddStudentModal = false;
      selectedStudents = [];
    } catch (err) {
      console.error('Add student error:', err);
      addStudentError = 'Failed to add students';
    } finally {
      addStudentLoading = false;
    }
  }

  function closeAddStudentModal() {
    showAddStudentModal = false;
    addStudentError = '';
    selectedStudents = [];
    searchQuery = '';
  }

  function toggleStudentSelection(studentId: string) {
    if (selectedStudents.includes(studentId)) {
      selectedStudents = selectedStudents.filter(id => id !== studentId);
    } else {
      selectedStudents = [...selectedStudents, studentId];
    }
  }

  function selectAllStudents() {
    const availableStudents = filteredStudents.filter(student => 
      !students.some(enrolled => enrolled.student.id === student.id)
    );
    selectedStudents = availableStudents.map(student => student.id);
  }

  function deselectAllStudents() {
    selectedStudents = [];
  }

  // Debug reactive statements
  $: console.log('Loading state changed:', loading);
  $: console.log('Show add student modal:', showAddStudentModal);
  $: console.log('Show remove confirm modal:', showRemoveConfirmModal);
  $: console.log('Students count:', students.length);
  $: console.log('All students count:', allStudents.length);

  // Computed property for filtered students
  $: filteredStudents = allStudents.filter(student => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const email = student.email.toLowerCase();
    const username = student.username.toLowerCase();
    
    return fullName.includes(query) || 
           email.includes(query) || 
           username.includes(query);
  });

  async function handleCreateStudent() {
    if (!createStudentForm.email || !createStudentForm.username || !createStudentForm.firstName || !createStudentForm.lastName || !createStudentForm.password) {
      createStudentError = 'All fields are required';
      return;
    }

    if (createStudentForm.password !== createStudentForm.confirmPassword) {
      createStudentError = 'Passwords do not match';
      return;
    }

    if (createStudentForm.password.length < 6) {
      createStudentError = 'Password must be at least 6 characters';
      return;
    }

    try {
      createStudentLoading = true;
      createStudentError = '';

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: createStudentForm.email,
          username: createStudentForm.username,
          firstName: createStudentForm.firstName,
          lastName: createStudentForm.lastName,
          password: createStudentForm.password,
          role: 'STUDENT'
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Reload students list
        await loadAllStudents();
        
        // Now add the student to the class
        const addToClassResponse = await fetch('/api/class-students', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${$authStore.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            classId: $page.params.id,
            studentId: data.user.id
          })
        });

        if (addToClassResponse.ok) {
          // Reload class data to update students list
          await loadClassData();
          showCreateStudentModal = false;
          showAddStudentModal = false;
          resetCreateStudentForm();
        } else {
          createStudentError = 'Student created but failed to add to class';
        }
      } else {
        createStudentError = data.error || 'Failed to create student';
      }
    } catch (err) {
      console.error('Create student error:', err);
      createStudentError = 'Failed to create student';
    } finally {
      createStudentLoading = false;
    }
  }

  function resetCreateStudentForm() {
    createStudentForm = {
      email: '',
      username: '',
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: ''
    };
    createStudentError = '';
  }

  function closeCreateStudentModal() {
    showCreateStudentModal = false;
    resetCreateStudentForm();
  }

  function createExercise() {
    goto(`/exercises/create?classId=${$page.params.id}`);
  }

  function createReadingText() {
    goto(`/reading-texts/create?classId=${$page.params.id}`);
  }

  function viewReadingText(textId: string) {
    goto(`/reading-texts/${textId}`);
  }

  function editReadingText(textId: string) {
    goto(`/reading-texts/${textId}/edit`);
  }

  async function deleteReadingText(textId: string) {
    // Find the reading text to delete
    const text = readingTexts.find(t => t.id === textId);
    if (!text) return;
    
    readingTextToDelete = text;
    showDeleteReadingTextModal = true;
  }

  async function confirmDeleteReadingText() {
    if (!readingTextToDelete) return;

    try {
      deleteReadingTextLoading = true;

      const response = await fetch(`/api/reading-texts?id=${readingTextToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Reload reading texts
        await loadClassData();
        closeDeleteReadingTextModal();
      } else {
        const result = await response.json();
        console.error('Failed to delete reading text:', result.error);
        alert(result.error || 'Failed to delete reading text');
      }
    } catch (err) {
      console.error('Error deleting reading text:', err);
      alert('Error deleting reading text');
    } finally {
      deleteReadingTextLoading = false;
    }
  }

  function closeDeleteReadingTextModal() {
    showDeleteReadingTextModal = false;
    readingTextToDelete = null;
    deleteReadingTextLoading = false;
  }

  function removeStudent(studentId: string) {
    console.log('Remove Student button clicked for:', studentId);
    console.log('Current loading state:', loading);
    console.log('Current students:', students.length);
    const student = students.find(s => s.student.id === studentId);
    console.log('Found student:', student);
    if (student) {
      studentToRemove = student.student;
      showRemoveConfirmModal = true;
      console.log('Remove modal should be open now:', showRemoveConfirmModal);
    } else {
      console.error('Student not found for ID:', studentId);
    }
  }

  async function confirmRemoveStudent() {
    if (!studentToRemove) return;

    try {
      removeStudentLoading = true;

      const response = await fetch('/api/class-students', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          classId: $page.params.id,
          studentId: studentToRemove.id
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Reload class data to update students list
        await loadClassData();
        showRemoveConfirmModal = false;
        studentToRemove = null;
      } else {
        alert(data.error || 'Failed to remove student');
      }
    } catch (err) {
      console.error('Remove student error:', err);
      alert('Failed to remove student');
    } finally {
      removeStudentLoading = false;
    }
  }

  function cancelRemoveStudent() {
    showRemoveConfirmModal = false;
    studentToRemove = null;
  }

</script>

<svelte:head>
  <title>Manage Class - {classData?.name || 'Loading...'} - LMS Light</title>
</svelte:head>

{#if loading}
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      <p class="mt-4 text-gray-600">Loading class data...</p>
    </div>
  </div>
{:else if error}
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full">
      <Alert type="error" message={error} />
      <div class="mt-4 text-center">
        <Button variant="primary" on:click={goBack}>Back to Dashboard</Button>
      </div>
    </div>
  </div>
{:else if classData}
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
            <div>
              <h1 class="text-xl font-semibold text-gray-900">Manage Class</h1>
              <p class="text-sm text-gray-500">{classData.name}</p>
            </div>
          </div>
          <div class="flex space-x-3">
            <Button variant="secondary" on:click={goToView}>
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Class
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Class Info -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Class Information</h3>
            <div class="space-y-2">
              <p><span class="font-medium">Name:</span> {classData.name}</p>
              <p><span class="font-medium">Code:</span> <code class="bg-gray-100 px-2 py-1 rounded">{classData.code}</code></p>
              <p><span class="font-medium">Description:</span> {classData.description || 'No description'}</p>
              <p><span class="font-medium">Status:</span> 
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </p>
            </div>
          </div>
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Statistics</h3>
            <div class="space-y-2">
              <p><span class="font-medium">Students:</span> {students.length}</p>
              <p><span class="font-medium">Exercises:</span> {exercises.length}</p>
              <p><span class="font-medium">Reading Texts:</span> {readingTexts.length}</p>
              <p><span class="font-medium">Created:</span> {new Date(classData.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Quick Actions</h3>
            <div class="space-y-2">
              <Button variant="primary" size="sm" fullWidth on:click={addStudent}>
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Student
              </Button>
              <Button variant="secondary" size="sm" fullWidth on:click={createExercise}>
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Create Exercise
              </Button>
              <Button variant="secondary" size="sm" fullWidth on:click={createReadingText}>
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Add Reading Text
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="bg-white rounded-lg shadow">
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex space-x-8 px-6">
            <button
              class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'overview' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
              on:click={() => activeTab = 'overview'}
            >
              Overview
            </button>
            <button
              class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'students' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
              on:click={() => activeTab = 'students'}
            >
              Students ({students.length})
            </button>
            <button
              class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'exercises' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
              on:click={() => activeTab = 'exercises'}
            >
              Exercises ({exercises.length})
            </button>
            <button
              class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'reading' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
              on:click={() => activeTab = 'reading'}
            >
              Reading Texts ({readingTexts.length})
            </button>
          </nav>
        </div>

        <div class="p-6">
          {#if activeTab === 'overview'}
            <!-- Overview Tab -->
            <div class="space-y-6">
              <div>
                <h3 class="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                <div class="bg-gray-50 rounded-lg p-4">
                  <p class="text-gray-500 text-center">No recent activity</p>
                </div>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 class="text-lg font-medium text-gray-900 mb-4">Recent Students</h3>
                  {#if students.length > 0}
                    <div class="space-y-2">
                      {#each students.slice(0, 3) as student}
                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p class="text-sm font-medium text-gray-900">{student.student.firstName} {student.student.lastName}</p>
                            <p class="text-xs text-gray-500">@{student.student.username}</p>
                          </div>
                          <span class="text-xs text-gray-500">
                            Joined {new Date(student.joinedAt).toLocaleDateString()}
                          </span>
                        </div>
                      {/each}
                    </div>
                  {:else}
                    <p class="text-gray-500 text-center py-4">No students yet</p>
                  {/if}
                </div>
                
                <div>
                  <h3 class="text-lg font-medium text-gray-900 mb-4">Recent Exercises</h3>
                  {#if exercises.length > 0}
                    <div class="space-y-2">
                      {#each exercises.slice(0, 3) as exercise}
                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p class="text-sm font-medium text-gray-900">{exercise.title}</p>
                            <p class="text-xs text-gray-500">{exercise.description || 'No description'}</p>
                          </div>
                          <span class="text-xs text-gray-500">
                            {new Date(exercise.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      {/each}
                    </div>
                  {:else}
                    <p class="text-gray-500 text-center py-4">No exercises yet</p>
                  {/if}
                </div>
              </div>
            </div>

          {:else if activeTab === 'students'}
            <!-- Students Tab -->
            <div class="space-y-4">
              <div class="flex justify-between items-center">
                <h3 class="text-lg font-medium text-gray-900">Students ({students.length})</h3>
                <Button variant="primary" size="sm" on:click={addStudent}>
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Student
                </Button>
              </div>
              
              {#if students.length > 0}
                <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table class="min-w-full divide-y divide-gray-300">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      {#each students as student}
                        <tr>
                          <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center">
                              <div class="h-10 w-10 flex-shrink-0">
                                <div class="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                                  <span class="text-sm font-medium text-primary-600">
                                    {student.student.firstName.charAt(0)}{student.student.lastName.charAt(0)}
                                  </span>
                                </div>
                              </div>
                              <div class="ml-4">
                                <div class="text-sm font-medium text-gray-900">
                                  {student.student.firstName} {student.student.lastName}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            @{student.student.username}
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(student.joinedAt).toLocaleDateString()}
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              class="text-red-600 hover:text-red-900"
                              on:click={() => removeStudent(student.student.id)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {:else}
                <div class="text-center py-8">
                  <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <h3 class="mt-2 text-sm font-medium text-gray-900">No students</h3>
                  <p class="mt-1 text-sm text-gray-500">Get started by adding students to this class.</p>
                  <div class="mt-6">
                    <Button variant="primary" size="sm" on:click={addStudent}>
                      Add Student
                    </Button>
                  </div>
                </div>
              {/if}
            </div>

          {:else if activeTab === 'exercises'}
            <!-- Exercises Tab -->
            <div class="space-y-4">
              <div class="flex justify-between items-center">
                <h3 class="text-lg font-medium text-gray-900">Exercises ({exercises.length})</h3>
                <Button variant="primary" size="sm" on:click={createExercise}>
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Exercise
                </Button>
              </div>
              
              {#if exercises.length > 0}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {#each exercises as exercise}
                    <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <h4 class="text-sm font-medium text-gray-900 mb-2">{exercise.title}</h4>
                      <p class="text-xs text-gray-500 mb-3">{exercise.description || 'No description'}</p>
                      <div class="flex justify-between items-center">
                        <span class="text-xs text-gray-500">
                          {new Date(exercise.createdAt).toLocaleDateString()}
                        </span>
                        <div class="flex space-x-2">
                          <button class="text-primary-600 hover:text-primary-900 text-xs">Edit</button>
                          <button class="text-red-600 hover:text-red-900 text-xs">Delete</button>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              {:else}
                <div class="text-center py-8">
                  <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 class="mt-2 text-sm font-medium text-gray-900">No exercises</h3>
                  <p class="mt-1 text-sm text-gray-500">Create your first exercise for this class.</p>
                  <div class="mt-6">
                    <Button variant="primary" size="sm" on:click={createExercise}>
                      Create Exercise
                    </Button>
                  </div>
                </div>
              {/if}
            </div>

          {:else if activeTab === 'reading'}
            <!-- Reading Texts Tab -->
            <div class="space-y-4">
              <div class="flex justify-between items-center">
                <h3 class="text-lg font-medium text-gray-900">Reading Texts ({readingTexts.length})</h3>
                <Button variant="primary" size="sm" on:click={createReadingText}>
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Reading Text
                </Button>
              </div>
              
              {#if readingTexts.length > 0}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {#each readingTexts as text}
                    <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <h4 class="text-sm font-medium text-gray-900 mb-2">{text.title}</h4>
                      <p class="text-xs text-gray-500 mb-3">{text.author || 'Unknown author'}</p>
                      <div class="flex justify-between items-center">
                        <span class="text-xs text-gray-500">
                          {new Date(text.createdAt).toLocaleDateString()}
                        </span>
                        <div class="flex space-x-2">
                          <button class="text-blue-600 hover:text-blue-900 text-xs" on:click={() => viewReadingText(text.id)}>View</button>
                          <button class="text-primary-600 hover:text-primary-900 text-xs" on:click={() => editReadingText(text.id)}>Edit</button>
                          <button class="text-red-600 hover:text-red-900 text-xs" on:click={() => deleteReadingText(text.id)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              {:else}
                <div class="text-center py-8">
                  <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h3 class="mt-2 text-sm font-medium text-gray-900">No reading texts</h3>
                  <p class="mt-1 text-sm text-gray-500">Add reading materials for this class.</p>
                  <div class="mt-6">
                    <Button variant="primary" size="sm" on:click={createReadingText}>
                      Add Reading Text
                    </Button>
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Add Student Modal -->
  {#if showAddStudentModal}
    <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" role="dialog" aria-modal="true" >
      <div class="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Add Students to Class</h3>
          
          {#if addStudentError}
            <Alert type="error" message={addStudentError} />
          {/if}

          <!-- Search Input -->
          <div class="mb-4">
            <label for="searchStudents" class="block text-sm font-medium text-gray-700 mb-2">
              Search Students
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="searchStudents"
                type="text"
                bind:value={searchQuery}
                class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Search by name, email, or username..."
                disabled={addStudentLoading}
              />
            </div>
          </div>

          <!-- Selection Controls -->
          <div class="mb-4 flex justify-between items-center">
            <div class="text-sm text-gray-600">
              {selectedStudents.length} student(s) selected
              {#if searchQuery.trim()}
                • {filteredStudents.length} of {allStudents.length} students shown
              {/if}
            </div>
            <div class="space-x-2">
              <Button 
                type="button" 
                variant="secondary" 
                size="sm"
                on:click={selectAllStudents}
                disabled={addStudentLoading}
              >
                Select All
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                size="sm"
                on:click={deselectAllStudents}
                disabled={addStudentLoading}
              >
                Deselect All
              </Button>
            </div>
          </div>

          <!-- Students List -->
          <div class="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
            {#if filteredStudents.length === 0}
              <div class="p-4 text-center text-gray-500">
                {#if searchQuery.trim()}
                  No students found matching "{searchQuery}"
                {:else}
                  No students available
                {/if}
              </div>
            {:else}
              <div class="divide-y divide-gray-200">
                {#each filteredStudents as student}
                  {@const isEnrolled = students.some(enrolled => enrolled.student.id === student.id)}
                  {@const isSelected = selectedStudents.includes(student.id)}
                  <div class="p-3 hover:bg-gray-50 {isEnrolled ? 'bg-gray-100 opacity-60' : ''}">
                    <div class="flex items-center">
                      <input
                        type="checkbox"
                        id="student-{student.id}"
                        checked={isSelected}
                        disabled={isEnrolled || addStudentLoading}
                        on:change={() => toggleStudentSelection(student.id)}
                        class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50"
                      />
                      <label for="student-{student.id}" class="ml-3 flex-1 cursor-pointer">
                        <div class="flex items-center justify-between">
                          <div>
                            <div class="text-sm font-medium text-gray-900">
                              {student.firstName} {student.lastName}
                            </div>
                            <div class="text-sm text-gray-500">
                              {student.email} • @{student.username}
                            </div>
                          </div>
                          {#if isEnrolled}
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Already Enrolled
                            </span>
                          {/if}
                        </div>
                      </label>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <Button 
              type="button" 
              variant="secondary" 
              on:click={closeAddStudentModal}
              disabled={addStudentLoading}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="primary" 
              on:click={handleAddStudent}
              disabled={addStudentLoading || selectedStudents.length === 0}
            >
              {#if addStudentLoading}
                <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              {/if}
              {addStudentLoading ? 'Adding...' : `Add ${selectedStudents.length} Student${selectedStudents.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Create Student Modal -->
  {#if showCreateStudentModal}
    <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" role="dialog" aria-modal="true" >
      <div class="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Create New Student</h3>
          
          {#if createStudentError}
            <Alert type="error" message={createStudentError} />
          {/if}

          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="firstName" class="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  bind:value={createStudentForm.firstName}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="First name"
                  disabled={createStudentLoading}
                />
              </div>
              <div>
                <label for="lastName" class="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  bind:value={createStudentForm.lastName}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Last name"
                  disabled={createStudentLoading}
                />
              </div>
            </div>

            <div>
              <label for="createEmail" class="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="createEmail"
                type="email"
                bind:value={createStudentForm.email}
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Email address"
                disabled={createStudentLoading}
              />
            </div>

            <div>
              <label for="username" class="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                bind:value={createStudentForm.username}
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Username"
                disabled={createStudentLoading}
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  bind:value={createStudentForm.password}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Password"
                  disabled={createStudentLoading}
                />
              </div>
              <div>
                <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  bind:value={createStudentForm.confirmPassword}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Confirm password"
                  disabled={createStudentLoading}
                />
              </div>
            </div>
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <Button 
              type="button" 
              variant="secondary" 
              on:click={closeCreateStudentModal}
              disabled={createStudentLoading}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="primary" 
              on:click={handleCreateStudent}
              disabled={createStudentLoading}
            >
              {#if createStudentLoading}
                <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              {/if}
              {createStudentLoading ? 'Creating...' : 'Create & Add Student'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Remove Student Confirmation Modal -->
  {#if showRemoveConfirmModal && studentToRemove}
    <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" role="dialog" aria-modal="true">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <!-- Warning Icon -->
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>

          <!-- Modal Content -->
          <div class="text-center">
            <h3 class="text-lg font-medium text-gray-900 mb-2">Remove Student from Class</h3>
            <div class="mt-2 px-7 py-3">
              <p class="text-sm text-gray-500 mb-4">
                Are you sure you want to remove this student from the class?
              </p>
              
              <!-- Student Information -->
              <div class="bg-gray-50 rounded-lg p-4 mb-4">
                <div class="flex items-center justify-center space-x-3">
                  <div class="flex-shrink-0">
                    <div class="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <span class="text-sm font-medium text-primary-600">
                        {studentToRemove.firstName.charAt(0)}{studentToRemove.lastName.charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div class="text-left">
                    <div class="text-sm font-medium text-gray-900">
                      {studentToRemove.firstName} {studentToRemove.lastName}
                    </div>
                    <div class="text-sm text-gray-500">
                      {studentToRemove.email}
                    </div>
                    <div class="text-xs text-gray-400">
                      @{studentToRemove.username}
                    </div>
                  </div>
                </div>
              </div>

              <p class="text-xs text-gray-400">
                This action cannot be undone. The student will be removed from this class but their account will remain active.
              </p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-end space-x-3 mt-6">
            <Button 
              type="button" 
              variant="secondary" 
              on:click={cancelRemoveStudent}
              disabled={removeStudentLoading}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="danger" 
              on:click={confirmRemoveStudent}
              disabled={removeStudentLoading}
            >
              {#if removeStudentLoading}
                <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              {/if}
              {removeStudentLoading ? 'Removing...' : 'Remove Student'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  {/if}
{/if}

<!-- Delete Reading Text Confirmation Modal -->
{#if showDeleteReadingTextModal && readingTextToDelete}
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    role="dialog"
    aria-modal="true"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-center mb-4">
          <div class="flex-shrink-0">
            <div class="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
              <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <h3 class="text-lg font-semibold text-gray-900">Delete Reading Text</h3>
            <p class="text-sm text-gray-500">This action cannot be undone</p>
          </div>
        </div>

        <!-- Content -->
        <div class="mb-6">
          <div class="bg-gray-50 rounded-lg p-4 mb-4">
            <div class="flex items-start">
              <div class="flex-1">
                <h4 class="text-sm font-medium text-gray-900 mb-1">{readingTextToDelete.title}</h4>
                <p class="text-xs text-gray-500 mb-2">
                  {readingTextToDelete.author ? `by ${readingTextToDelete.author}` : 'Unknown author'}
                  {readingTextToDelete.source ? ` • ${readingTextToDelete.source}` : ''}
                </p>
                <p class="text-xs text-gray-400">
                  Created: {new Date(readingTextToDelete.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800">Warning</h3>
                <div class="mt-2 text-sm text-red-700">
                  <p>Deleting this reading text will permanently remove:</p>
                  <ul class="list-disc list-inside mt-1 space-y-1">
                    <li>All content and images</li>
                    <li>All annotations and discussions</li>
                    <li>Student progress and interactions</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <p class="text-xs text-gray-400 mt-4">
            This action cannot be undone. All associated data will be permanently deleted.
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end space-x-3">
          <Button 
            type="button" 
            variant="secondary" 
            on:click={closeDeleteReadingTextModal}
            disabled={deleteReadingTextLoading}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="danger" 
            on:click={confirmDeleteReadingText}
            disabled={deleteReadingTextLoading}
          >
            {#if deleteReadingTextLoading}
              <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            {/if}
            {deleteReadingTextLoading ? 'Deleting...' : 'Delete Reading Text'}
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}
