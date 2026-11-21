<script>
import RecipeCard from './RecipeCard.vue'

export default {
  name: 'RecipeList',
  components: {
    RecipeCard,
  },
  props: {
    recipes: {
      type: Array,
      required: true,
    },
  },
  methods: {
    onToggleFavorite(id) {
      this.$emit('toggle-favorite', id)
    },
  },
}
</script>

<template>
  <section id="recipes">
    <h2>Три рецепта для примера</h2>
    <div class="recipe-list">
      <RecipeCard
        v-for="recipe in recipes"
        :key="recipe.id"
        :recipe="recipe"
        @toggle-favorite="onToggleFavorite"
      />
    </div>
  </section>
</template>

<style>
.recipe-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
</style>
