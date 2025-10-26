<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { authStore } from '$lib/stores/auth.js';
  import Button from '$lib/components/Button.svelte';
  import Alert from '$lib/components/Alert.svelte';

  let readingText: any = null;
  let annotations: any[] = [];
  let loading = true;
  let error = '';
  let selectedText = '';
  let showAnnotationModal = false;
  let annotationText = '';
  let annotationLoading = false;
  let annotationError = '';
  let editingAnnotation: any = null;
  let editAnnotationText = '';
  let showDeleteAnnotationModal = false;
  let annotationToDelete: any = null;
  
  // Chat functionality
  let showChatModal = false;
  let selectedAnnotationForChat: any = null;
  let chatMessages: any[] = [];
  let newMessage = '';
  let chatLoading = false;
  let chatError = '';
  let chatSocket: WebSocket | null = null;

  onMount(() => {
    authStore.init();
    
    // Redirect if not authenticated
    if (!$authStore.isAuthenticated) {
      goto('/login');
      return;
    }
    
    loadReadingText();
    loadAnnotations();
    
    // Cleanup function
    return () => {
      stopPolling();
      if (chatSocket) {
        chatSocket.close();
      }
    };
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

  async function loadAnnotations() {
    try {
      const textId = $page.params.id;
      
      const response = await fetch(`/api/annotations?readingTextId=${textId}`, {
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        annotations = result.annotations || [];
      }
    } catch (err) {
      console.error('Error loading annotations:', err);
    }
  }

  function handleTextSelection() {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      selectedText = selection.toString().trim();
      showAnnotationModal = true;
      annotationText = '';
      annotationError = '';
    }
  }

  function closeAnnotationModal() {
    showAnnotationModal = false;
    selectedText = '';
    annotationText = '';
    annotationError = '';
    // Clear selection
    window.getSelection()?.removeAllRanges();
  }

  function startEditAnnotation(annotation: any) {
    editingAnnotation = annotation;
    editAnnotationText = annotation.content;
  }

  function cancelEditAnnotation() {
    editingAnnotation = null;
    editAnnotationText = '';
  }

  async function updateAnnotation() {
    if (!editingAnnotation || !editAnnotationText.trim()) {
      return;
    }

    try {
      annotationLoading = true;
      annotationError = '';

      const response = await fetch('/api/annotations', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: editingAnnotation.id,
          content: editAnnotationText
        })
      });

      if (response.ok) {
        await loadAnnotations();
        cancelEditAnnotation();
      } else {
        const result = await response.json();
        annotationError = result.error || 'Failed to update annotation';
      }
    } catch (err) {
      console.error('Error updating annotation:', err);
      annotationError = 'Failed to update annotation';
    } finally {
      annotationLoading = false;
    }
  }

  function deleteAnnotation(annotation: any) {
    annotationToDelete = annotation;
    showDeleteAnnotationModal = true;
  }

  async function confirmDeleteAnnotation() {
    if (!annotationToDelete) return;

    try {
      annotationLoading = true;

      const response = await fetch(`/api/annotations?id=${annotationToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await loadAnnotations();
        closeDeleteAnnotationModal();
      } else {
        const result = await response.json();
        annotationError = result.error || 'Failed to delete annotation';
      }
    } catch (err) {
      console.error('Error deleting annotation:', err);
      annotationError = 'Failed to delete annotation';
    } finally {
      annotationLoading = false;
    }
  }

  function closeDeleteAnnotationModal() {
    showDeleteAnnotationModal = false;
    annotationToDelete = null;
  }

  async function loadChatMessages(annotationId: string) {
    try {
      chatLoading = true;
      chatError = '';
      
      console.log('Loading chat messages for annotation:', annotationId);
      console.log('Class ID:', readingText?.classId);
      console.log('Token:', $authStore.token ? 'Present' : 'Missing');
      
      const response = await fetch(`/api/chat?classId=${readingText?.classId}&annotationId=${annotationId}`, {
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Chat messages loaded:', data);
        chatMessages = data.messages || [];
      } else {
        const errorData = await response.json();
        console.error('Error loading chat messages:', errorData);
        chatError = errorData.error || 'Failed to load chat messages';
      }
    } catch (err) {
      console.error('Error loading chat messages:', err);
      chatError = 'Failed to load chat messages';
    } finally {
      chatLoading = false;
    }
  }

  function setupWebSocket() {
    if (chatSocket) {
      chatSocket.close();
      chatSocket = null;
    }
    
    // Skip WebSocket setup for now since SvelteKit doesn't have built-in WebSocket support
    // We'll use polling instead for real-time updates
    console.log('Using polling for real-time updates (WebSocket not available)');
    
    // Set up polling for new messages
    if (selectedAnnotationForChat) {
      startPolling();
    }
  }

  let pollingInterval: any = null;

  function startPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    // Poll for new messages every 3 seconds
    pollingInterval = setInterval(async () => {
      if (selectedAnnotationForChat && showChatModal) {
        try {
          const response = await fetch(`/api/chat?classId=${readingText?.classId}&annotationId=${selectedAnnotationForChat.id}`, {
            headers: {
              'Authorization': `Bearer ${$authStore.token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            const newMessages = data.messages || [];
            
            // Only update if we have new messages
            if (newMessages.length > chatMessages.length) {
              chatMessages = newMessages;
            }
          }
        } catch (error) {
          console.error('Error polling for messages:', error);
        }
      }
    }, 3000);
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  function openChatModal(annotation: any) {
    selectedAnnotationForChat = annotation;
    showChatModal = true;
    loadChatMessages(annotation.id);
    setupWebSocket();
  }

  function closeChatModal() {
    showChatModal = false;
    selectedAnnotationForChat = null;
    newMessage = '';
    chatMessages = [];
    chatError = '';
    
    // Stop polling when closing chat modal
    stopPolling();
    
    if (chatSocket) {
      chatSocket.close();
      chatSocket = null;
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedAnnotationForChat) return;
    
    try {
      chatLoading = true;
      chatError = '';
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          classId: readingText?.classId,
          content: newMessage.trim(),
          annotationId: selectedAnnotationForChat.id
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        chatMessages = [...chatMessages, data.message];
        newMessage = '';
        
        // Message sent successfully, polling will pick up any other new messages
        console.log('Message sent successfully');
      } else {
        chatError = 'Failed to send message';
      }
    } catch (err) {
      console.error('Error sending message:', err);
      chatError = 'Failed to send message';
    } finally {
      chatLoading = false;
    }
  }

  function scrollToSelectedText(annotation: any) {
    console.log('Scrolling to annotation:', annotation);
    
    if (!annotation.startPos || !annotation.endPos) {
      console.log('Missing position data:', annotation);
      return;
    }

    const contentDiv = document.querySelector('.reading-content');
    if (!contentDiv) {
      console.log('Content div not found');
      return;
    }

    // Clear any existing temporary highlights first
    const existingHighlights = contentDiv.querySelectorAll('.temp-highlight');
    existingHighlights.forEach(highlight => {
      if (highlight.parentNode) {
        highlight.parentNode.replaceChild(document.createTextNode(highlight.textContent), highlight);
      }
    });

    // Find the text node that contains the annotation
    let targetTextNode = null;
    let currentOffset = 0;
    
    const walker = document.createTreeWalker(
      contentDiv,
      NodeFilter.SHOW_TEXT
    );
    
    let node;
    while (node = walker.nextNode()) {
      const nodeLength = node.textContent?.length || 0;
      if (annotation.startPos >= currentOffset && annotation.startPos < currentOffset + nodeLength) {
        targetTextNode = node;
        break;
      }
      currentOffset += nodeLength;
    }

    if (!targetTextNode) {
      console.log('Target text node not found');
      return;
    }

    console.log('Found target text node:', targetTextNode.textContent?.substring(0, 50) + '...');
    console.log('Annotation positions:', annotation.startPos, annotation.endPos);

    try {
      // Create range for the selected text
      const range = document.createRange();
      
      // Calculate relative positions within the target text node
      const nodeStartOffset = currentOffset;
      const relativeStartPos = Math.max(0, annotation.startPos - nodeStartOffset);
      const relativeEndPos = Math.min(
        targetTextNode.textContent?.length || 0, 
        annotation.endPos - nodeStartOffset
      );
      
      console.log('Relative positions:', {
        nodeStartOffset,
        relativeStartPos,
        relativeEndPos,
        nodeLength: targetTextNode.textContent?.length
      });
      
      range.setStart(targetTextNode, relativeStartPos);
      range.setEnd(targetTextNode, relativeEndPos);

      console.log('Range created successfully');

      // Scroll to the range
      const rect = range.getBoundingClientRect();
      console.log('Range rect:', rect);
      
      // Scroll the range into view using the element
      const element = range.commonAncestorContainer.parentElement || contentDiv;
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Create temporary highlight with ORANGE color
      const span = document.createElement('span');
      span.className = 'temp-highlight';
      span.style.cssText = `
        background-color: #ea580c;
        color: white;
        padding: 2px 4px;
        border-radius: 3px;
        font-weight: bold;
        animation: highlightPulseOrange 3s ease-in-out;
        box-shadow: 0 0 10px rgba(234, 88, 12, 0.5);
        display: inline;
      `;
      
      // Add highlight animation with ORANGE colors
      const style = document.createElement('style');
      style.textContent = `
        @keyframes highlightPulseOrange {
          0% { 
            background-color: #ea580c;
            transform: scale(1);
            box-shadow: 0 0 10px rgba(234, 88, 12, 0.5);
          }
          25% { 
            background-color: #dc2626;
            transform: scale(1.05);
            box-shadow: 0 0 15px rgba(220, 38, 38, 0.7);
          }
          50% { 
            background-color: #b91c1c;
            transform: scale(1.1);
            box-shadow: 0 0 20px rgba(185, 28, 28, 0.8);
          }
          75% { 
            background-color: #dc2626;
            transform: scale(1.05);
            box-shadow: 0 0 15px rgba(220, 38, 38, 0.7);
          }
          100% { 
            background-color: #ea580c;
            transform: scale(1);
            box-shadow: 0 0 10px rgba(234, 88, 12, 0.5);
          }
        }
      `;
      
      // Check if style already exists
      if (!document.querySelector('#highlight-animation-orange-style')) {
        style.id = 'highlight-animation-orange-style';
        document.head.appendChild(style);
      }

      range.surroundContents(span);
      console.log('Highlight applied successfully');

      // Remove highlight after 3 seconds
      setTimeout(() => {
        if (span.parentNode) {
          span.parentNode.replaceChild(document.createTextNode(span.textContent), span);
          console.log('Highlight removed');
        }
      }, 3000);

    } catch (e) {
      console.error('Error highlighting text:', e);
      
      // Fallback: just scroll to content
      contentDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  async function createAnnotation() {
    if (!annotationText.trim()) {
      annotationError = 'Please enter your annotation';
      return;
    }

    try {
      annotationLoading = true;
      annotationError = '';

      const position = getSelectionPosition();
      
      const response = await fetch('/api/annotations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          readingTextId: $page.params.id,
          classId: readingText?.classId,
          content: annotationText,
          selectedText: selectedText,
          startPos: position?.startOffset || 0,
          endPos: position?.endOffset || 0,
          color: '#fef3c7' // Default yellow color
        })
      });

      if (response.ok) {
        // Reload annotations
        await loadAnnotations();
        closeAnnotationModal();
      } else {
        const result = await response.json();
        annotationError = result.error || 'Failed to create annotation';
      }
    } catch (err) {
      console.error('Error creating annotation:', err);
      annotationError = 'Failed to create annotation';
    } finally {
      annotationLoading = false;
    }
  }

  function getSelectionPosition() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    return {
      startOffset: range.startOffset,
      endOffset: range.endOffset,
      top: rect.top,
      left: rect.left
    };
  }

  function highlightAnnotatedText() {
    if (!readingText || !annotations.length) return;

    // Clear existing highlights
    const contentDiv = document.querySelector('.reading-content');
    if (!contentDiv) return;

    // Remove existing annotation markers (but not temporary highlight spans)
    const existingMarkers = contentDiv.querySelectorAll('.annotation-marker');
    existingMarkers.forEach(marker => marker.remove());

    // Get all text content from the div
    const fullText = contentDiv.textContent || '';
    console.log('Full text content:', fullText.substring(0, 100) + '...');

    // Add highlights for each annotation
    annotations.forEach(annotation => {
      if (annotation.selectedText && annotation.startPos !== undefined && annotation.endPos !== undefined) {
        console.log('Processing annotation:', {
          selectedText: annotation.selectedText,
          startPos: annotation.startPos,
          endPos: annotation.endPos
        });

        // Find the text node that contains the annotation
        let targetTextNode = null;
        let currentOffset = 0;
        
        const walker = document.createTreeWalker(
          contentDiv,
          NodeFilter.SHOW_TEXT
        );
        
        let node;
        while (node = walker.nextNode()) {
          const nodeLength = node.textContent?.length || 0;
          if (annotation.startPos >= currentOffset && annotation.startPos < currentOffset + nodeLength) {
            targetTextNode = node;
            break;
          }
          currentOffset += nodeLength;
        }

        if (targetTextNode) {
          console.log('Found target text node:', targetTextNode.textContent?.substring(0, 50) + '...');
          
          const range = document.createRange();
          try {
            // Calculate relative positions within the target text node
            const nodeStartOffset = currentOffset;
            const relativeStartPos = Math.max(0, annotation.startPos - nodeStartOffset);
            const relativeEndPos = Math.min(
              targetTextNode.textContent?.length || 0, 
              annotation.endPos - nodeStartOffset
            );
            
            console.log('Relative positions:', {
              nodeStartOffset,
              relativeStartPos,
              relativeEndPos,
              nodeLength: targetTextNode.textContent?.length
            });
            
            range.setStart(targetTextNode, relativeStartPos);
            range.setEnd(targetTextNode, relativeEndPos);
            
            const span = document.createElement('span');
            span.className = 'annotation-marker';
            span.style.cssText = `
              cursor: pointer;
              position: relative;
              transition: all 0.2s ease;
            `;
            span.title = `Annotation: ${annotation.content}`;
            span.onclick = () => openChatModal(annotation);
            
            // No hover effect needed since there's no visual element
            
            range.surroundContents(span);
            console.log('Successfully highlighted annotation');
          } catch (e) {
            console.warn('Could not highlight annotation:', e);
          }
        } else {
          console.warn('Could not find target text node for annotation');
        }
      }
    });
  }

  // Reactive statement to highlight when annotations change
  $: if (readingText && annotations.length > 0) {
    setTimeout(highlightAnnotatedText, 100);
  }

  function goBack() {
    goto('/dashboard');
  }

  function handleKeydown(event: Event) {
    const e = event as KeyboardEvent;
    if (e.key === 'Escape') {
      closeAnnotationModal();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if loading}
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      <p class="mt-4 text-gray-600">Loading reading text...</p>
    </div>
  </div>
{:else if error}
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full">
      <Alert type="error" message={error} />
      <div class="mt-4 text-center">
        <Button variant="primary" on:click={goBack}>Back</Button>
      </div>
    </div>
  </div>
{:else if readingText}
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
              <h1 class="text-2xl font-bold text-gray-900">{readingText.title}</h1>
              <p class="text-sm text-gray-600">
                {readingText.author ? `by ${readingText.author}` : 'Unknown author'}
                {readingText.source ? ` • ${readingText.source}` : ''}
              </p>
            </div>
          </div>
          
          <div class="flex items-center space-x-4">
            <div class="text-right">
              <p class="text-sm font-medium text-gray-900">
                {annotations.length} Annotations
              </p>
              <p class="text-xs text-gray-500">Collaborative Reading</p>
            </div>
            <div class="h-10 w-10 bg-primary-600 rounded-full flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Reading Text -->
        <div class="lg:col-span-2">
          <div class="card p-8">
            <div class="prose prose-lg max-w-none">
              <div 
                class="text-gray-900 leading-relaxed select-text cursor-text reading-content"
                role="textbox"
                tabindex="0"
                on:click={handleTextSelection}
                on:keydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleTextSelection();
                  }
                }}
              >
                {@html readingText.content}
              </div>
            </div>
          </div>
        </div>

        <!-- Annotations Sidebar -->
        <div class="lg:col-span-1">
          <div class="card p-6">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-semibold text-gray-900">Annotations</h3>
              <span class="bg-primary-100 text-primary-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {annotations.length}
              </span>
            </div>

            {#if annotations.length > 0}
              <div class="space-y-4 max-h-96 overflow-y-auto">
                {#each annotations as annotation}
                  <div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div class="flex items-start justify-between mb-2">
                      <div class="flex items-center">
                        <div class="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                          <span class="text-sm font-medium text-primary-600">
                            {annotation.user?.firstName?.charAt(0)}{annotation.user?.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p class="text-sm font-medium text-gray-900">
                            {annotation.user?.firstName} {annotation.user?.lastName}
                          </p>
                          <p class="text-xs text-gray-500">
                            {new Date(annotation.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div class="flex space-x-2">
                        <button
                          class="text-orange-600 hover:text-orange-800 text-xs flex items-center"
                          on:click={() => openChatModal(annotation)}
                        >
                          <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Discuss
                        </button>
                        {#if ['ADMIN', 'TEACHER'].includes($authStore.user?.role || '')}
                          <button
                            class="text-blue-600 hover:text-blue-800 text-xs"
                            on:click={() => startEditAnnotation(annotation)}
                            disabled={annotationLoading}
                          >
                            Edit
                          </button>
                          <button
                            class="text-red-600 hover:text-red-800 text-xs"
                            on:click={() => deleteAnnotation(annotation)}
                            disabled={annotationLoading}
                          >
                            Delete
                          </button>
                        {/if}
                      </div>
                    </div>
                    
                    {#if annotation.selectedText}
                      <div class="mb-2 p-2 bg-orange-50 border-l-4 border-orange-400 rounded cursor-pointer hover:bg-orange-100 transition-colors" 
                           on:click={() => scrollToSelectedText(annotation)}
                           role="button"
                           tabindex="0"
                           on:keydown={(e) => e.key === 'Enter' && scrollToSelectedText(annotation)}>
                        <div class="text-xs font-medium text-orange-800 mb-1 flex items-center">
                          <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Selected Text (click to locate):
                        </div>
                        <div class="text-sm text-orange-700 italic">"{annotation.selectedText}"</div>
                      </div>
                    {/if}
                    
                    <div class="text-sm text-gray-900">
                      <div class="font-medium text-gray-700 mb-1">Annotation:</div>
                      {#if editingAnnotation && editingAnnotation.id === annotation.id}
                        <div class="space-y-2">
                          <textarea
                            bind:value={editAnnotationText}
                            rows="3"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                            placeholder="Enter your annotation..."
                          ></textarea>
                          <div class="flex space-x-2">
                            <button
                              class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                              on:click={updateAnnotation}
                              disabled={annotationLoading || !editAnnotationText.trim()}
                            >
                              {annotationLoading ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              class="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                              on:click={cancelEditAnnotation}
                              disabled={annotationLoading}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      {:else}
                        {annotation.content}
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="text-center py-8">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">No annotations yet</h3>
                <p class="mt-1 text-sm text-gray-500">Select text to add your first annotation</p>
              </div>
            {/if}
          </div>
        </div>
    </div>
  </main>
  </div>

  <!-- Chat Modal -->
  {#if showChatModal && selectedAnnotationForChat}
    <div 
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      tabindex="0"
      on:click={(e) => e.target === e.currentTarget && closeChatModal()}
      on:keydown={(e) => e.key === 'Escape' && closeChatModal()}
    >
      <div 
        class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
        role="document"
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <div class="flex items-center">
            <div class="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
              <svg class="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Discussion</h3>
              <p class="text-sm text-gray-500">Annotation by {selectedAnnotationForChat.user?.firstName} {selectedAnnotationForChat.user?.lastName}</p>
            </div>
          </div>
          <button
            class="text-gray-400 hover:text-gray-600"
            on:click={closeChatModal}
            aria-label="Close chat modal"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Annotation Content -->
        <div class="p-4 bg-orange-50 border-b border-gray-200">
          <div class="text-sm font-medium text-orange-800 mb-2">Selected Text:</div>
          <div class="text-sm text-orange-700 italic mb-2">"{selectedAnnotationForChat.selectedText}"</div>
          <div class="text-sm font-medium text-orange-800 mb-1">Annotation:</div>
          <div class="text-sm text-orange-700">{selectedAnnotationForChat.content}</div>
        </div>

        <!-- Chat Messages -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {#if chatLoading && chatMessages.length === 0}
            <div class="flex justify-center items-center h-32">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          {:else if chatError}
            <div class="text-center text-red-600 text-sm">{chatError}</div>
          {:else if chatMessages.length === 0}
            <div class="text-center text-gray-500 text-sm">No messages yet. Start the discussion!</div>
          {:else}
            {#each chatMessages as message}
              <div class="flex {message.userId === $authStore.user?.id ? 'justify-end' : 'justify-start'}">
                <div class="max-w-xs lg:max-w-md">
                  <div class="flex items-center mb-1 {message.userId === $authStore.user?.id ? 'justify-end' : 'justify-start'}">
                    <span class="text-xs text-gray-500">{message.user.firstName} {message.user.lastName}</span>
                    <span class="text-xs text-gray-400 ml-2">{new Date(message.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div class="px-4 py-2 rounded-lg {message.userId === $authStore.user?.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-900'}">
                    <p class="text-sm">{message.content}</p>
                  </div>
                </div>
              </div>
            {/each}
          {/if}
        </div>

        <!-- Message Input -->
        <div class="p-4 border-t border-gray-200">
          <div class="flex space-x-2">
            <input
              type="text"
              bind:value={newMessage}
              placeholder="Type your message..."
              class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              on:keydown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={chatLoading}
            />
            <button
              class="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
              on:click={sendMessage}
              disabled={chatLoading || !newMessage.trim()}
            >
              {#if chatLoading}
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              {:else}
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              {/if}
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}

<!-- Annotation Modal -->
{#if showAnnotationModal}
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div 
      class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
    >
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Add Annotation</h3>
          <button 
            class="text-gray-400 hover:text-gray-600"
            on:click={closeAnnotationModal}
            aria-label="Close annotation modal"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

      {#if selectedText}
        <div class="mb-6 p-4 bg-orange-50 border-l-4 border-orange-400 rounded">
          <div class="text-sm font-medium text-orange-800 mb-2">Selected Text:</div>
          <div class="text-sm text-orange-700 italic">"{selectedText}"</div>
        </div>
      {/if}

        <div class="mb-6">
          <label for="annotation" class="block text-sm font-medium text-gray-700 mb-2">
            Your Annotation
          </label>
          <textarea
            id="annotation"
            bind:value={annotationText}
            rows="4"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            placeholder="Share your thoughts, ask questions, or start a discussion..."
          ></textarea>
        </div>

        {#if annotationError}
          <Alert type="error" message={annotationError} />
        {/if}

        <div class="flex justify-end space-x-3">
          <Button variant="secondary" on:click={closeAnnotationModal} disabled={annotationLoading}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            on:click={createAnnotation} 
            disabled={annotationLoading || !annotationText.trim()}
          >
            {#if annotationLoading}
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            {/if}
            {annotationLoading ? 'Adding...' : 'Add Annotation'}
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Annotation Confirmation Modal -->
{#if showDeleteAnnotationModal && annotationToDelete}
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    role="dialog"
    aria-modal="true"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-center mb-4">
          <div class="flex-shrink-0">
            <div class="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
              <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <h3 class="text-lg font-semibold text-gray-900">Delete Annotation</h3>
            <p class="text-sm text-gray-500">This action cannot be undone</p>
          </div>
        </div>

        <!-- Content -->
        <div class="mb-6">
          <div class="bg-gray-50 rounded-lg p-4 mb-4">
            <div class="text-sm font-medium text-gray-900 mb-2">
              Annotation by {annotationToDelete.user?.firstName} {annotationToDelete.user?.lastName}
            </div>
            <div class="text-sm text-gray-700">
              {annotationToDelete.content}
            </div>
            {#if annotationToDelete.selectedText}
              <div class="mt-2 text-sm text-blue-600 italic">
                "{annotationToDelete.selectedText}"
              </div>
            {/if}
          </div>

          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800">Warning</h3>
                <div class="mt-2 text-sm text-red-700">
                  <p>This annotation will be permanently deleted and cannot be recovered.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end space-x-3">
          <button 
            type="button" 
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            on:click={closeDeleteAnnotationModal}
            disabled={annotationLoading}
          >
            Cancel
          </button>
          <button 
            type="button" 
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            on:click={confirmDeleteAnnotation}
            disabled={annotationLoading}
          >
            {#if annotationLoading}
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            {/if}
            {annotationLoading ? 'Deleting...' : 'Delete Annotation'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
{/if}

