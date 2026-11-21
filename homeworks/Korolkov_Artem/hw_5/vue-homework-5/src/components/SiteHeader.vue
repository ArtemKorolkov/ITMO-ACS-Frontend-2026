<script>
export default {
  name: 'SiteHeader',
}
</script>

<template>
  <header class="site-header">
    <p class="brand">Домашние рецепты</p>
    <nav aria-label="Разделы страницы">
      <a href="#welcome">Главная</a>
      <a href="#recipes">Рецепты</a>
    </nav>
  </header>
</template>

<style>
.site-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: #fffdf8;
  border-bottom: 2px solid #1f4a3e;
}

.brand {
  margin: 0;
  font-weight: 700;
}

.site-header nav {
  display: flex;
  gap: 16px;
}

.site-header a {
  color: #1f4a3e;
}
</style>
