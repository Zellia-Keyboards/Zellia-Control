<script lang="ts">
  import { Keyboard, Heart } from 'lucide-svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import DonationSection from '$lib/components/about/DonationSection.svelte';
  import LibrarySection from '$lib/components/about/LibrarySection.svelte';
  import FeatureGrid from '$lib/components/about/FeatureGrid.svelte';
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
  } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';

  let currentLanguage = $derived($language);

  function openLibraryGitHub() {
    window.open('https://github.com/Zellia-Keyboards/zellia_libamp', '_blank');
  }
</script>

<div class="flex-1 w-full p-6">
  <div class="max-w-4xl mx-auto">
    <header class="mb-8">
      <h2 class="text-3xl font-bold tracking-tight">
        {t('about.title', currentLanguage)}
      </h2>
      <p class="text-muted-foreground mt-2">
        {t('about.subtitle', currentLanguage)}
      </p>
    </header>

    <div class="space-y-8">
      <Card class="glassmorphism-card">
        <CardContent class="p-6 flex items-start gap-6">
          <div class="flex-shrink-0 size-16 rounded-lg flex items-center justify-center bg-muted">
            <Keyboard class="size-8 text-primary-600" />
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-bold mb-3">
              {t('about.appName', currentLanguage)}
            </h3>
            <p class="text-sm text-muted-foreground mb-4">
              {t('about.appDescription', currentLanguage)}
            </p>
            <div class="flex items-center gap-2">
              <Badge variant="secondary" class="bg-primary-500/10 text-primary-600 hover:bg-primary-500/15">
                {t('about.version', currentLanguage)}
              </Badge>
              <Badge variant="outline">
                {t('about.builtWith', currentLanguage)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <FeatureGrid />
      <LibrarySection onGitHubClick={openLibraryGitHub} />
      <DonationSection />

      <Card class="glassmorphism-card">
        <CardContent class="p-6 text-center">
          <h3 class="text-xl font-bold mb-4 flex items-center justify-center gap-2">
            Made with <Heart class="size-5 text-destructive fill-destructive" /> for the Hall Effect keyboard community
          </h3>
          <p class="text-sm text-muted-foreground">
            © 2025 Zellia Control. All rights reserved
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
</div>
