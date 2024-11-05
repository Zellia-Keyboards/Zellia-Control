<head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Kanit:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet">
</head>

<script>
  import "../app.css"
  import DeviceSelection from './components/CustomizationOptions.svelte';
  import ProfileSelection from './components/ProfileSelection.svelte';
  import CustomizationOptions from './components/CustomizationOptions.svelte';
  import InfoOptions from './components/InfoOptions.svelte';
  import TopBar from './components/TopBar.svelte';
</script>

<div class="flex h-screen bg-black text-gray-200">
  <!-- Sidebar -->
  <aside class="w-64 flex flex-col p-4 space-y-8 border-r border-gray-500">
    <DeviceSelection />
    <ProfileSelection />
    <CustomizationOptions />
    <InfoOptions />
  </aside>

  <!-- Main Content Area -->
  <main class="flex-1 bg-black">
    <TopBar />

    <!-- Slot for dynamic content -->
    <div class="p-8">
      <p>implementation</p>
    </div>
  </main>
</div>
