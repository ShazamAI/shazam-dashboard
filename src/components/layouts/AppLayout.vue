<script setup lang="ts">
import SidebarNav from '@/components/layouts/SidebarNav.vue';
import MobileSidebar from '@/components/layouts/MobileSidebar.vue';
import TopHeader from '@/components/layouts/TopHeader.vue';
import ToastContainer from '@/components/common/ToastContainer.vue';
import CircuitBreakerAlert from '@/components/common/CircuitBreakerAlert.vue';
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-surface">
    <!-- Circuit Breaker Alert (top bar) -->
    <CircuitBreakerAlert />

    <!-- Desktop sidebar -->
    <SidebarNav />
    <!-- Mobile sidebar (overlay) -->
    <MobileSidebar />

    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <TopHeader />
      <main class="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
        <router-view v-slot="{ Component }">
          <Transition name="v-fade-up" mode="out-in">
            <component :is="Component" />
          </Transition>
        </router-view>
      </main>
    </div>

    <ToastContainer />
  </div>
</template>
