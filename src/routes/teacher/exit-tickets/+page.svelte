<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.js';
  import { apiFetchJson } from '$lib/api.js';
  import Button from '$lib/components/Button.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import Alert from '$lib/components/Alert.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import { fade, scale } from 'svelte/transition';

  // Data state
  let classes: any[] = [];
  let lessons: any[] = [];
  let groups: any[] = [];
  let readingTexts: any[] = [];
  let exercises: any[] = [];
  let categories: any[] = [];

  let selectedClassId = '';
  let loading = true;
  let loadingDetails = false;

  // Modal State
  let showModal = false;
  let modalMode: 'create' | 'edit' = 'create';
  let modalLoading = false;
  let modalError = '';

  // Form State
  let formId = '';
  let formTitle = '';
  let formDescription = '';
  let formContent = '';
  let formLessonId = '';
  let formReadingTextId = '';
  let formDueDate = '';
  let formTimerMinutes = '';
  let formAutoSubmit = true;
  let formMinWords = '150';
  let formMaxWords = '200';

  // Confirm Delete State
  let showConfirmDialog = false;
  let confirmDialogProps = {
    title: 'Delete Exit Ticket',
    message: 'Are you sure you want to delete this exit ticket?',
    confirmText: 'Delete',
    loading: false,
    onConfirm: async () => {},
  };

  onMount(async () => {
    authStore.init();
    if (!$authStore.isAuthenticated || !['TEACHER', 'ADMIN'].includes($authStore.user?.role || '')) {
      goto('/dashboard');
      return;
    }
    await loadClasses();
  });

  async function loadClasses() {
    try {
      loading = true;
      const data = await apiFetchJson('/api/classes');
      classes = data.classes || [];
      if (classes.length > 0) {
        selectedClassId = classes[0].id;
        await loadClassDetails(selectedClassId);
      }
    } catch (err) {
      console.error('Error loading classes:', err);
    } finally {
      loading = false;
    }
  }

  async function loadClassDetails(classId: string) {
    if (!classId) return;
    try {
      loadingDetails = true;
      const [lessonsData, groupsData, textsData, exercisesData] = await Promise.all([
        apiFetchJson(`/api/lessons?classId=${classId}`).catch(() => ({ lessons: [] })),
        apiFetchJson(`/api/groups?classId=${classId}`).catch(() => ({ groups: [] })),
        apiFetchJson(`/api/reading-texts?classId=${classId}`).catch(() => ({ readingTexts: [] })),
        apiFetchJson(`/api/exercises?classId=${classId}`).catch(() => ({ exercises: [] }))
      ]);

      lessons = lessonsData.lessons || [];
      groups = groupsData.groups || [];
      readingTexts = textsData.readingTexts || [];
      exercises = exercisesData.exercises || [];
      
      buildCategories();
    } catch (err) {
      console.error('Error loading class details', err);
    } finally {
      loadingDetails = false;
    }
  }

  function buildCategories() {
    // Group exit tickets by lesson, then by group (via reading text)
    const newCategories = [];
    
    for (const lesson of lessons) {
      const lessonExercises = exercises.filter(e => e.lessonId === lesson.id);
      
      const category: any = {
        lesson,
        groups: [],
        ungroupedExercises: []
      };

      // Find groups that belong to this lesson
      const lessonGroups = groups.filter(g => g.lessonId === lesson.id || g.classId === selectedClassId);
      
      for (const group of lessonGroups) {
        // Find reading texts in this group
        const groupTexts = readingTexts.filter(rt => rt.groupId === group.id && rt.lessonId === lesson.id);
        const groupTextIds = groupTexts.map(t => t.id);
        
        // Find exercises tied to these reading texts
        const groupExercises = lessonExercises.filter(e => e.readingTextId && groupTextIds.includes(e.readingTextId));
        
        if (groupExercises.length > 0 || groupTexts.length > 0) {
          category.groups.push({
            group,
            exercises: groupExercises
          });
        }
      }

      // Ungrouped exercises
      category.ungroupedExercises = lessonExercises.filter(e => {
        if (!e.readingTextId) return true;
        const rt = readingTexts.find(t => t.id === e.readingTextId);
        return !rt || !rt.groupId;
      });

      newCategories.push(category);
    }
    
    categories = newCategories;
  }

  async function handleClassChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedClassId = target.value;
    await loadClassDetails(selectedClassId);
  }

  function openCreateModal() {
    modalMode = 'create';
    formId = '';
    formTitle = '';
    formDescription = '';
    formContent = '';
    formLessonId = lessons.length > 0 ? lessons[0].id : '';
    formReadingTextId = '';
    formDueDate = '';
    formTimerMinutes = '';
    formAutoSubmit = true;
    formMinWords = '150';
    formMaxWords = '200';
    modalError = '';
    showModal = true;
  }

  function openEditModal(exercise: any) {
    modalMode = 'edit';
    formId = exercise.id;
    formTitle = exercise.title || '';
    formDescription = exercise.description || '';
    formContent = exercise.content || '';
    formLessonId = exercise.lessonId || '';
    formReadingTextId = exercise.readingTextId || '';
    formDueDate = exercise.dueDate ? new Date(exercise.dueDate).toISOString().slice(0, 16) : '';
    formTimerMinutes = exercise.timerDuration ? String(Math.floor(exercise.timerDuration / 60)) : '';
    formAutoSubmit = exercise.autoSubmitOnTimeout ?? true;
    formMinWords = exercise.minWords ? String(exercise.minWords) : '';
    formMaxWords = exercise.maxWords ? String(exercise.maxWords) : '';
    modalError = '';
    showModal = true;
  }

  function closeModal() {
    showModal = false;
  }

  async function handleSave() {
    if (!formTitle.trim() || !formContent.trim() || !formLessonId) {
      modalError = 'Title, content and lesson are required.';
      return;
    }

    try {
      modalLoading = true;
      modalError = '';

      const parsedMinutes = formTimerMinutes ? Number(formTimerMinutes) : 0;
      const timerDuration = parsedMinutes > 0 ? parsedMinutes * 60 : null;

      const payload = {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        content: formContent.trim(),
        classId: selectedClassId,
        lessonId: formLessonId,
        readingTextId: formReadingTextId || null,
        dueDate: formDueDate || null,
        timerDuration,
        autoSubmitOnTimeout: formAutoSubmit,
        minWords: formMinWords ? Number(formMinWords) : null,
        maxWords: formMaxWords ? Number(formMaxWords) : null
      };

      if (modalMode === 'edit') {
        Object.assign(payload, { id: formId });
      }

      await apiFetchJson('/api/exercises', {
        method: modalMode === 'create' ? 'POST' : 'PUT',
        body: JSON.stringify(payload)
      });

      showModal = false;
      await loadClassDetails(selectedClassId);
    } catch (err: any) {
      console.error('Error saving exit ticket:', err);
      modalError = err.message || 'Failed to save exit ticket';
    } finally {
      modalLoading = false;
    }
  }

  function deleteExercise(exercise: any) {
    confirmDialogProps = {
      title: 'Delete Exit Ticket',
      message: `Are you sure you want to delete ${exercise.title}?`,
      confirmText: 'Delete',
      loading: false,
      onConfirm: async () => {
        try {
          confirmDialogProps.loading = true;
          await apiFetchJson(`/api/exercises`, { 
            method: 'DELETE',
            body: JSON.stringify({ id: exercise.id })
          });
          showConfirmDialog = false;
          await loadClassDetails(selectedClassId);
        } catch (err: any) {
          alert('Error deleting exit ticket: ' + err.message);
        } finally {
          confirmDialogProps.loading = false;
        }
      }
    };
    showConfirmDialog = true;
  }
