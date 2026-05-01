<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import Button from './Button.svelte';

  export let show = false;
  export let title = 'Confirm Action';
  export let message = 'Are you sure you want to proceed?';
  export let confirmText = 'Delete';
  export let cancelText = 'Cancel';
  export let variant: 'primary' | 'danger' = 'danger';
  export let loading = false;

  const dispatch = createEventDispatcher();

  function handleConfirm() {
    dispatch('confirm');
  }

  function handleCancel() {
    dispatch('cancel');
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && show && !loading) {
      handleCancel();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    transition:fade={{ duration: 150 }}
  >
    <!-- Backdrop -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div 
      class="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity"
      on:click={() => !loading && handleCancel()}
    ></div>

    <!-- Dialog Panel -->
    <div 
      class="bg-white rounded-lg shadow-xl overflow-hidden max-w-sm w-full relative z-10 transform sm:max-w-md"
      transition:scale={{ duration: 150, start: 0.95 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-headline"
    >
      <div class="px-6 py-5">
        <div class="sm:flex sm:items-start">
          <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 {variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-primary-100 text-primary-600'}">
            {#if variant === 'danger'}
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            {:else}
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            {/if}
          </div>
          <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
              {title}
            </h3>
            <div class="mt-2">
              <p class="text-sm text-gray-500">
                {message}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse sm:gap-2">
        <Button 
          variant={variant} 
          {loading}
          fullWidth
          class="sm:w-auto mt-3 sm:mt-0"
          on:click={handleConfirm}
        >
          {confirmText}
        </Button>
        <Button 
          variant="secondary" 
          disabled={loading}
          fullWidth
          class="sm:w-auto mt-3 sm:mt-0"
          on:click={handleCancel}
        >
          {cancelText}
        </Button>
      </div>
    </div>
  </div>
{/if}
