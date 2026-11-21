<script>
export default {
  name: 'RecipeCard',
  props: {
    recipe: {
      type: Object,
      required: true,
    },
  },
  methods: {
    addToFavorite() {
      this.$emit('toggle-favorite', this.recipe.id)
    },
  },
}
</script>

<template>
  <article class="recipe-card">
    <img :src="recipe.image" :alt="recipe.title" />
    <h3>{{ recipe.title }}</h3>
    <p>{{ recipe.description }}</p>
    <p>Время приготовления: {{ recipe.time }} мин</p>
    <button type="button" @click="addToFavorite">
      <span v-if="recipe.favorite">В избранном</span>
      <span v-else>В избранное</span>
    </button>
  </article>
</template>

<style>
.recipe-card {
  background: #fffdf8;
  border: 1px solid #e4d8c8;
  border-radius: 8px;
  padding: 12px;
}

.recipe-card img {
  width: 100%;
  height: 160px;
  object-fit: cover;
  border-radius: 8px;
  background: #efe4d4;
}

.recipe-card h3 {
  margin: 12px 0 8px;
}

.recipe-card p {
  margin: 0 0 8px;
}

.recipe-card button {
  border: 0;
  border-radius: 8px;
  padding: 8px 12px;
  background: #8f3f2b;
  color: #fff;
  cursor: pointer;
}
</style>
