<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.js';
  import Button from '$lib/components/Button.svelte';
  import Alert from '$lib/components/Alert.svelte';
  import { chatTypeLabels, chatTypeColors, chatTypeOptions } from '$lib/config/chatTypes';

  let statistics: any[] = [];
  let loading = true;
  let error = '';

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      goto('/login');
      return;
    }

    loadStatistics();
  });

  async function loadStatistics() {
    try {
      loading = true;

      const classId = $page.params.id;
      const response = await fetch(`/api/chat/statistics?classId=${classId}`, {
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        statistics = data.statistics || [];
      } else {
        error = 'Failed to load chat statistics';
      }
    } catch (err) {
      console.error('Error loading statistics:', err);
      error = 'Failed to load chat statistics';
    } finally {
      loading = false;
    }
  }

  function getHeatmapColor(count: number, maxCount: number): string {
    if (count === 0) return 'bg-gray-100';
    const intensity = count / maxCount;
    if (intensity < 0.25) return 'bg-blue-100';
    if (intensity < 0.5) return 'bg-blue-200';
    if (intensity < 0.75) return 'bg-blue-400';
    return 'bg-blue-600';
  }

  function getTextColor(count: number, maxCount: number): string {
    const intensity = count / maxCount;
    if (intensity < 0.5) return 'text-gray-800';
    return 'text-white';
  }

  function getMaxCount(): number {
    let max = 0;
    for (const stat of statistics) {
      for (const type of chatTypeOptions) {
        max = Math.max(max, stat.stats[type.value] || 0);
      }
    }
    return max;
  }
</script>

<svelte:head>
  <title>Chat Statistics - IDEA</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white shadow">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center">
          <Button variant="secondary" size="sm" on:click={() => goto(`/classes/${$page.params.id}`)} class="mr-4">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Button>
          <h1 class="text-xl font-semibold text-gray-900">Discussion Statistics</h1>
        </div>
      </div>
    </div>
  </div>

  <!-- Content -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {#if loading}
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p class="mt-4 text-gray-600">Loading statistics...</p>
        </div>
      </div>
    {:else if error}
      <div class="max-w-md mx-auto">
        <Alert type="error" message={error} />
        <div class="mt-4 text-center">
          <Button variant="primary" on:click={loadStatistics}>Retry</Button>
        </div>
      </div>
    {:else if statistics.length === 0}
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No discussion data</h3>
        <p class="mt-1 text-sm text-gray-500">Students haven't participated in any annotation discussions yet.</p>
      </div>
    {:else}
      <div class="space-y-6">
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-500">Total Students</p>
                <p class="text-2xl font-semibold text-gray-900">{statistics.length}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-500">Total Messages</p>
                <p class="text-2xl font-semibold text-gray-900">{statistics.reduce((sum, s) => sum + s.total, 0)}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-500">Avg per Student</p>
                <p class="text-2xl font-semibold text-gray-900">{(statistics.reduce((sum, s) => sum + s.total, 0) / statistics.length).toFixed(1)}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                  <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-500">Most Active</p>
                <p class="text-2xl font-semibold text-gray-900">{statistics[0]?.user?.firstName || '-'} {statistics[0]?.user?.lastName?.charAt(0) || ''}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Legend -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Chat Types</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            {#each chatTypeOptions as option}
              <div class="flex items-center">
                <div class="w-4 h-4 rounded {option.color} mr-2"></div>
                <span class="text-sm text-gray-700">{option.label}</span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Heatmap -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">Discussion Heatmap</h3>
            <p class="text-sm text-gray-500 mt-1">Color intensity represents the number of messages</p>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                    Student
                  </th>
                  {#each chatTypeOptions as option}
                    <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {option.label}
                    </th>
                  {/each}
                  <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each statistics as stat}
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap sticky left-0 bg-white">
                      <div class="text-sm font-medium text-gray-900">
                        {stat.user.firstName} {stat.user.lastName}
                      </div>
                      <div class="text-sm text-gray-500">
                        @{stat.user.username}
                      </div>
                    </td>
                    {#each chatTypeOptions as option}
                      {@const count = stat.stats[option.value] || 0}
                      {@const maxCount = getMaxCount()}
                      <td class="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          class="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium min-w-[60px] {getHeatmapColor(count, maxCount)} {getTextColor(count, maxCount)}"
                        >
                          {count}
                        </span>
                      </td>
                    {/each}
                    <td class="px-6 py-4 whitespace-nowrap text-center">
                      <span class="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 min-w-[60px]">
                        {stat.total}
                      </span>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Heatmap Scale -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-sm font-medium text-gray-700 mb-3">Heatmap Scale</h3>
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-500">0</span>
            <div class="flex-1 mx-4 h-4 rounded flex">
              <div class="bg-gray-100 flex-1"></div>
              <div class="bg-blue-100 flex-1"></div>
              <div class="bg-blue-200 flex-1"></div>
              <div class="bg-blue-400 flex-1"></div>
              <div class="bg-blue-600 flex-1"></div>
            </div>
            <span class="text-xs text-gray-500">{getMaxCount()}+</span>
          </div>
          <div class="flex items-center justify-between mt-2">
            <span class="text-xs text-gray-500">Low</span>
            <span class="text-xs text-gray-500">Medium</span>
            <span class="text-xs text-gray-500">High</span>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
