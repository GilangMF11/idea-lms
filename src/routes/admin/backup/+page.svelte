<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.js';
  import Button from '$lib/components/Button.svelte';
  import Alert from '$lib/components/Alert.svelte';

  interface BackupFile {
    filename: string;
    sizeBytes: number;
    createdAt: string;
  }

  let backups: BackupFile[] = [];
  let loading = false;
  let generating = false;
  let operatingOn: string | null = null;
  let error = '';
  let success = '';

  // For restore confirmation
  let showRestoreModal = false;
  let backupToRestore: string | null = null;
  let restorePassword = '';

  onMount(async () => {
    authStore.init();
    
    if (!$authStore.isAuthenticated) {
      goto('/login');
      return;
    }
    
    if ($authStore.user?.role !== 'ADMIN') {
      goto('/dashboard');
      return;
    }

    await fetchBackups();
  });

  function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }

  async function fetchBackups() {
    loading = true;
    error = '';
    try {
      const token = $authStore.token;
      const res = await fetch('/api/admin/backups/full', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch backup history');
      const data = await res.json();
      backups = data.backups || [];
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function generateBackup() {
    generating = true;
    error = '';
    success = '';
    try {
      const token = $authStore.token;
      const res = await fetch('/api/admin/backups/full', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to generate master backup');
      
      const data = await res.json();
      success = 'New full backup generated successfully.';
      await fetchBackups();
    } catch (err: any) {
      error = err.message;
    } finally {
      generating = false;
    }
  }

  async function downloadBackup(filename: string) {
    operatingOn = filename;
    error = '';
    try {
      const token = $authStore.token;
      const response = await fetch(`/api/admin/backups/download?filename=${filename}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to download backup');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      error = err.message;
    } finally {
      operatingOn = null;
    }
  }

  async function deleteBackup(filename: string) {
    if (!confirm(`Are you sure you want to delete ${filename}? This cannot be undone.`)) return;
    
    operatingOn = filename;
    error = '';
    success = '';
    
    try {
      const token = $authStore.token;
      const res = await fetch(`/api/admin/backups/full?filename=${filename}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete backup file');
      
      success = 'Backup deleted successfully.';
      await fetchBackups();
    } catch (err: any) {
      error = err.message;
    } finally {
      operatingOn = null;
    }
  }

  function confirmRestore(filename: string) {
    backupToRestore = filename;
    showRestoreModal = true;
    restorePassword = '';
  }

  async function executeRestore() {
    if (!backupToRestore) return;
    
    const filename = backupToRestore;
    operatingOn = filename;
    showRestoreModal = false;
    error = '';
    success = '';
    
    try {
      const token = $authStore.token;
      const res = await fetch('/api/admin/backups/restore', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename, password: restorePassword })
      });
      
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to restore system backup');
      }
      
      success = 'System restored successfully! Refreshing data...';
      // Force reload to sync frontend with newly restored DB baseline
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      error = err.message;
    } finally {
      operatingOn = null;
      backupToRestore = null;
    }
  }
</script>

<svelte:head>
  <title>Master Backup Management - IDEA</title>
</svelte:head>

<!-- Restore Confirmation Modal -->
{#if showRestoreModal}
  <div class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" on:click={() => showRestoreModal = false}></div>
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">
            <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
              <svg class="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                WARNING: DESTRUCTIVE ACTION
              </h3>
              <div class="mt-2">
                <p class="text-sm text-gray-500 mb-2">
                  You are about to restore the system to <span class="font-bold text-gray-700">{backupToRestore}</span>.
                </p>
                <p class="text-sm text-red-600 font-medium mb-4">
                  This will OVERWRITE the current active database and ALL file attachments from the time of this backup. New data since this backup will be PERMANENTLY LOST.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <Button variant="danger" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm" on:click={executeRestore}>
            I Understand, Restore System
          </Button>
          <Button variant="secondary" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" on:click={() => showRestoreModal = false}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}

<div class="min-h-screen bg-gray-50 pb-12">
  <header class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center py-4">
        <a href="/dashboard" class="flex items-center text-gray-500 hover:text-gray-700 mr-4 transition-colors">
          <svg class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </a>
        <div class="flex items-center flex-1">
          <h1 class="text-xl font-bold text-gray-900 tracking-tight">Master Backup Management</h1>
        </div>
        <div>
          <Button variant="primary" on:click={generateBackup} loading={generating} disabled={generating || loading}>
            + Generate Full Backup Now
          </Button>
        </div>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {#if success}
      <div class="mb-6"><Alert type="success" message={success} /></div>
    {/if}
    {#if error}
      <div class="mb-6"><Alert type="danger" message={error} /></div>
    {/if}

    <div class="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2 mt-4">
      <div class="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
        <div>
          <h3 class="text-lg leading-6 font-semibold text-gray-900">Backup History Timeline</h3>
          <p class="mt-1 max-w-2xl text-sm text-gray-500">
            A secure repository of encrypted system snapshots. Contains database data and file uploads.
          </p>
        </div>
      </div>
      
      <div class="overflow-x-auto">
        {#if loading}
          <div class="flex justify-center p-8 text-gray-400">
            <svg class="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        {:else if backups.length === 0}
          <div class="text-center p-12 text-gray-500">
            <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p class="text-lg font-medium">No master backups found.</p>
            <p class="mt-1 text-sm">Automated backups operate at night, or you can trigger one manually above.</p>
          </div>
        {:else}
          <table class="min-w-full divide-y divide-gray-300">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Snapshot Name</th>
                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date Logged</th>
                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Size</th>
                <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right">
                  <span class="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              {#each backups as backup}
                <tr class="hover:bg-gray-50 transition-colors">
                  <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 flex items-center">
                    <svg class="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                    {backup.filename}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{formatDate(backup.createdAt)}</td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <span class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      {formatBytes(backup.sizeBytes)}
                    </span>
                  </td>
                  <td class="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <div class="flex justify-end gap-2">
                      <Button variant="outline" size="sm" on:click={() => downloadBackup(backup.filename)} disabled={operatingOn === backup.filename}>
                        Download
                      </Button>
                      <Button variant="danger" size="sm" on:click={() => confirmRestore(backup.filename)} disabled={operatingOn === backup.filename}>
                        Restore
                      </Button>
                      <button on:click={() => deleteBackup(backup.filename)} class="ml-2 text-gray-400 hover:text-red-600 transition" disabled={operatingOn === backup.filename} title="Delete">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </div>
    </div>
  </main>
</div>
