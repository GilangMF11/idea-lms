<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';

  // Track scroll position for progress indicator
  let scrollProgress = 0;
  let sections = [
    'introduction',
    'information-we-collect',
    'how-we-use-information',
    'information-sharing',
    'data-security',
    'cookies',
    'user-rights',
    'childrens-privacy',
    'changes',
    'contact'
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
  <title>Privacy Policy - IDEA LMS</title>
  <meta name="description" content="Privacy Policy for IDEA Learning Management System" />
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
        <h1 class="text-xl font-bold text-gray-900">Privacy Policy</h1>
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
          IDEA Learning Management System (IDEA LMS) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our platform.
        </p>
        <p class="text-gray-700 mb-4">
          By using IDEA LMS, you agree to the collection and use of information in accordance with this policy. If you disagree with this policy, please do not use our service.
        </p>
      </section>

      <!-- Information We Collect -->
      <section id="information-we-collect" class="mb-8 scroll-mt-20">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
        <p class="text-gray-700 mb-4">
          We collect several types of information to provide and improve our services:
        </p>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">2.1. Personal Information</h3>
        <ul class="list-disc pl-6 text-gray-700 mb-4">
          <li>Name and contact information (email, phone number)</li>
          <li>Account credentials (username, password)</li>
          <li>Educational information (institution, program, semester)</li>
          <li>Profile information (photo, bio, interests)</li>
        </ul>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">2.2. Usage Information</h3>
        <ul class="list-disc pl-6 text-gray-700 mb-4">
          <li>Platform usage patterns and activity logs</li>
          <li>Course enrollment and completion data</li>
          <li>Assessment and assignment submissions</li>
          <li>Interaction with other users</li>
        </ul>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">2.3. Device and Browser Information</h3>
        <ul class="list-disc pl-6 text-gray-700 mb-4">
          <li>IP address and location data</li>
          <li>Browser type and version</li>
          <li>Device type and operating system</li>
          <li>Referring websites</li>
        </ul>
      </section>

      <!-- How We Use Information -->
      <section id="how-we-use-information" class="mb-8 scroll-mt-20">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
        <p class="text-gray-700 mb-4">
          We use the collected information for various purposes:
        </p>
        <ul class="list-disc pl-6 text-gray-700 mb-4">
          <li><strong>Service Delivery:</strong> To provide, maintain, and improve IDEA LMS</li>
          <li><strong>User Accounts:</strong> To create and manage your account</li>
          <li><strong>Communication:</strong> To send important updates and educational content</li>
          <li><strong>Analytics:</strong> To analyze usage patterns and improve user experience</li>
          <li><strong>Security:</strong> To detect fraud and ensure platform security</li>
          <li><strong>Compliance:</strong> To comply with legal obligations</li>
          <li><strong>Personalization:</strong> To customize content and recommendations</li>
        </ul>
      </section>

      <!-- Information Sharing -->
      <section id="information-sharing" class="mb-8 scroll-mt-20">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">4. Information Sharing</h2>
        <p class="text-gray-700 mb-4">
          We respect your privacy and do not sell your personal information. We may share your information only in specific circumstances:
        </p>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">4.1. Service Providers</h3>
        <p class="text-gray-700 mb-4">
          We may share information with trusted third-party service providers who assist us in operating our platform (e.g., hosting providers, email services, analytics tools). These providers are contractually obligated to protect your information.
        </p>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">4.2. Educational Institutions</h3>
        <p class="text-gray-700 mb-4">
          We may share academic information with your registered educational institution for educational purposes and institutional reporting.
        </p>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">4.3. Legal Requirements</h3>
        <ul class="list-disc pl-6 text-gray-700 mb-4">
          <li>When required by law, court order, or government request</li>
          <li>To protect our rights, property, or safety</li>
          <li>To prevent fraud or illegal activities</li>
        </ul>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">4.4. Business Transfers</h3>
        <p class="text-gray-700 mb-4">
          In the event of a merger, acquisition, or sale of assets, your information may be transferred to the new owner.
        </p>
      </section>

      <!-- Data Security -->
      <section id="data-security" class="mb-8 scroll-mt-20">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">5. Data Security</h2>
        <p class="text-gray-700 mb-4">
          We implement appropriate technical and organizational measures to protect your personal information:
        </p>
        <ul class="list-disc pl-6 text-gray-700 mb-4">
          <li><strong>Encryption:</strong> Data is encrypted in transit and at rest</li>
          <li><strong>Access Controls:</strong> Strict access controls limit who can view your data</li>
          <li><strong>Regular Audits:</strong> We conduct regular security audits and assessments</li>
          <li><strong>Secure Development:</strong> We follow secure coding practices</li>
        </ul>
        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <p class="text-sm text-gray-700">
            <strong>Important:</strong> While we strive to protect your information, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security.
          </p>
        </div>
      </section>

      <!-- Cookies -->
      <section id="cookies" class="mb-8 scroll-mt-20">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">6. Cookies and Tracking</h2>
        <p class="text-gray-700 mb-4">
          We use cookies and similar technologies to enhance your experience:
        </p>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">6.1. Types of Cookies</h3>
        <ul class="list-disc pl-6 text-gray-700 mb-4">
          <li><strong>Essential Cookies:</strong> Required for basic functionality</li>
          <li><strong>Performance Cookies:</strong> Help us understand how you use the platform</li>
          <li><strong>Functionality Cookies:</strong> Remember your preferences</li>
          <li><strong>Marketing Cookies:</strong> Provide relevant content and advertisements</li>
        </ul>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">6.2. Cookie Management</h3>
        <p class="text-gray-700 mb-4">
          You can control and manage cookies through your browser settings. However, disabling cookies may affect certain features of the platform.
        </p>
      </section>

      <!-- User Rights -->
      <section id="user-rights" class="mb-8 scroll-mt-20">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">7. Your Rights</h2>
        <p class="text-gray-700 mb-4">
          Depending on your location, you may have certain rights regarding your personal information:
        </p>
        <ul class="list-disc pl-6 text-gray-700 mb-4">
          <li><strong>Access:</strong> Request a copy of your personal data</li>
          <li><strong>Correction:</strong> Update or correct inaccurate information</li>
          <li><strong>Deletion:</strong> Request deletion of your personal data</li>
          <li><strong>Portability:</strong> Receive your data in a structured format</li>
          <li><strong>Objection:</strong> Object to processing of your data</li>
          <li><strong>Withdrawal:</strong> Withdraw consent for data processing</li>
        </ul>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">7.1. How to Exercise Your Rights</h3>
        <p class="text-gray-700 mb-4">
          To exercise these rights, please contact us using the information provided in Section 10. We will respond to your request within 30 days, subject to legal requirements.
        </p>
      </section>

      <!-- Childrens Privacy -->
      <section id="childrens-privacy" class="mb-8 scroll-mt-20">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">8. Children's Privacy</h2>
        <p class="text-gray-700 mb-4">
          IDEA LMS is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13.
        </p>
        <p class="text-gray-700 mb-4">
          If we discover that we have collected information from a child under 13, we will take immediate steps to delete it. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
        </p>
      </section>

      <!-- Changes -->
      <section id="changes" class="mb-8 scroll-mt-20">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">9. Changes to Privacy Policy</h2>
        <p class="text-gray-700 mb-4">
          We may update our Privacy Policy from time to time. We will notify users of any material changes by:
        </p>
        <ul class="list-disc pl-6 text-gray-700 mb-4">
          <li>Posting the new policy on this page</li>
          <li>Sending an email notification</li>
          <li>Displaying a notice within the platform</li>
        </ul>
        <p class="text-gray-700 mb-4">
          Your continued use of IDEA LMS after the effective date of changes constitutes acceptance of the updated policy.
        </p>
      </section>

      <!-- Contact -->
      <section class="mb-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">10. Contact Us</h2>
        <p class="text-gray-700 mb-4">
          If you have questions, concerns, or requests regarding this Privacy Policy or your personal information, please contact us:
        </p>
        <div class="bg-gray-100 rounded-lg p-4">
          <p class="text-gray-700 font-semibold mb-2">IDEA LMS Privacy Team</p>
          <p class="text-gray-600">Email: privacy@idea-lms.com</p>
          <p class="text-gray-600">Website: https://idea-lms.com</p>
          <p class="text-gray-600">Address: 123 Education Street, Learning City, LC 12345</p>
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