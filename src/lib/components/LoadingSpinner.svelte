<script lang="ts">
  export let size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  export let color: string = 'primary-600';
  export let center: boolean = true;

  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-2',
    xl: 'h-16 w-16 border-4'
  };

  $: spinnerClass = `animate-spin rounded-full border-b-transparent border-${color} ${sizeClasses[size]} ${center ? 'mx-auto' : ''}`;
</script>

{#if center}
  <div class="flex justify-center items-center">
    <div class={spinnerClass}></div>
  </div>
{:else}
  <div class={spinnerClass}></div>
{/if}
