<script>
import SiteHeader from './components/SiteHeader.vue'
import RecipeList from './components/RecipeList.vue'

export default {
  name: 'App',
  components: {
    SiteHeader,
    RecipeList,
  },
  data() {
    return {
      recipes: [
        {
          id: 'syrniki',
          title: 'Сырники из творога',
          time: 25,
          image:
            'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=900&h=600&q=80',
          description: 'Мягкие творожные сырники для домашнего завтрака.',
          favorite: false,
        },
        {
          id: 'borscht',
          title: 'Домашний борщ',
          time: 90,
          image:
            'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&h=600&q=80',
          description: 'Наваристый борщ на говядине со свёклой и капустой.',
          favorite: false,
        },
        {
          id: 'sharlotka',
          title: 'Шарлотка с яблоками',
          time: 55,
          image:
            'https://images.unsplash.com/photo-1621303837174-89787a7d4729?auto=format&fit=crop&w=900&h=600&q=80',
          description: 'Простая яблочная шарлотка к чаю.',
          favorite: false,
        },
      ],
    }
  },
  computed: {
    favoriteCount() {
      return this.recipes.filter((recipe) => recipe.favorite).length
    },
  },
  methods: {
    toggleFavorite(id) {
      const recipe = this.recipes.find((item) => item.id === id)

      if (recipe) {
        recipe.favorite = !recipe.favorite
      }
    },
  },
}
</script>

<template>
  <SiteHeader />

  <main class="page">
    <section class="welcome" id="welcome">
      <p class="stamp">Моя кулинарная коллекция</p>
      <h1>Домашние рецепты</h1>
      <p>
        Это небольшое учебное приложение на Vue. Здесь три знакомых блюда из
        сайта «Домашние рецепты». Их можно отметить как избранные.
      </p>
      <p v-if="favoriteCount === 0">Пока ничего не добавлено в избранное.</p>
      <p v-else>В избранном: {{ favoriteCount }}</p>
    </section>

    <RecipeList :recipes="recipes" @toggle-favorite="toggleFavorite" />
  </main>
</template>
