<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // --- Props (由父组件传入的属性) ---
  export let x: number = 0;
  export let y: number = 0;
  export let width: number = 1;
  export let height: number = 1;
  export let rotationAngle: number = 0;
  export let rotationX: number = 0;
  export let rotationY: number = 0;
  export let labels: string[] = [];
  export let index: number = 0;

  // --- 内部状态 ---
  const usize = 54; // 按键的基础单位尺寸 (1U)

  // --- 事件派发器 ---
  // 用于向父组件发送消息
  const dispatch = createEventDispatcher<{ select: number }>();

  function handleClick() {
    // 当按键被点击时，派发 'select' 事件，并附带自己的索引
    dispatch('select', index);
  }

  // --- 工具函数 ---
  function rgbToHex(rgb: { r: number; g: number; b: number } | undefined): string {
    if (!rgb) return '#cccccc'; // 如果颜色未定义，返回默认灰色
    const toHex = (c: number) => ('0' + Math.floor(c).toString(16)).slice(-2);
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }

  function getContrastColor(hexColor: string): string {
    if (hexColor.length !== 7) return '#000000';
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    // 根据亮度计算公式，判断使用黑色还是白色字体
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 140 ? '#000000' : '#FFFFFF';
  }

  // --- 响应式声明 (替代 Vue 的 computed) ---
  // 这些变量会在它们的依赖项改变时自动重新计算

  // 1. 订阅 store 来决定按键是否被选中
  //$: isSelected = $selected_key_index === index;

  // 2. 订阅 store 来获取按键颜色
  //$: color = $rgb_configs[index] ? rgbToHex($rgb_configs[index].rgb) : '#aaaaaa';
  
  // 3. 动态计算按键的字体颜色
  //$: textColor = getContrastColor(color);

  // 4. 计算按键的整体旋转和定位样式
  $: keyStyle = `
    position: absolute;
    left: ${x * usize}px;
    top: ${y * usize}px;
    width: ${width * usize}px;
    height: ${height * usize}px;
    transform-origin: ${rotationX * usize}px ${rotationY * usize}px;
    transform: rotate(${rotationAngle}deg);
    transition: all 0.3s ease-out;
  `;
  
  // 5. 计算按键内部按钮的样式
  $: buttonStyle = `
    background-color: blue;
    color: white;
    outline: 2px solid #00aaff;
    outline-offset: 2px;
  `;

  // 6. 计算不同位置标签的样式
  $: labelContainerStyle = `
    width: ${width * usize - 8}px;
    height: ${height * usize - 8}px;
  `;
</script>

<div class="key-container" style={keyStyle}>
  <button class="keycap" style={buttonStyle} on:mousedown={handleClick}>
    <div class="label-grid" style={labelContainerStyle}>
      {#each Array(9) as _, i}
        <div class="label-cell label-cell-{i}">
          {labels[i] || ''}
        </div>
      {/each}
    </div>
  </button>
</div>

<style>
  .key-container {
    /* 用于定位和旋转 */
    box-sizing: border-box;
    padding: 2px;
  }

  .keycap {
    /* 按键本身的美化样式 */
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    font-weight: 500;
    cursor: pointer;
    box-shadow: 0 4px 0px rgba(0, 0, 0, 0.3), inset 0 -2px 4px rgba(0, 0, 0, 0.2);
    transition: all 0.15s ease;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .keycap:active {
    /* 点击时的下沉效果 */
    transform: translateY(3px);
    box-shadow: 0 1px 0px rgba(0, 0, 0, 0.4), inset 0 -1px 2px rgba(0, 0, 0, 0.2);
  }

  /* 使用 CSS Grid 实现九宫格标签布局 */
  .label-grid {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    grid-template-rows: 1fr auto 1fr;
    width: 100%;
    height: 100%;
    font-size: 14px;
    box-sizing: border-box;
    padding: 4px;
  }
  
  .label-cell {
    display: flex;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* 九宫格对齐 */
  .label-cell-0 { justify-content: flex-start; align-items: flex-start; }
  .label-cell-1 { justify-content: center; align-items: flex-start; }
  .label-cell-2 { justify-content: flex-end; align-items: flex-start; }
  .label-cell-3 { justify-content: flex-start; align-items: center; }
  .label-cell-4 { justify-content: center; align-items: center; font-size: 18px; } /* 中间标签放大 */
  .label-cell-5 { justify-content: flex-end; align-items: center; }
  .label-cell-6 { justify-content: flex-start; align-items: flex-end; }
  .label-cell-7 { justify-content: center; align-items: flex-end; }
  .label-cell-8 { justify-content: flex-end; align-items: flex-end; }
</style>
