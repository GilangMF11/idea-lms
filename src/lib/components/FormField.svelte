<script lang="ts">
  export let label: string;
  export let type: string = 'text';
  export let placeholder: string = '';
  export let value: string = '';
  export let error: string = '';
  export let required: boolean = false;
  export let disabled: boolean = false;
  // export let autocomplete: string = '';
</script>

<div class="space-y-1">
  <label for="{label.toLowerCase()}" class="block text-sm font-medium text-gray-700">
    {label}
    {#if required}
      <span class="text-red-500">*</span>
    {/if}
  </label>
  
  <input
    id="{label.toLowerCase()}"
    {type}
    {placeholder}
    bind:value
    {required}
    {disabled}
    class="input-field {error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
    class:opacity-50={disabled}
  />
  
  {#if error}
    <p class="text-sm text-red-600">{error}</p>
  {/if}
</div>
