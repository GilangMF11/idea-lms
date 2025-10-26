<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.js';
  import Button from '$lib/components/Button.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import Alert from '$lib/components/Alert.svelte';

  let title = '';
  let author = '';
  let source = '';
  let classId = '';
  let classes: any[] = [];
  let loading = false;
  let error = '';
  
  // Rich content editor
  let contentBlocks: any[] = [{ type: 'text', content: '' }];
  let showImageUpload = false;
  let imageUploadLoading = false;
  let imageUploadError = '';

  onMount(() => {
    if (!$authStore.isAuthenticated || !['TEACHER', 'ADMIN'].includes($authStore.user?.role || '')) {
      goto('/dashboard');
      return;
    }

    // Get classId from URL params
    classId = $page.url.searchParams.get('classId') || '';
    loadClasses();
  });

  async function loadClasses() {
    try {
      const response = await fetch('/api/classes', {
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        classes = data.classes || [];
      }
    } catch (err) {
      console.error('Error loading classes:', err);
    }
  }

  function addTextBlock() {
    contentBlocks = [...contentBlocks, { type: 'text', content: '' }];
  }

  function addImageBlock() {
    contentBlocks = [...contentBlocks, { type: 'image', url: '', caption: '' }];
  }

  function removeBlock(index: number) {
    contentBlocks = contentBlocks.filter((_, i) => i !== index);
  }


  async function handleImageUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      imageUploadError = 'Please select an image file';
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      imageUploadError = 'Image size must be less than 5MB';
      return;
    }

    try {
      imageUploadLoading = true;
      imageUploadError = '';

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${$authStore.token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Upload successful:', result);
        return result.url;
      } else {
        const result = await response.json();
        console.error('Upload failed:', result);
        imageUploadError = result.error || 'Failed to upload image';
        return null;
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      imageUploadError = 'Failed to upload image';
      return null;
    } finally {
      imageUploadLoading = false;
    }
  }

  async function handleSubmit() {
    if (!title.trim()) {
      error = 'Reading text title is required';
      return;
    }

    if (!classId) {
      error = 'Please select a class';
      return;
    }

    console.log('Validating content blocks:', contentBlocks);
    if (contentBlocks.length === 0 || contentBlocks.every(block => {
      if (block.type === 'text') return !block.content.trim();
      if (block.type === 'image') return !block.url.trim();
      return true;
    })) {
      error = 'Please add some content';
      console.log('Validation failed - no content');
      return;
    }
    console.log('Validation passed');

    try {
      loading = true;
      error = '';

      // Convert content blocks to HTML
      console.log('Content blocks:', contentBlocks);
      const htmlContent = contentBlocks.map(block => {
        if (block.type === 'text') {
          return `<p>${block.content.replace(/\n/g, '<br>')}</p>`;
        } else if (block.type === 'image') {
          return `<figure><img src="${block.url}" alt="${block.caption}" style="max-width: 100%; height: auto;"><figcaption>${block.caption}</figcaption></figure>`;
        }
        return '';
      }).join('');
      
      console.log('Generated HTML:', htmlContent);

      const response = await fetch('/api/reading-texts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          content: htmlContent,
          author: author || null,
          source: source || null,
          classId
        })
      });

      if (response.ok) {
        const result = await response.json();
        goto(`/classes/${classId}`);
      } else {
        const result = await response.json();
        error = result.error || 'Failed to create reading text';
      }
    } catch (err) {
      console.error('Error creating reading text:', err);
      error = 'Failed to create reading text';
    } finally {
      loading = false;
    }
  }

  function goBack() {
    if (classId) {
      goto(`/classes/${classId}`);
    } else {
      goto('/dashboard');
    }
  }
</script>

