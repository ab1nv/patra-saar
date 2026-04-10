<script lang="ts">
  import '../app.css'
  let { children } = $props()
</script>

<svelte:head>
  <title>PatraSaar — Sovereign Intelligence for Indian Law</title>
</svelte:head>

{@render children()}
