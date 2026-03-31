<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Button from '$lib/components/Button.svelte';

  // Track scroll position for progress indicator
  let scrollProgress = 0;
  let sections = [
    'introduction',
    'use-of-service',
    'user-accounts',
    'intellectual-property',
    'user-content',
    'privacy',
    'disclaimer',
    'limitation-of-liability',
    'termination',
    'changes'
  ];

  onMount(() => {
    // Handle scroll progress
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgress = (scrollTop / docHeight) * 100;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  });

  function scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function handleBack() {
    goto(-1);
  }
</script>

<svelte:head>
  <title>Terms of Service - IDEA LMS</title>
  <meta name="description" content="Terms of Service for IDEA Learning Management System" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Progress Bar -->
  {#if scrollProgress > 0}
    <div class="fixed top-0 left-0 right-0 h-1 bg-blue-600 transition-all duration-300" style="width: {scrollProgress}%"></div>
  {/if}

  <!-- Header -->
  <header class="bg-white border-b border-gray-200 sticky top-0 z-50">
    <div class="max-w-4xl mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold text-gray-900">Terms of Service</h1>
        <Button
          variant="secondary"
          size="sm"
          on:click={handleBack}
        >
          ← Back
        </Button>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-4xl mx-auto px-4 py-8">
    <article class="prose prose-blue max-w-none">
      <!-- Last Updated -->
      <p class="text-sm text-gray-500 mb-8">
        Last Updated: <time datetime="2025-03-31">March 31, 2025</time>
      </p>

      <!-- Introduction -->
      <section id="introduction" class="mb-8 scroll-mt-20">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
        <p class="text-gray-700 mb-4">
          Welcome to IDEA Learning Management System (IDEA LMS). By accessing or using our service, you agree to be bound by these Terms of Service ("Terms"). Please read them carefully.
        </p>
        <p class="text-gray-700 mb-4">
          These Terms govern your use of IDEA LMS, a platform designed to facilitate online learning, educational content delivery, and collaborative academic activities.
        </p>
      </section>

      <!-- Use of Service -->
      <section id="use-of-service" class="mb-8 scroll-mt-20">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">2. Use of Service</h2>
        <p class="text-gray-700 mb-4">
          IDEA LMS is provided for educational purposes only. You agree to use the service in accordance with all applicable laws and regulations.
        </p>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">2.1. Eligibility</h3>
        <ul class="list-disc pl-6 text-gray-700 mb-4">
          <li>You must be at least 13 years old to use IDEA LMS</li>
          <li>Users under 18 must have parental or guardian consent</li>
          <li>You must provide accurate and complete information during registration</li>
        </ul>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">2.2. Acceptable Use</h3>
        <ul class="list-disc pl-6 text-gray-700 mb-4">
          <li>Use IDEA LMS for legitimate educational purposes only</li>
          <li>Respect intellectual property rights of others</li>
          <li>Do not share your login credentials with others</li>
          <li>Do not attempt to gain unauthorized access to the system</li>
          <li>Do not upload malicious software or harmful content</li>
        </ul>
      </section>

      <!-- User Accounts -->
      <section id="user-accounts" class="mb-8 scroll-mt-20">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">3. User Accounts</h2>
        <p class="text-gray-700 mb-4">
          To access certain features, you must create an account. You are responsible for maintaining the confidentiality of your account information.
        </p>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">3.1. Account Security</h3>
        <ul class="list-disc pl-6 text-gray-700 mb-4">
          <li>Choose a strong, unique password</li>
          <li>Notify us immediately of any unauthorized access</li>
          <li>You are responsible for all activities under your account</li>
          <li>Do not create multiple accounts without permission</li>
        </ul>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">3.2. Account Termination</h3>
        <p class="text-gray-700 mb-4">
          We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent activities. You may also close your account at any time by contacting us.
        </p>
      </section>

      <!-- Intellectual Property -->
      <section id="intellectual-property" class="mb-8 scroll-mt-20">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">4. Intellectual Property</h2>
        <p class="text-gray-700 mb-4">
          IDEA LMS and its original content, features, and functionality are owned by IDEA and are protected by international copyright, trademark, and other intellectual property laws.
        </p>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">4.1. Platform Content</h3>
        <p class="text-gray-700 mb-4">
          You may not copy, modify, or distribute any part of IDEA LMS without our written permission.
        </p>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">4.2. User-Generated Content</h3>
        <p class="text-gray-700 mb-4">
          When you upload content to IDEA LMS, you grant us a license to use, display, and distribute that content for the purpose of operating the platform. You retain ownership of your content.
        </p>
      </section>

      <!-- User Content -->
      <section id="user-content" class="mb-8 scroll-mt-20">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">5. User Content and Conduct</h2>
        <p class="text-gray-700 mb-4">
          You are solely responsible for any content you upload, post, or share through IDEA LMS.
        </p>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">5.1. Content Guidelines</h3>
        <ul class="list-disc pl-6 text-gray-700 mb-4">
          <li>Do not upload offensive, illegal, or inappropriate content</li>
          <li>Do not harass, bully, or intimidate other users</li>
          <li>Do not share personal information without consent</li>
          <li>Do not spam or distribute unsolicited messages</li>
          <li>Respect academic integrity and do not plagiarize</li>
        </ul>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">5.2. Content Removal</h3>
        <p class="text-gray-700 mb-4">
          We reserve the right to remove any content that violates these Terms or our community standards, without prior notice.
        </p>
      </section>

      <!-- Privacy -->
      <section id="privacy" class="mb-8 scroll-mt-20">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">6. Privacy</h2>
        <p class="text-gray-700 mb-4">
          Your privacy is important to us. Please review our Privacy Policy, which also governs your use of IDEA LMS, to understand our practices regarding your personal data.
        </p>
      </section>

      <!-- Disclaimer -->
      <section id="disclaimer" class="mb-8 scroll-mt-20">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">7. Disclaimer</h2>
        <p class="text-gray-700 mb-4">
          IDEA LMS is provided "as is" without warranties of any kind, either express or implied. We do not guarantee:
        </p>
        <ul class="list-disc pl-6 text-gray-700 mb-4">
          <li>Uninterrupted or error-free operation</li>
          <li>Complete security of the platform</li>
          <li>Accuracy of all user-generated content</li>
          <li>Compatibility with all devices and browsers</li>
        </ul>
      </section>

      <!-- Limitation of Liability -->
      <section id="limitation-of-liability" class="mb-8 scroll-mt-20">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">8. Limitation of Liability</h2>
        <p class="text-gray-700 mb-4">
          To the maximum extent permitted by law, IDEA shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of IDEA LMS.
        </p>
      </section>

      <!-- Termination -->
      <section id="termination" class="mb-8 scroll-mt-20">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">9. Termination</h2>
        <p class="text-gray-700 mb-4">
          We may terminate or suspend your access to IDEA LMS at any time, with or without cause, with or without notice.
        </p>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">9.1. Effect of Termination</h3>
        <ul class="list-disc pl-6 text-gray-700 mb-4">
          <li>Your access to the platform will be terminated</li>
          <li>Your account and content may be deleted</li>
          <li>We are not obligated to retain your data</li>
        </ul>
      </section>

      <!-- Changes -->
      <section id="changes" class="mb-8 scroll-mt-20">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">10. Changes to Terms</h2>
        <p class="text-gray-700 mb-4">
          We may modify these Terms at any time. We will notify users of significant changes via email or through the platform. Your continued use of IDEA LMS after such modifications constitutes acceptance of the updated Terms.
        </p>
      </section>

      <!-- Contact -->
      <section class="mb-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">11. Contact Us</h2>
        <p class="text-gray-700 mb-4">
          If you have any questions about these Terms, please contact us at:
        </p>
        <div class="bg-gray-100 rounded-lg p-4">
          <p class="text-gray-700 font-semibold mb-2">IDEA LMS Support</p>
          <p class="text-gray-600">Email: support@idea-lms.com</p>
          <p class="text-gray-600">Website: https://idea-lms.com</p>
        </div>
      </section>
    </article>
  </main>

  <!-- Quick Navigation -->
  <nav class="fixed right-4 top-1/2 transform -translate-y-1/2 bg-white rounded-lg shadow-lg p-2 hidden lg:block">
    <p class="text-xs font-semibold text-gray-500 mb-2 px-2">Quick Links</p>
    {#each sections as section}
      <button
        class="block w-full text-left px-2 py-1 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
        on:click={() => scrollToSection(section)}
      >
        {section.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </button>
    {/each}
  </nav>
</div>