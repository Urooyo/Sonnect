<template>
  <v-btn
    v-bind="$attrs"
    :class="['custom-button', $attrs.class]"
    rounded="xl"
  >
    <slot></slot>
  </v-btn>
</template>

<style lang="scss">
.custom-button {
  &.v-btn {
    border-radius: 24px;
  }
}
</style> 