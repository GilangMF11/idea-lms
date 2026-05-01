<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.js';
  import Button from '$lib/components/Button.svelte';

  let logs: any[] = [];
  let loading = true;
  let error = '';

  // Pagination & Filter State
  let currentPage = 1;
  let itemsPerPage = 50; // Show more logs per page
  let paginationInfo = { total: 0, page: 1, limit: 50, totalPages: 1 };
  let filterLevel = '';
  let searchQuery = '';
  let searchInput = '';
  let searchTimeout: any;

  // Detail Modal State
  let selectedLog: any = null;
  let showModal = false;

  onMount(() => {
    authStore.init();

    if (!$authStore.isAuthenticated || $authStore.user?.role !== 'ADMIN') {
      goto('/dashboard');
      return;
    }

    loadLogs();
  });

  async function loadLogs(page = 1) {
    try {
      loading = true;
      currentPage = page;

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchQuery,
        level: filterLevel
      });

      const response = await fetch(`/api/admin/logs?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        logs = data.logs || [];
        if (data.pagination) {
          paginationInfo = data.pagination;
        }
      } else {
        error = 'Failed to load system logs';
      }
    } catch (err) {
      console.error('Error loading logs:', err);
      error = 'Failed to load system logs';
    } finally {
      loading = false;
    }
  }

  function handleSearchInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchQuery = searchInput;
      loadLogs(1);
    }, 500);
  }

  function changePage(newPage: number) {
    if (newPage >= 1 && newPage <= paginationInfo.totalPages) {
      loadLogs(newPage);
    }
  }

  function goBack() {
    goto('/dashboard');
  }

  function getLevelColor(level: string) {
    switch(level.toLowerCase()) {
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'warn': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'debug': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  function formatString(str: string, maxLength: number = 80) {
    if (!str) return '';
    if (str.length > maxLength) return str.substring(0, maxLength) + '...';
    return str;
  }

  function viewDetails(log: any) {
    selectedLog = log;
    showModal = true;
  }

</script>

<svelte:head>
  <title>System Logger - IDEA</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 pb-10">
  <!-- Header -->
  <header class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between py-4">
        <div class="flex items-center">
          <Button variant="secondary" size="sm" on:click={goBack} class="mr-4">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Button>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">System Logger</h1>
            <p class="text-sm text-gray-600">Audit trail of background tasks and exceptions</p>
          </div>
        </div>
        <Button variant="primary" size="sm" on:click={() => loadLogs(1)}>
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </Button>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
    <div class="bg-white shadow rounded-lg overflow-hidden flex flex-col">
      <!-- Toolbar -->
      <div class="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div class="w-full sm:w-1/3">
           <input
             type="text"
             bind:value={searchInput}
             on:input={handleSearchInput}
             placeholder="Search messages or context..."
             class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
           />
        </div>
        <div class="w-full sm:w-auto flex space-x-2">
           <select
             bind:value={filterLevel}
             on:change={() => loadLogs(1)}
             class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border bg-white"
           >
             <option value="">All Levels</option>
             <option value="error">ERROR</option>
             <option value="warn">WARN</option>
             <option value="info">INFO</option>
             <option value="debug">DEBUG</option>
           </select>
        </div>
      </div>

      {#if loading && logs.length === 0}
        <div class="p-12 text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p class="mt-4 text-gray-500">Loading logs...</p>
        </div>
      {:else if error}
         <div class="p-12 text-center text-red-600">
            <p>{error}</p>
         </div>
      {:else if logs.length > 0}
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Timestamp</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Level</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Action</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each logs as log}
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border ${getLevelColor(log.level)}`}>
                      {log.level.toUpperCase()}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-900">
                     <span class="font-medium text-gray-800">{log.message}</span>
                     {#if log.context || log.error}
                       <div class="text-gray-400 text-xs mt-1 truncate">
                          {formatString(log.error || log.context, 100)}
                       </div>
                     {/if}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button class="text-primary-600 hover:text-primary-900" on:click={() => viewDetails(log)}>View</button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        
        <!-- Pagination -->
        <div class="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-gray-700">
                Showing <span class="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span class="font-medium">{Math.min(currentPage * itemsPerPage, paginationInfo.total)}</span> of <span class="font-medium">{paginationInfo.total}</span> logs
              </p>
            </div>
            <div>
              <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button disabled={currentPage === 1} on:click={() => changePage(currentPage - 1)} class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                  Previous
                </button>
                <button disabled={currentPage === paginationInfo.totalPages} on:click={() => changePage(currentPage + 1)} class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>

      {:else}
        <div class="p-12 text-center text-gray-500">
          <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No system logs found.</p>
        </div>
      {/if}
    </div>
  </main>
</div>

<!-- Details Modal -->
{#if showModal && selectedLog}
  <div class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" on:click={() => showModal = false}></div>
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      
      <div class="inline-block align-bottom bg-white rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border-t-8 {selectedLog.level === 'error' ? 'border-red-500' : 'border-gray-800'} overflow-hidden">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[70vh] overflow-y-auto">
          <div class="sm:flex sm:items-start">
            <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 class="text-lg leading-6 font-bold text-gray-900 mb-2" id="modal-title">
                <span class={`px-2 py-1 mr-2 text-xs font-semibold rounded border ${getLevelColor(selectedLog.level)}`}>
                  {selectedLog.level.toUpperCase()}
                </span>
                {selectedLog.message}
              </h3>
              <p class="text-sm text-gray-500 mb-6 font-mono">{new Date(selectedLog.createdAt).toLocaleString()} | ID: {selectedLog.id}</p>
              
              <div class="space-y-4">
                {#if selectedLog.error}
                  <div>
                    <h4 class="text-sm font-semibold text-gray-700 bg-gray-100 py-1 px-2 rounded-t border border-gray-200">Error Stack Trace</h4>
                    <pre class="bg-gray-800 text-red-400 p-4 rounded-b text-xs overflow-x-auto whitespace-pre-wrap">{selectedLog.error}</pre>
                  </div>
                {/if}
                
                {#if selectedLog.context}
                  {@const contextObj = JSON.parse(selectedLog.context)}
                  <div>
                    <h4 class="text-sm font-semibold text-gray-700 bg-gray-100 py-1 px-2 rounded-t border border-gray-200">Context Body (JSON)</h4>
                    <pre class="bg-gray-800 text-green-400 p-4 rounded-b text-xs overflow-x-auto whitespace-pre-wrap">{JSON.stringify(contextObj, null, 2)}</pre>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <Button variant="secondary" on:click={() => showModal = false}>
            Close
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}
