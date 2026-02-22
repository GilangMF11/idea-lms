<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.js';
  import Button from '$lib/components/Button.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import Alert from '$lib/components/Alert.svelte';

  let readingText: any = null;
  let title = '';
  let author = '';
  let source = '';
  let classId = '';
  let classes: any[] = [];
  let loading = false;
  let error = '';
  
  // Rich content editor
  let contentBlocks: any[] = [];
  let showImageUpload = false;
  let imageUploadLoading = false;
  let imageUploadError = '';
  // PDF upload
  let pdfUrl = '';
  let pdfUploading = false;
  let pdfUploadError = '';
  let pdfInput: HTMLInputElement;

  function parseHTMLToBlocks(htmlContent: string) {
    const blocks: any[] = [];
    
    // Create a temporary DOM element to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Process each child element
    Array.from(tempDiv.children).forEach(element => {
      if (element.tagName === 'P') {
        // Text block
        const textContent = element.innerHTML.replace(/<br\s*\/?>/gi, '\n');
        blocks.push({
          type: 'text',
          content: textContent
        });
      } else if (element.tagName === 'FIGURE') {
        // Image block
        const img = element.querySelector('img');
        const figcaption = element.querySelector('figcaption');
        
        if (img) {
          blocks.push({
            type: 'image',
            url: img.src,
            caption: figcaption ? figcaption.textContent || '' : ''
          });
        }
      }
    });
    
    // If no blocks were found, create a text block with the content
    if (blocks.length === 0) {
      blocks.push({
        type: 'text',
        content: htmlContent.replace(/<[^>]*>/g, '')
      });
    }
    
    return blocks;
  }

  onMount(() => {
    if (!$authStore.isAuthenticated || !['TEACHER', 'ADMIN'].includes($authStore.user?.role || '')) {
      goto('/dashboard');
      return;
    }

    loadReadingText();
    loadClasses();
  });

  async function loadReadingText() {
    try {
      loading = true;
      const textId = $page.params.id;
      
      if (!textId) {
        error = 'Reading text ID not found';
        return;
      }

      const response = await fetch(`/api/reading-texts?id=${textId}`, {
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        readingText = result.readingText;
        
        // Populate form fields
        title = readingText.title;
        author = readingText.author || '';
        source = readingText.source || '';
        classId = readingText.classId;
        pdfUrl = readingText.pdfUrl || '';
        
        // Parse HTML content back to blocks (skip if PDF-only)
        contentBlocks = readingText.pdfUrl ? [] : parseHTMLToBlocks(readingText.content || '');
        if (contentBlocks.length === 0 && !readingText.pdfUrl) {
          contentBlocks = [{ type: 'text', content: '' }];
        }
      } else {
        error = 'Failed to load reading text';
      }
    } catch (err) {
      console.error('Error loading reading text:', err);
      error = 'Failed to load reading text';
    } finally {
      loading = false;
    }
  }

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

  async function handlePdfUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      pdfUploadError = 'Please select a PDF file';
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      pdfUploadError = 'PDF must be less than 15MB';
      return;
    }
    try {
      pdfUploading = true;
      pdfUploadError = '';
      const formData = new FormData();
      formData.append('pdf', file);
      const response = await fetch('/api/upload/pdf', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${$authStore.token}` },
        body: formData
      });
      if (response.ok) {
        const data = await response.json();
        pdfUrl = data.url;
      } else {
        const data = await response.json();
        pdfUploadError = data.error || 'Failed to upload PDF';
      }
    } catch (err) {
      console.error('PDF upload error:', err);
      pdfUploadError = 'Failed to upload PDF';
    } finally {
      pdfUploading = false;
      target.value = '';
    }
  }

  function clearPdf() {
    pdfUrl = '';
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
      imageUploadError = 'File size must be less than 5MB';
      return;
    }

    try {
      imageUploadLoading = true;
      imageUploadError = '';

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
        return result.url;
      } else {
        const result = await response.json();
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
      error = 'Please enter a title';
      return;
    }

    if (!classId) {
      error = 'Please select a class';
      return;
    }

    // Validate: need either PDF or content blocks
    const hasPdf = pdfUrl.trim().length > 0;
    const hasContent = contentBlocks.some(block => {
      if (block.type === 'text') {
        return block.content.trim();
      } else if (block.type === 'image') {
        return block.url.trim();
      }
      return false;
    });

    if (!hasPdf && !hasContent) {
      error = 'Please upload a PDF or add some content';
      return;
    }

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
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: readingText.id,
          title,
          content: htmlContent,
          pdfUrl: pdfUrl.trim() || null,
          author: author || null,
          source: source || null,
          classId
        })
      });

      if (response.ok) {
        const result = await response.json();
        goto(`/reading-texts/${readingText.id}`);
      } else {
        const result = await response.json();
        error = result.error || 'Failed to update reading text';
      }
    } catch (err) {
      console.error('Error updating reading text:', err);
      error = 'Failed to update reading text';
    } finally {
      loading = false;
    }
  }

  function goBack() {
    goto(`/reading-texts/${readingText?.id || ''}`);
  }
</script>

<svelte:head>
  <title>Edit Reading Text - IDEA</title>
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
            <h1 class="text-2xl font-bold text-gray-900">Edit Reading Text</h1>
            <p class="text-sm text-gray-600">Update your reading material</p>
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

      <form on:submit|preventDefault={handleSubmit}>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <FormField
            label="Title"
            type="text"
            bind:value={title}
            placeholder="Enter reading text title"
            required
          />
          
          <div>
            <label for="class-select" class="block text-sm font-medium text-gray-700">
              Class <span class="text-red-500">*</span>
            </label>
            <select
              id="class-select"
              bind:value={classId}
              required
              class="input-field mt-1 block w-full"
            >
              <option value="">Select a class</option>
              {#each classes as cls}
                <option value={cls.id}>{cls.name}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <FormField
            label="Author"
            type="text"
            bind:value={author}
            placeholder="Enter author name"
          />
          
          <FormField
            label="Source"
            type="text"
            bind:value={source}
            placeholder="Enter source or reference"
          />
        </div>

        <!-- Rich Content Editor -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-4">
            <div class="text-sm font-medium text-gray-700">Content</div>
            <div class="flex flex-wrap gap-2">
              <input
                type="file"
                accept="application/pdf"
                class="hidden"
                bind:this={pdfInput}
                on:change={handlePdfUpload}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pdfUploading}
                on:click={() => pdfInput?.click()}
              >
                {#if pdfUploading}
                  <span class="animate-spin mr-2">⏳</span>
                {:else}
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                {/if}
                {pdfUploading ? 'Uploading...' : 'Upload PDF'}
              </Button>
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

          {#if pdfUploadError}
            <p class="text-sm text-red-600 mb-2">{pdfUploadError}</p>
          {/if}
          {#if pdfUrl}
            <div class="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
              <div class="flex items-center">
                <svg class="w-8 h-8 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <div>
                  <p class="text-sm font-medium text-gray-900">PDF attached</p>
                  <p class="text-xs text-gray-500 truncate max-w-xs">{pdfUrl}</p>
                </div>
              </div>
              <button type="button" class="text-red-600 hover:text-red-800 text-sm" on:click={clearPdf}>Remove</button>
            </div>
          {/if}

          <div class="space-y-4">
            {#each contentBlocks as block, index}
              <div class="border border-gray-200 rounded-lg p-4">
                {#if block.type === 'text'}
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-sm font-medium text-gray-700">Text Block</span>
                    <button
                      type="button"
                      class="text-red-600 hover:text-red-800"
                      on:click={() => removeBlock(index)}
                      aria-label="Remove text block"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <textarea
                    bind:value={block.content}
                    rows="4"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter your text content..."
                  ></textarea>
                {:else if block.type === 'image'}
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-sm font-medium text-gray-700">Image Block</span>
                    <button
                      type="button"
                      class="text-red-600 hover:text-red-800"
                      on:click={() => removeBlock(index)}
                      aria-label="Remove image block"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div class="space-y-3">
                    <div>
                      <div class="text-sm font-medium text-gray-700 mb-1">Image URL</div>
                      <div class="flex space-x-2">
                        <input
                          type="text"
                          bind:value={block.url}
                          class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Enter image URL or upload file"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          class="hidden"
                          on:change={async (e) => {
                            const url = await handleImageUpload(e);
                            if (url) {
                              block.url = url;
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          on:click={(ev) => {
                            const btn = ev.currentTarget as HTMLElement;
                            const fileInput = btn.previousElementSibling as HTMLInputElement | null;
                            fileInput?.click();
                          }}
                          disabled={imageUploadLoading}
                        >
                          {imageUploadLoading ? 'Uploading...' : 'Upload'}
                        </Button>
                      </div>
                      {#if imageUploadError}
                        <p class="mt-1 text-sm text-red-600">{imageUploadError}</p>
                      {/if}
                    </div>
                    
                    <div>
                      <div class="text-sm font-medium text-gray-700 mb-1">Caption</div>
                      <input
                        type="text"
                        bind:value={block.caption}
                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Enter image caption"
                      />
                    </div>
                    
                    {#if block.url}
                      <div class="mt-3">
                        <img
                          src={block.url}
                          alt={block.caption}
                          class="max-w-full h-auto rounded-lg border border-gray-200"
                          style="max-height: 300px;"
                        />
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>

        <div class="flex justify-end space-x-3">
          <Button type="button" variant="secondary" on:click={goBack}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Updating...' : 'Update Reading Text'}
          </Button>
        </div>
      </form>
    </div>
  </main>
</div>