<svelte:head>
  <title>Create Reading Text - LMS IDEA</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <header class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center py-4">
        <div class="flex items-center">
          <div class="mr-4">
            <Button variant="secondary" size="sm" on:click={goBack}>
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Button>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Create Reading Text</h1>
            <p class="text-sm text-gray-600">Create rich content with text and images</p>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="card p-8">
      {#if error}
        <Alert type="error" message={error} />
      {/if}

      <form on:submit|preventDefault={handleSubmit} class="space-y-6">
        <!-- Basic Information -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Title"
            type="text"
            bind:value={title}
            placeholder="Enter reading text title"
            required
          />
          
          <div>
            <label for="classId" class="block text-sm font-medium text-gray-700 mb-2">Class</label>
            <select
              id="classId"
              bind:value={classId}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Select a class</option>
              {#each classes as cls}
                <option value={cls.id}>{cls.name}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Author"
            type="text"
            bind:value={author}
            placeholder="Enter author name (optional)"
          />
          
          <FormField
            label="Source"
            type="text"
            bind:value={source}
            placeholder="Enter source (optional)"
          />
        </div>

        <!-- Content Editor -->
        <div>
          <div class="flex justify-between items-center mb-4">
            <div class="block text-sm font-medium text-gray-700">Content</div>
            <div class="flex space-x-2">
              <Button type="button" variant="secondary" size="sm" on:click={addTextBlock}>
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                Add Text
              </Button>
              <Button type="button" variant="secondary" size="sm" on:click={addImageBlock}>
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Add Image
              </Button>
            </div>
          </div>

          <div class="space-y-4">
            {#each contentBlocks as block, index}
              <div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div class="flex justify-between items-center mb-3">
                  <span class="text-sm font-medium text-gray-700">
                    {block.type === 'text' ? 'Text Block' : 'Image Block'} #{index + 1}
                  </span>
                  <button
                    type="button"
                    class="text-red-600 hover:text-red-900 text-sm"
                    on:click={() => removeBlock(index)}
                  >
                    Remove
                  </button>
                </div>

                {#if block.type === 'text'}
                  <textarea
                    bind:value={block.content}
                    rows="4"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter text content..."
                  ></textarea>
                {:else if block.type === 'image'}
                  <div class="space-y-3">
                    <div>
                      <label for="image-url-{index}" class="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                      <div class="flex space-x-2">
                        <input
                          id="image-url-{index}"
                          type="text"
                          bind:value={block.url}
                          class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Enter image URL or upload file"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          on:change={async (e) => {
                            console.log('File selected for upload');
                            const url = await handleImageUpload(e);
                            console.log('Upload result URL:', url);
                            if (url) {
                              block.url = url;
                              contentBlocks = [...contentBlocks];
                              console.log('Updated contentBlocks:', contentBlocks);
                            }
                          }}
                          class="hidden"
                          id="image-upload-{index}"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          on:click={() => document.getElementById(`image-upload-${index}`)?.click()}
                          disabled={imageUploadLoading}
                        >
                          {imageUploadLoading ? 'Uploading...' : 'Upload'}
                        </Button>
                      </div>
                      {#if imageUploadError}
                        <p class="text-red-600 text-sm mt-1">{imageUploadError}</p>
                      {/if}
                    </div>
                    
                    <div>
                      <label for="image-caption-{index}" class="block text-sm font-medium text-gray-700 mb-1">Caption</label>
                      <input
                        id="image-caption-{index}"
                        type="text"
                        bind:value={block.caption}
                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Enter image caption (optional)"
                      />
                    </div>

                    {#if block.url}
                      <div class="mt-3">
                        <img
                          src={block.url}
                          alt={block.caption || 'Image preview'}
                          class="max-w-full h-auto rounded border"
                          style="max-height: 200px;"
                        />
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>

        <!-- Submit Button -->
        <div class="flex justify-end space-x-3">
          <Button type="button" variant="secondary" on:click={goBack}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {#if loading}
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            {/if}
            {loading ? 'Creating...' : 'Create Reading Text'}
          </Button>
        </div>
      </form>
    </div>
  </main>
</div>