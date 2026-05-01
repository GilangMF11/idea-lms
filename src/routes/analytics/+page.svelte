<script lang="ts">
  import { onMount, tick, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.js';
  import Button from '$lib/components/Button.svelte';
  import Alert from '$lib/components/Alert.svelte';

  let analytics: any = null;
  let loading = true;
  let error = '';

  let activityChartNode: HTMLElement;
  let engagementChartNode: HTMLElement;
  let activityChart: any;
  let engagementChart: any;

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      goto('/login');
      return;
    }
    
    loadAnalytics();
  });

  async function loadAnalytics() {
    try {
      loading = true;
      
      const type = $authStore.user?.role === 'ADMIN' ? 'system' : ($authStore.user?.role === 'TEACHER' ? 'teacher' : 'user');
      const response = await fetch(`/api/analytics?type=${type}`, {
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        analytics = data.analytics;
      } else {
        error = 'Failed to load analytics data';
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
      error = 'Failed to load analytics data';
    } finally {
      loading = false;
      await tick();
      if (analytics) {
        renderCharts();
      }
    }
  }

  function renderCharts() {
    if (!analytics) return;

    import('apexcharts').then(module => {
      const ApexCharts = module.default;

      if (activityChartNode) {
        const last7Days = Array.from({length: 7}).map((_, i) => {
           const d = new Date();
           d.setDate(d.getDate() - (6 - i));
           return d.toLocaleDateString('en-US', {weekday: 'short'});
        });
        const activityOptions: import('apexcharts').ApexOptions = {
          series: [{
            name: $authStore.user?.role === 'ADMIN' ? 'New Users & Classes' : 'New Contents',
            data: analytics.activityTrends || [0, 0, 0, 0, 0, 0, 0]
          }],
          chart: { type: 'area', height: 250, toolbar: { show: false } },
          stroke: { curve: 'smooth', width: 2 },
          xaxis: { categories: last7Days },
          dataLabels: { enabled: false },
        };
        if (activityChart) activityChart.destroy();
        activityChart = new ApexCharts(activityChartNode, activityOptions);
        activityChart.render();
      }

      if (engagementChartNode) {
        let series = [analytics.totalClasses || 0, analytics.totalReadingTexts || 0, analytics.totalExercises || 0];
        let labels = ['Classes', 'Reading Texts', 'Exit Tickets'];

        if ($authStore.user?.role === 'ADMIN') {
            series = [analytics.totalClasses || 0, analytics.totalUsers || 0, analytics.totalReadingTexts || 0, analytics.totalExercises || 0];
            labels = ['Classes', 'Users', 'Reading Texts', 'Exit Tickets'];
        }

        const engagementOptions: import('apexcharts').ApexOptions = {
          series: series,
          labels: labels,
          chart: { type: 'donut', height: 250 },
          legend: { position: 'bottom' },
        };
        
        if (engagementChart) engagementChart.destroy();
        engagementChart = new ApexCharts(engagementChartNode, engagementOptions);
        engagementChart.render();
      }
    });
  }

  onDestroy(() => {
    if (activityChart) activityChart.destroy();
    if (engagementChart) engagementChart.destroy();
  });

  function goBack() {
    goto('/dashboard');
  }
</script>

<svelte:head>
  <title>Analytics - IDEA</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white shadow">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center">
          <Button variant="secondary" size="sm" on:click={goBack} class="mr-4">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Button>
          <h1 class="text-xl font-semibold text-gray-900">Analytics</h1>
        </div>
      </div>
    </div>
  </div>

  <!-- Content -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {#if loading}
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p class="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    {:else if error}
      <div class="max-w-md mx-auto">
        <Alert type="error" message={error} />
        <div class="mt-4 text-center">
          <Button variant="primary" on:click={loadAnalytics}>Retry</Button>
        </div>
      </div>
    {:else if analytics}
      <div class="space-y-6">
        <!-- Overview Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-primary-100 rounded-md flex items-center justify-center">
                  <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-500">Total Classes</p>
                <p class="text-2xl font-semibold text-gray-900">{analytics.totalClasses || 0}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-500">{$authStore.user?.role === 'ADMIN' ? 'Total Users' : 'Total Students'}</p>
                <p class="text-2xl font-semibold text-gray-900">{$authStore.user?.role === 'ADMIN' ? (analytics.totalUsers || 0) : (analytics.totalStudents || 0)}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                  <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-500">Total Exit Tickets</p>
                <p class="text-2xl font-semibold text-gray-900">{analytics.totalExercises || 0}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-500">Reading Texts</p>
                <p class="text-2xl font-semibold text-gray-900">{analytics.totalReadingTexts || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Activity Overview</h3>
            <div class="w-full flex items-center justify-center bg-white rounded-lg min-h-[250px]">
              <div bind:this={activityChartNode} class="w-full"></div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Content Distribution</h3>
            <div class="w-full flex items-center justify-center bg-white rounded-lg min-h-[250px]">
              <div bind:this={engagementChartNode} class="w-full"></div>
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="bg-white rounded-lg shadow">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">Recent Activity</h3>
          </div>
          <div class="p-6">
            <div class="space-y-4">
              {#if analytics.recentActivity && analytics.recentActivity.length > 0}
                {#each analytics.recentActivity as activity}
                  <div class="flex items-center space-x-3">
                    <div class="flex-shrink-0">
                      <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm text-gray-900">{activity.title || activity.description || 'Unknown activity'}</p>
                      <p class="text-xs text-gray-500">{new Date(activity.timestamp).toLocaleString()}{#if activity.user} &middot; {activity.user}{/if}</p>
                    </div>
                  </div>
                {/each}
              {:else}
                <p class="text-gray-500 text-center py-4">No recent activity</p>
              {/if}
            </div>
          </div>
        </div>
      </div>
    {:else}
      <div class="text-center py-12">
        <p class="text-gray-500">No analytics data available</p>
      </div>
    {/if}
  </div>
</div>
