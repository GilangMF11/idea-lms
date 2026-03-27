<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.js';
  import Button from '$lib/components/Button.svelte';
  import Alert from '$lib/components/Alert.svelte';
  import { chatTypeOptions } from '$lib/config/chatTypes.js';

  let statistics: any[] = [];
  let loading = true;
  let error = '';

  // Modal State
  let showStudentDetailModal = false;
  let selectedStudent: any = null;
  let studentMessages: any[] = [];
  let loadingMessages = false;

  // Chart State
  let chartContainer: HTMLElement;
  let chart: any;

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      goto('/login');
      return;
    }

    // Check if user has appropriate role (ADMIN, TEACHER, or STUDENT)
    const userRole = $authStore.user?.role;
    if (!userRole || !['ADMIN', 'TEACHER', 'STUDENT'].includes(userRole)) {
      goto('/dashboard');
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
      await tick();
      if (statistics.length > 0 && !error) {
        renderChart();
      }
    }
  }

  function renderChart() {
    if (!chartContainer || statistics.length === 0) return;
    
    import('apexcharts').then(module => {
      const ApexCharts = module.default;
      
      const series = statistics.map(stat => ({
        name: `${stat.user.firstName} ${stat.user.lastName}`,
        data: chatTypeOptions.map(opt => ({
          x: opt.label,
          y: stat.stats[opt.value] || 0
        }))
      }));

      const options: import('apexcharts').ApexOptions = {
        series: series,
        chart: {
          height: Math.max(300, statistics.length * 40),
          type: 'heatmap',
          toolbar: { show: false },
          events: {
            dataPointSelection: (event: any, chartContext: any, config: any) => {
              const student = statistics[config.seriesIndex];
              if (student) openStudentDetail(student);
            }
          }
        },
        plotOptions: {
          heatmap: {
            shadeIntensity: 0.5,
            radius: 4,
            useFillColorAsStroke: false,
            colorScale: {
              ranges: [
                { from: 0, to: 0, name: 'None', color: '#f3f4f6' },
                { from: 1, to: 2, name: 'Low', color: '#dbeafe' },
                { from: 3, to: 5, name: 'Medium', color: '#60a5fa' },
                { from: 6, to: 1000, name: 'High', color: '#2563eb' }
              ]
            }
          }
        },
        dataLabels: { enabled: true },
        stroke: { width: 1 },
        title: { text: '' }
      };

      if (chart) chart.destroy();
      chart = new ApexCharts(chartContainer, options);
      chart.render();
    });
  }

  onDestroy(() => {
    if (chart) chart.destroy();
  });



  async function openStudentDetail(stat: any) {
    selectedStudent = stat;
    showStudentDetailModal = true;
    await loadStudentMessages(stat.user.id);
  }

  async function loadStudentMessages(userId: string) {
    try {
      loadingMessages = true;
      const classId = $page.params.id;
      const response = await fetch(`/api/chat/messages?classId=${classId}&userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        studentMessages = data.messages || [];
      } else {
        studentMessages = [];
      }
    } catch (err) {
      console.error('Error loading student messages:', err);
      studentMessages = [];
    } finally {
      loadingMessages = false;
    }
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
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-6 6" />
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

        <!-- Heatmap Chart -->
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex justify-between items-center mb-4">
            <div>
              <h3 class="text-lg font-medium text-gray-900">Discussion Heatmap</h3>
              <p class="text-sm text-gray-500 mt-1">Interactive heatmap showing how often each student uses various chat features. Click any cell to view detailed activity.</p>
            </div>
            <div class="flex items-center text-xs text-gray-500">
              <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0l-3 4-4m4 4l-3-4" />
              </svg>
              Click cell for details
            </div>
          </div>
          <div class="w-full flex justify-center">
            <div bind:this={chartContainer} class="w-full"></div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Student Detail Modal -->
{#if showStudentDetailModal && selectedStudent}
  {@const maxType = chatTypeOptions.reduce((max: any, opt: any) => {
    return (selectedStudent.stats[opt.value] || 0) > (selectedStudent.stats[max?.value] || 0) ? opt : max;
  }, null)}
  <div class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" on:click={() => showStudentDetailModal = false}></div>
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="w-full">
            <div class="flex justify-between items-start mb-6">
                <div>
                  <h3 class="text-xl leading-6 font-bold text-gray-900" id="modal-title">
                    {selectedStudent.user.firstName} {selectedStudent.user.lastName}'s Activity Map
                  </h3>
                  <p class="text-sm text-gray-500 mt-1">@{selectedStudent.user.username}</p>
                </div>
                <button
                  type="button"
                  class="text-gray-400 hover:text-gray-500 focus:outline-none"
                  on:click={() => showStudentDetailModal = false}
                >
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Activity Stats -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <!-- Total Messages Card -->
              <div class="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-6 flex flex-col items-center justify-center border border-blue-100 shadow-sm relative overflow-hidden">
                <div class="absolute -right-6 -top-6 w-32 h-32 bg-blue-200 rounded-full opacity-20"></div>
                <div class="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center text-white mb-4 shadow-md z-10">
                  <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div class="text-5xl font-extrabold text-blue-900 mb-2 z-10">{selectedStudent.total}</div>
                <div class="text-sm font-semibold text-blue-700 uppercase tracking-widest z-10 text-center">Total Messages</div>
              </div>

              <!-- Chat Types Stats List -->
              <div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col justify-center">
                <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-5 text-center">Message Distribution</h4>
                <div class="space-y-4">
                  {#each chatTypeOptions as option}
                    {@const count = selectedStudent.stats[option.value] || 0}
                    {@const percentage = selectedStudent.total > 0 ? (count / selectedStudent.total * 100).toFixed(1) : 0}
                    <div>
                      <div class="flex justify-between items-center mb-1.5">
                        <div class="flex items-center space-x-2">
                          <div class="w-2.5 h-2.5 rounded-full {option.color}"></div>
                          <span class="text-sm font-medium text-gray-700">{option.label}</span>
                        </div>
                        <div class="text-sm font-bold {option.textClass}">{count} <span class="text-xs text-gray-400 font-medium ml-1">({percentage}%)</span></div>
                      </div>
                      <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex">
                        <div class="h-full rounded-full {option.color} transition-all duration-500" style="width: {percentage}%"></div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>

              <!-- Most Active Type Card -->
              <div class="bg-white border border-gray-100 rounded-2xl p-6 flex flex-col items-center justify-center shadow-sm">
                <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-6 text-center w-full">Most Active Category</h4>
                {#if maxType && selectedStudent.total > 0}
                  <div class="relative flex items-center justify-center w-20 h-20 rounded-full {maxType.badgeBg} mb-5">
                    <div class="absolute inset-0 rounded-full {maxType.color} opacity-20 animate-pulse"></div>
                    <svg class="w-10 h-10 {maxType.textClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <div class="text-xl font-bold {maxType.textClass} text-center mb-1">{maxType.label}</div>
                  <div class="text-xs font-medium text-gray-400 text-center uppercase tracking-wide">Top Contribution</div>
                {:else}
                  <div class="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-5 border border-gray-100">
                    <svg class="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div class="text-xl font-bold text-gray-400 text-center mb-1">No Activity</div>
                  <div class="text-xs font-medium text-gray-400 text-center uppercase tracking-wide">Pending Participation</div>
                {/if}
              </div>
            </div>

          <!-- Recent Messages -->
          <div>
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-lg font-semibold text-gray-900">Recent Discussion Activity</h4>
              <div class="text-sm text-gray-500">Last 10 messages</div>
            </div>
            {#if loadingMessages}
              <div class="flex justify-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            {:else if studentMessages.length === 0}
              <div class="text-center py-8 text-gray-500">
                <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p>No discussion activity recorded yet</p>
              </div>
            {:else}
              <div class="space-y-3 max-h-64 overflow-y-auto">
                {#each studentMessages.slice(0, 10) as message}
                  {@const chatTypeOption = chatTypeOptions.find(opt => opt.value === message.chatType)}
                  <div class="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-start mb-2">
                      <div class="flex items-center">
                        <div class="w-2 h-2 rounded {chatTypeOption?.color || 'bg-gray-400'} mr-2"></div>
                        <span class="text-sm font-medium text-gray-900">
                          {chatTypeOption?.label || 'Discussion'}
                        </span>
                      </div>
                      <span class="text-xs text-gray-500">
                        {new Date(message.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p class="text-sm text-gray-700">{message.content || 'No content'}</p>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            on:click={() => showStudentDetailModal = false}
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
