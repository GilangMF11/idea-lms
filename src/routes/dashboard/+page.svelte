<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { authStore } from '$lib/stores/auth.js';
  import Button from '$lib/components/Button.svelte';
  
  let isLoggingOut = false;
  let showUserMenu = false;
  let showLogoutModal = false;
  let classes: any[] = [];
  let exercises: any[] = [];
  let readingTexts: any[] = [];
  let totalUsers = 0;
  let loading = true;
  let error = '';
  let classSearchQuery = '';

  $: filteredClasses = classSearchQuery.trim() === ''
    ? classes
    : classes.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(classSearchQuery.trim().toLowerCase()) ||
          (c.description || '').toLowerCase().includes(classSearchQuery.trim().toLowerCase()) ||
          (c.code || '').toLowerCase().includes(classSearchQuery.trim().toLowerCase())
      );
  $: displayedClasses = filteredClasses.slice(0, 3);
  $: hasMoreClasses = filteredClasses.length > 3;
  
  onMount(async () => {
    authStore.init();
    
    // Sync auth from cookie if OAuth success
    if ($page.url.searchParams.get('oauth_success') === 'true') {
      try {
        const response = await fetch('/api/auth/sync', {
          credentials: 'include', // Important: include cookies
        });
        if (response.ok) {
          const data = await response.json();
          if (data.user && data.token) {
            // Update auth store
            if (typeof window !== 'undefined') {
              localStorage.setItem('auth_token', data.token);
              localStorage.setItem('auth_user', JSON.stringify(data.user));
            }
            // Re-init auth store to load from localStorage
            authStore.init();
            // Check if profile is complete
            if (!data.profileComplete) {
              goto('/complete-profile', { replaceState: true });
              return;
            }
            // Profile complete: load dashboard data directly to avoid stuck loading
            await loadDashboardData();
            // Optionally clean up the URL (remove oauth_success) without re-running onMount
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.delete('oauth_success');
              window.history.replaceState({}, '', url.toString());
            }
            return; // Exit early to prevent redirect to login / duplicate loading
          }
        } else {
          console.error('Auth sync failed:', await response.text());
        }
      } catch (err) {
        console.error('Auth sync error:', err);
      }
    }
    
    // Redirect to login if not authenticated
    if (!$authStore.isAuthenticated) {
      goto('/login');
      return;
    }

    // Check if profile is complete before loading dashboard
    await checkProfileComplete();
    
    // Load dashboard data based on user role
    loadDashboardData();
    
    // Close dropdown when clicking outside
    function handleClickOutside(event: Event) {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu')) {
        showUserMenu = false;
      }
    }
    
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });

  async function checkProfileComplete() {
    try {
      const token = $authStore.token;
      if (!token) return;

      const response = await fetch('/api/auth/sync', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Profile complete check in dashboard:', {
          profileComplete: data.profileComplete,
          userId: data.user?.id,
        });
        
        if (!data.profileComplete) {
          console.log('Profile not complete, redirecting to complete-profile');
          goto('/complete-profile');
          return;
        }
      }
    } catch (err) {
      console.error('Error checking profile:', err);
    }
  }

  async function loadDashboardData() {
    try {
      const token = $authStore.token;
      
      // If user is not yet loaded, avoid getting stuck in loading state
      if (!$authStore.user) {
        loading = false;
        return;
      }

      loading = true;
      
      // Load classes
      const classesResponse = await fetch('/api/classes', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (classesResponse.ok) {
        const classesData = await classesResponse.json();
        classes = classesData.classes || [];
        console.log('Loaded classes:', classes); // Debug log
      } else {
        console.error('Failed to load classes:', await classesResponse.text());
      }
      
      // Load exercises
      // For students, fetch all exercises from all enrolled classes
      // For teachers/admins, fetch from first class or all
      if ($authStore.user?.role === 'STUDENT') {
        // Fetch all exercises for student (from all enrolled classes)
        const exercisesResponse = await fetch('/api/exercises', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (exercisesResponse.ok) {
          const exercisesData = await exercisesResponse.json();
          exercises = exercisesData.exercises || [];
        }
      } else if (classes.length > 0) {
        // For teachers/admins, fetch from first class
        const exercisesResponse = await fetch(`/api/exercises?classId=${classes[0].id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (exercisesResponse.ok) {
          const exercisesData = await exercisesResponse.json();
          exercises = exercisesData.exercises || [];
        }
      }
      
      // Load reading texts for first class if available
      if (classes.length > 0) {
        const readingTextsResponse = await fetch(`/api/reading-texts?classId=${classes[0].id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (readingTextsResponse.ok) {
          const readingTextsData = await readingTextsResponse.json();
          readingTexts = readingTextsData.readingTexts || [];
        }
      }
      
      // Load total users for admin
      if ($authStore.user?.role === 'ADMIN') {
        const usersResponse = await fetch('/api/users?limit=1', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          totalUsers = usersData.total || 0;
        }
      }
      
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      error = 'Failed to load dashboard data';
    } finally {
      loading = false;
    }
  }
  
  function handleLogout() {
    showLogoutModal = true;
    showUserMenu = false;
  }

  function confirmLogout() {
    isLoggingOut = true;
    showLogoutModal = false;
    
    // Clear auth state
    authStore.logout();
    
    // Redirect to login after brief delay
    setTimeout(() => {
      goto('/login');
    }, 500);
  }

  function cancelLogout() {
    showLogoutModal = false;
  }
</script>

<svelte:head>
  <title>Dashboard - IDEA</title>
</svelte:head>

{#if $authStore.isLoading}
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
      <p class="text-sm text-gray-500 mt-4">Loading...</p>
    </div>
  </div>
{:else if isLoggingOut}
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
      <p class="text-sm text-gray-500 mt-4">Logging out...</p>
    </div>
  </div>
{:else if $authStore.isAuthenticated && $authStore.user}
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between py-3 sm:py-4">
          <div class="flex items-center min-w-0 flex-1">
            <div class="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
              <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 class="text-lg sm:text-xl font-semibold text-gray-900 truncate">IDEA</h1>
          </div>
          
            <!-- User Menu -->
          <div class="relative user-menu flex-shrink-0">
              <button
                type="button"
              class="flex items-center space-x-2 sm:space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 p-1 sm:p-0"
                on:click={() => showUserMenu = !showUserMenu}
              >
              <!-- User info - hidden on mobile, visible on sm and up -->
              <div class="hidden sm:block text-right">
                <p class="text-sm font-medium text-gray-900 truncate max-w-[120px]">{$authStore.user.firstName} {$authStore.user.lastName}</p>
                  <p class="text-xs text-gray-500 capitalize">{$authStore.user.role.toLowerCase()}</p>
                </div>
              <!-- Avatar -->
              <div class="h-8 w-8 sm:h-9 sm:w-9 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span class="text-xs sm:text-sm font-medium text-white">
                    {$authStore.user.firstName.charAt(0)}{$authStore.user.lastName.charAt(0)}
                  </span>
                </div>
              <!-- Dropdown icon - hidden on mobile, visible on sm and up -->
              <svg class="hidden sm:block h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <!-- Dropdown Menu -->
              {#if showUserMenu}
              <div class="absolute right-0 mt-2 w-56 sm:w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                  <div class="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                  <p class="font-medium truncate">{$authStore.user.firstName} {$authStore.user.lastName}</p>
                  <p class="text-xs text-gray-500 truncate">{$authStore.user.email}</p>
                  <p class="text-xs text-gray-500 capitalize mt-1 sm:hidden">{$authStore.user.role.toLowerCase()}</p>
                  </div>
                  <a href="/profile" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Profile
                  </a>
                  <a href="/settings" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Settings
                  </a>
                  <button
                    type="button"
                    class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    on:click={handleLogout}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? 'Logging out...' : 'Logout'}
                  </button>
                </div>
              {/if}
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Welcome Section -->
      <div class="mb-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">
          Welcome back, {$authStore.user?.firstName || 'User'}!
        </h2>
        <p class="text-gray-600 capitalize">
          {#if $authStore.user?.role === 'STUDENT'}
            Here's your learning dashboard with exit tickets and class activities.
          {:else if $authStore.user?.role === 'TEACHER'}
            Manage your classes, create content, and track student progress.
          {:else if $authStore.user?.role === 'ADMIN'}
            System overview and administrative tools.
          {/if}
        </p>
      </div>

      <!-- Loading State -->
      {#if loading}
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span class="ml-2 text-gray-600">Loading dashboard...</span>
        </div>
      {:else if error}
        <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Error loading dashboard</h3>
              <div class="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      {:else}
        <!-- Dashboard Content Based on Role -->
        {#if $authStore.user?.role === 'STUDENT'}
          {@render studentDashboard()}
        {:else if $authStore.user?.role === 'TEACHER'}
          {@render teacherDashboard()}
        {:else if $authStore.user?.role === 'ADMIN'}
          {@render adminDashboard()}
        {/if}
      {/if}

    </main>
  </div>
{/if}

<!-- Logout Confirmation Modal -->
{#if showLogoutModal && $authStore.user}
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
    on:click={cancelLogout}
    on:keydown={(e) => e.key === 'Escape' && cancelLogout()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div 
      class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all" 
      role="dialog"
      tabindex="0"
    >
      <div class="p-6">
        <!-- Modal Header -->
        <div class="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
          <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
          </svg>
        </div>
        
        <!-- Modal Content -->
        <div class="text-center">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Logout Confirmation</h3>
          <p class="text-sm text-gray-600 mb-6">
            Are you sure you want to logout? You will need to sign in again to access your account.
          </p>
          
          <!-- User Info -->
          <div class="bg-gray-50 rounded-lg p-4 mb-6">
            <div class="flex items-center justify-center space-x-3">
              <div class="h-10 w-10 bg-primary-600 rounded-full flex items-center justify-center">
                <span class="text-sm font-medium text-white">
                  {$authStore.user?.firstName?.charAt(0) || ''}{$authStore.user?.lastName?.charAt(0) || ''}
                </span>
              </div>
              <div class="text-left">
                <p class="text-sm font-medium text-gray-900">{$authStore.user?.firstName || ''} {$authStore.user?.lastName || ''}</p>
                <p class="text-xs text-gray-500">{$authStore.user?.email || ''}</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Modal Actions -->
        <div class="flex space-x-3">
          <button
            type="button"
            class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            on:click={cancelLogout}
            disabled={isLoggingOut}
          >
            Cancel
          </button>
          <button
            type="button"
            class="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            on:click={confirmLogout}
            disabled={isLoggingOut}
          >
{#if isLoggingOut}
              <div class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging out...
              </div>
            {:else}
              Logout
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Student Dashboard -->
{#snippet studentDashboard()}
  <!-- Stats Cards -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <div class="card p-6">
      <div class="flex items-center">
        <div class="p-2 bg-primary-100 rounded-lg">
          <svg class="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">My Classes</p>
          <p class="text-2xl font-semibold text-gray-900">{classes.length}</p>
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
          <p class="text-sm font-medium text-gray-600">Exit Tickets</p>
          <p class="text-2xl font-semibold text-gray-900">{exercises.length}</p>
        </div>
      </div>
    </div>

    <div class="card p-6">
      <div class="flex items-center">
        <div class="p-2 bg-purple-100 rounded-lg">
          <svg class="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">Messages</p>
          <p class="text-2xl font-semibold text-gray-900">0</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Content Grid -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <!-- My Classes (Student) -->
    <div class="card p-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h3 class="text-lg font-semibold text-gray-900">My Classes</h3>
        {#if hasMoreClasses}
          <Button variant="secondary" size="sm" on:click={() => goto('/my-classes')}>
            View all classes
          </Button>
        {/if}
      </div>
      {#if classes.length > 0}
        <div class="mb-4">
          <label for="student-class-search" class="sr-only">Search classes</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              id="student-class-search"
              type="text"
              bind:value={classSearchQuery}
              placeholder="Search classes..."
              class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {#each displayedClasses as classItem (classItem.id)}
            <button
              type="button"
              class="block w-full text-left overflow-hidden rounded-xl border border-gray-200 bg-white hover:border-primary-300 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              on:click={() => classItem?.id && goto(`/classes/${classItem.id}`)}
            >
              <div class="h-28 bg-primary-100 flex items-center justify-center">
                <svg class="w-12 h-12 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div class="p-5 text-center">
                <p class="font-semibold text-gray-900 truncate w-full">{classItem.name || 'Unnamed Class'}</p>
                <p class="text-sm text-gray-500 mt-1 line-clamp-2">{classItem.description || 'No description'}</p>
                <span class="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">Active</span>
              </div>
            </button>
          {/each}
        </div>
        {#if filteredClasses.length === 0}
          <p class="text-sm text-gray-500 mt-2">No classes match your search.</p>
        {/if}
      {:else}
        <div class="text-center py-8">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No classes yet</h3>
          <p class="mt-1 text-sm text-gray-500">Join a class to get started with your learning journey.</p>
          <div class="mt-6">
            <Button variant="primary" size="sm" on:click={() => goto('/classes/browse')}>
              Browse Classes
            </Button>
          </div>
        </div>
      {/if}
    </div>

    <!-- Recent Exit Tickets -->
    <div class="card p-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h3 class="text-lg font-semibold text-gray-900">Recent Exit Tickets</h3>
        {#if exercises.length > 3}
          <Button variant="secondary" size="sm" on:click={() => goto('/exit-tickets')}>
            Show all
          </Button>
        {/if}
      </div>
      {#if exercises.length > 0}
        <div class="space-y-3">
          {#each exercises.slice(0, 3) as exercise}
            <button
              type="button"
              class="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
              on:click={() => goto(`/submissions/${exercise.id}`)}
            >
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900">{exercise.title}</p>
                <p class="text-xs text-gray-500">{exercise.description || 'No description'}</p>
              </div>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 ml-3">
                Pending
              </span>
            </button>
          {/each}
        </div>
      {:else}
        <div class="text-center py-8">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No exit tickets yet</h3>
          <p class="mt-1 text-sm text-gray-500">Exit tickets will appear here when your teachers post them.</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Quick Actions -->
  <div class="mt-8">
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button variant="primary" size="md" fullWidth on:click={() => goto('/classes/browse')}>
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Browse Classes
        </Button>
        <Button variant="secondary" size="md" fullWidth on:click={() => goto('/exit-tickets')}>
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          View Exit Tickets
        </Button>
        <Button variant="secondary" size="md" fullWidth on:click={() => goto('/profile')}>
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          View Profile
        </Button>
      </div>
    </div>
  </div>
{/snippet}

<!-- Teacher Dashboard -->
{#snippet teacherDashboard()}
  <!-- Stats Cards -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <div class="card p-6">
      <div class="flex items-center">
        <div class="p-2 bg-primary-100 rounded-lg">
          <svg class="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">My Classes</p>
          <p class="text-2xl font-semibold text-gray-900">{classes.length}</p>
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
          <p class="text-sm font-medium text-gray-600">Exit Tickets</p>
          <p class="text-2xl font-semibold text-gray-900">{exercises.length}</p>
        </div>
      </div>
    </div>

    <div class="card p-6">
      <div class="flex items-center">
        <div class="p-2 bg-purple-100 rounded-lg">
          <svg class="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">Total Students</p>
          <p class="text-2xl font-semibold text-gray-900">{classes.reduce((total, cls) => total + (cls._count?.students || 0), 0)}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Content Grid -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <!-- My Classes (Teacher) -->
    <div class="card p-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h3 class="text-lg font-semibold text-gray-900">My Classes</h3>
        {#if hasMoreClasses}
          <Button variant="secondary" size="sm" on:click={() => goto('/my-classes')}>
            View all classes
          </Button>
        {/if}
      </div>
      {#if classes.length > 0}
        <div class="mb-4">
          <label for="teacher-class-search" class="sr-only">Search classes</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              id="teacher-class-search"
              type="text"
              bind:value={classSearchQuery}
              placeholder="Search classes..."
              class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {#each displayedClasses as classItem (classItem.id)}
            <button
              type="button"
              class="block w-full text-left overflow-hidden rounded-xl border border-gray-200 bg-white hover:border-primary-300 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 cursor-pointer"
              on:click={() => goto(`/classes/${classItem.id}/manage`)}
            >
              <div class="h-28 bg-primary-100 flex items-center justify-center">
                <svg class="w-12 h-12 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div class="p-5 text-center">
                <p class="font-semibold text-gray-900 truncate w-full">{classItem.name || 'Unnamed Class'}</p>
                <p class="text-sm text-gray-500 mt-1">{classItem._count?.students ?? 0} students</p>
              </div>
            </button>
          {/each}
        </div>
        {#if filteredClasses.length === 0}
          <p class="text-sm text-gray-500 mt-2">No classes match your search.</p>
        {/if}
      {:else}
        <div class="text-center py-8">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No classes yet</h3>
          <p class="mt-1 text-sm text-gray-500">Create your first class to start teaching.</p>
          <div class="mt-6">
            <Button variant="primary" size="sm" on:click={() => goto('/classes/create')}>
              Create Class
            </Button>
          </div>
        </div>
      {/if}
    </div>

    <!-- Recent Activity -->
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div class="space-y-4">
        <div class="flex items-center text-sm text-gray-500">
          <div class="w-2 h-2 bg-gray-300 rounded-full mr-3"></div>
          No recent activity
        </div>
      </div>
    </div>
  </div>

  <!-- Quick Actions -->
  <div class="mt-8">
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Button variant="primary" size="md" fullWidth on:click={() => goto('/classes/create')}>
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Class
        </Button>
        <Button variant="secondary" size="md" fullWidth on:click={() => goto('/reading-texts/create')}>
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Add Reading Text
        </Button>
        <Button variant="secondary" size="md" fullWidth on:click={() => goto('/exercises/create')}>
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Create Exit Ticket
        </Button>
        <Button variant="secondary" size="md" fullWidth on:click={() => goto('/analytics')}>
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          View Analytics
        </Button>
      </div>
    </div>
  </div>
{/snippet}

<!-- Admin Dashboard -->
{#snippet adminDashboard()}
  <!-- Stats Cards -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <div class="card p-6">
      <div class="flex items-center">
        <div class="p-2 bg-primary-100 rounded-lg">
          <svg class="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">Total Classes</p>
          <p class="text-2xl font-semibold text-gray-900">{classes.length}</p>
        </div>
      </div>
    </div>

    <div class="card p-6">
      <div class="flex items-center">
        <div class="p-2 bg-green-100 rounded-lg">
          <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">Total Users</p>
          <p class="text-2xl font-semibold text-gray-900">{loading ? '-' : totalUsers}</p>
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
          <p class="text-sm font-medium text-gray-600">Total Exit Tickets</p>
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
          <p class="text-sm font-medium text-gray-600">System Health</p>
          <p class="text-2xl font-semibold text-gray-900">Good</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Content Grid -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <!-- System Overview -->
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">System Overview</h3>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">Database Status</span>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Connected
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">API Status</span>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Running
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">Last Backup</span>
          <span class="text-sm text-gray-900">Never</span>
        </div>
      </div>
    </div>

    <!-- All Classes -->
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">All Classes</h3>
      {#if classes.length > 0}
        <div class="space-y-3">
          {#each classes.slice(0, 5) as classItem}
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p class="text-sm font-medium text-gray-900">{classItem.name}</p>
                <p class="text-xs text-gray-500">
                  Teacher: {classItem.teacher?.firstName} {classItem.teacher?.lastName} • 
                  Students: {classItem._count?.students || 0}
                </p>
              </div>
              <Button variant="primary" size="sm" on:click={() => goto(`/classes/${classItem.id}`)}>
                View
              </Button>
            </div>
          {/each}
          {#if classes.length > 5}
            <div class="text-center">
              <Button variant="secondary" size="sm" on:click={() => goto('/classes')}>
                View All Classes
              </Button>
            </div>
          {/if}
        </div>
      {:else}
        <div class="text-center py-8">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No classes found</h3>
          <p class="mt-1 text-sm text-gray-500">No classes have been created yet.</p>
        </div>
      {/if}
    </div>

    <!-- Recent Activity -->
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div class="space-y-4">
        <div class="flex items-center text-sm text-gray-500">
          <div class="w-2 h-2 bg-gray-300 rounded-full mr-3"></div>
          No recent activity
        </div>
      </div>
    </div>
  </div>

  <!-- Quick Actions -->
  <div class="mt-8">
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Administrative Actions</h3>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Button variant="primary" size="md" fullWidth on:click={() => goto('/admin/users')}>
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Manage Users
        </Button>
        <Button variant="secondary" size="md" fullWidth>
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          View Analytics
        </Button>
        <Button variant="secondary" size="md" fullWidth>
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Backup System
        </Button>
        <Button variant="secondary" size="md" fullWidth>
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          System Settings
        </Button>
      </div>
    </div>
  </div>
{/snippet}