</script>

<svelte:head>
  <title>Manage Exit Tickets - IDEA</title>
</svelte:head>

<ConfirmDialog 
  show={showConfirmDialog}
  title={confirmDialogProps.title}
  message={confirmDialogProps.message}
  confirmText={confirmDialogProps.confirmText}
  loading={confirmDialogProps.loading}
  on:confirm={confirmDialogProps.onConfirm}
  on:cancel={() => showConfirmDialog = false}
/>

<div class="min-h-screen bg-gray-50 flex flex-col md:flex-row">
  <!-- Left Sidebar for Classes -->
  <aside class="w-full md:w-64 bg-white border-r border-gray-200 py-6 px-4 shrink-0">
    <div class="flex items-center mb-6">
      <Button variant="secondary" size="sm" class="mr-3" on:click={() => goto('/dashboard')}>
        <svg class="w-4 h-4 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Button>
      <h2 class="text-xl font-bold text-gray-900">Exit Tickets</h2>
    </div>

    <!-- Mobile view dropdown -->
    <div class="md:hidden mb-4">
      <select 
        bind:value={selectedClassId} 
        on:change={handleClassChange}
        class="w-full border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
      >
        {#each classes as cls}
          <option value={cls.id}>{cls.name}</option>
        {/each}
      </select>
    </div>

    <!-- Desktop view list -->
    <div class="hidden md:block space-y-1">
      {#if loading}
        <div class="animate-pulse space-y-2">
          <div class="h-8 bg-gray-200 rounded"></div>
          <div class="h-8 bg-gray-200 rounded"></div>
        </div>
      {:else}
        {#each classes as cls}
          <button
            class="w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors {selectedClassId === cls.id ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-100'}"
            on:click={() => { selectedClassId = cls.id; loadClassDetails(cls.id); }}
          >
            {cls.name}
          </button>
        {/each}
        {#if classes.length === 0}
          <p class="text-xs text-gray-500 italic px-3">No classes found.</p>
        {/if}
      {/if}
    </div>
  </aside>

  <!-- Main Content Area -->
  <main class="flex-1 p-6 overflow-y-auto">
    <div class="max-w-5xl mx-auto">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">
            {#if classes.find(c => c.id === selectedClassId)}
              {classes.find(c => c.id === selectedClassId).name}
            {:else}
              Select a class
            {/if}
          </h1>
          <p class="text-sm text-gray-500 mt-1">Manage exit tickets per lesson and group for this class.</p>
        </div>
        {#if selectedClassId && !loadingDetails}
          <Button variant="primary" size="sm" class="mt-4 sm:mt-0" on:click={openCreateModal}>
            <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Exit Ticket
          </Button>
        {/if}
      </div>

      {#if loadingDetails}
        <div class="flex items-center justify-center py-20">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span class="ml-3 text-gray-600">Loading exit tickets...</span>
        </div>
      {:else if !selectedClassId}
        <!-- Blank State -->
      {:else if categories.length === 0}
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
           <svg class="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 class="mt-4 text-sm font-medium text-gray-900">No lessons structured yet</h3>
          <p class="mt-1 text-sm text-gray-500">Add a lesson to this class first to organize exit tickets.</p>
        </div>
      {:else}
        <div class="space-y-8">
          {#each categories as category}
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div class="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <h3 class="text-sm font-medium text-gray-700 uppercase tracking-wider">{category.lesson.title}</h3>
              </div>
              
              <div class="p-4 space-y-6">
                <!-- Grouped Exercises -->
                {#each category.groups as groupData}
                  {#if groupData.exercises.length > 0}
                    <div>
                      <h4 class="text-xs font-semibold text-gray-400 mb-3 flex items-center">
                        <svg class="w-4 h-4 mr-1 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        GROUP: {groupData.group.name}
                      </h4>
                      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {#each groupData.exercises as exercise}
                           {@render exitTicketCard(exercise)}
                        {/each}
                      </div>
                    </div>
                  {/if}
                {/each}

                <!-- Ungrouped Exercises -->
                {#if category.ungroupedExercises.length > 0}
                  <div>
                    {#if category.groups.length > 0}
                      <h4 class="text-xs font-semibold text-gray-400 mb-3">General (Everyone)</h4>
                    {/if}
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {#each category.ungroupedExercises as exercise}
                        {@render exitTicketCard(exercise)}
                      {/each}
                    </div>
                  </div>
                {/if}

                {#if category.groups.every((g: any) => g.exercises.length === 0) && category.ungroupedExercises.length === 0}
                  <p class="text-sm text-gray-500 text-center py-4 italic">No exit tickets for this lesson.</p>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </main>
</div>

<!-- Reusable Exit Ticket Card Snippet -->
{#snippet exitTicketCard(exercise: any)}
  <div class="border border-gray-200 rounded-lg p-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 bg-white">
    <div class="flex justify-between items-start mb-2">
      <h5 class="text-sm font-semibold text-gray-900 truncate" title={exercise.title}>{exercise.title}</h5>
      <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium {exercise.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
        {exercise.isActive ? 'Active' : 'Inactive'}
      </span>
    </div>
    <p class="text-xs text-gray-500 mb-3 line-clamp-2" title={exercise.description}>{exercise.description || 'No description'}</p>
    
    <div class="flex justify-between items-center text-xs text-gray-400 mb-4">
      <div class="flex space-x-2">
        {#if exercise.dueDate}
          <span title="Due Date" class="flex items-center">
            <svg class="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {new Date(exercise.dueDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
          </span>
        {/if}
        {#if exercise.timerDuration}
          <span title="Timer" class="flex items-center text-orange-500">
            <svg class="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {Math.floor(exercise.timerDuration/60)}m
          </span>
        {/if}
      </div>
    </div>
    
    <div class="pt-3 border-t border-gray-100 flex justify-between">
      <Button variant="secondary" size="sm" class="text-xs px-2 py-1" on:click={() => goto(`/submissions/${exercise.id}`)}>
        View Subs
      </Button>
      <div class="flex space-x-1">
        <Button variant="secondary" size="sm" class="text-xs px-2 py-1 text-primary-600 border-primary-200 bg-primary-50 hover:bg-primary-100" on:click={() => openEditModal(exercise)}>
          Edit
        </Button>
        <Button variant="secondary" size="sm" class="text-xs px-2 py-1 text-red-600 border-red-200 bg-red-50 hover:bg-red-100" on:click={() => deleteExercise(exercise)}>
          Del
        </Button>
      </div>
    </div>
  </div>
{/snippet}

<!-- Create/Edit Modal -->
{#if showModal}
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    transition:fade={{ duration: 150 }}
  >
    <!-- Background overlay -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div 
      class="fixed inset-0 bg-gray-900 bg-opacity-50"
      on:click={() => !modalLoading && closeModal()}
    ></div>

    <!-- Modal Panel -->
    <div 
      class="bg-white rounded-xl shadow-xl overflow-hidden w-full max-w-2xl relative z-10 transform"
      transition:scale={{ duration: 150, start: 0.95 }}
      role="dialog"
    >
      <div class="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 class="text-lg font-medium text-gray-900">
          {modalMode === 'create' ? 'Create New Exit Ticket' : 'Edit Exit Ticket'}
        </h3>
        <button on:click={closeModal} class="text-gray-400 hover:text-gray-500 focus:outline-none">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
      
      <div class="p-6 overflow-y-auto max-h-[calc(100vh-12rem)]">
        {#if modalError}
          <div class="mb-4">
            <Alert type="error" message={modalError} />
          </div>
        {/if}

        <div class="space-y-4">
          <FormField
            label="Exit Ticket Title *"
            type="text"
            bind:value={formTitle}
            placeholder="Enter title"
            required
          />

          <div>
            <label for="content" class="block text-sm font-medium text-gray-700 mb-1">Question Content *</label>
            <textarea
              id="content"
              bind:value={formContent}
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
              placeholder="Paste the question or prompt"
              required
            ></textarea>
          </div>

          <div>
            <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              id="description"
              bind:value={formDescription}
              rows="2"
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
              placeholder="(Optional)"
            ></textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="lessonId" class="block text-sm font-medium text-gray-700 mb-1">Lesson *</label>
              <select
                id="lessonId"
                bind:value={formLessonId}
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="">Select a lesson</option>
                {#each lessons as lesson}
                  <option value={lesson.id}>{lesson.title}</option>
                {/each}
              </select>
            </div>
            
            <div>
              <label for="readingTextId" class="block text-sm font-medium text-gray-700 mb-1">Linked Reading Text</label>
              <select
                id="readingTextId"
                bind:value={formReadingTextId}
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">None</option>
                {#each readingTexts as text}
                  <option value={text.id}>{text.title} {#if text.groupId}(Group){/if}</option>
                {/each}
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
            <div>
              <label for="dueDate" class="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                id="dueDate"
                type="datetime-local"
                bind:value={formDueDate}
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label for="timerMinutes" class="block text-sm font-medium text-gray-700 mb-1">Timer (minutes)</label>
              <input
                id="timerMinutes"
                type="number"
                min="0"
                bind:value={formTimerMinutes}
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="Leave blank for no timer"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
            <div>
              <label for="minWords" class="block text-sm font-medium text-gray-700 mb-1">Min Words</label>
              <input id="minWords" type="number" bind:value={formMinWords} class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
               <label for="maxWords" class="block text-sm font-medium text-gray-700 mb-1">Max Words</label>
              <input id="maxWords" type="number" bind:value={formMaxWords} class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500" />
            </div>
          </div>
        </div>
      </div>
      
      <div class="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
        <Button variant="secondary" on:click={closeModal}>Cancel</Button>
        <Button variant="primary" on:click={handleSave} loading={modalLoading}>
          {modalMode === 'create' ? 'Create' : 'Save Changes'}
        </Button>
      </div>
    </div>
  </div>
{/if}
