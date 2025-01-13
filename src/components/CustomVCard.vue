<template>
  <v-card
    class="custom-card"
    v-bind="$attrs"
  >
    <slot></slot>
  </v-card>
</template>

<style lang="scss">
.custom-card.v-card {
  // Material Design 3 스타일 적용
  border-radius: 12px;
  background: rgb(var(--md-sys-color-surface));
  box-shadow: var(--md-sys-elevation-1);
  
  // 호버 효과
  &:hover {
    box-shadow: var(--md-sys-elevation-2);
  }
  
  // 내부 패딩
  .v-card-text {
    padding: 24px;
  }
  
  // 헤더 스타일
  .v-card-title {
    font-size: 1.25rem;
    color: rgb(var(--md-sys-color-on-surface));
  }
}
</style> 