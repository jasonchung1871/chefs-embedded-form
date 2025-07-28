<script setup>
import EmbeddedForm from '@/components/EmbeddedForm.vue'
</script>

<template>
  <header>
    <h1>CHEFS Embedded Form Demo</h1>
  </header>

  <main>
    <!-- Production Form Component -->
    <EmbeddedForm />
  </main>
</template>

<style scoped>
header {
  line-height: 1.5;
  text-align: center;
  padding: 20px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

header h1 {
  margin: 10px 0;
  color: #333;
}

.logo {
  display: block;
  margin: 0 auto 1rem;
}

main {
  padding: 20px;
}

@media (min-width: 1024px) {
  header {
    display: block;
  }
}
</style>
