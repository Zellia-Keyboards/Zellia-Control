<script>
	import { scaleLinear } from 'd3-scale';
	import points from './test.js';

	const yTicks = [0, 2, 4, 6, 8];
	const xTicks = [1980, 1990, 2000, 2010];
	const padding = { top: 20, right: 15, bottom: 20, left: 25 };

	let width = $state(500);
	let height = $state(200);




	function formatMobile(tick) {
		return "'" + tick.toString().slice(-2);
	}
	let minX = $derived(points[0].x);
	let maxX = $derived(points[points.length - 1].x);
	let xScale = $derived(scaleLinear()
		.domain([minX, maxX])
		.range([padding.left, width - padding.right]));
	let yScale = $derived(scaleLinear()
		.domain([Math.min.apply(null, yTicks), Math.max.apply(null, yTicks)])
		.range([height - padding.bottom, padding.top]));
	let path = $derived(`M${points.map((p) => `${xScale(p.x)},${yScale(p.y)}`).join('L')}`);
	let area = $derived(`${path}L${xScale(maxX)},${yScale(0)}L${xScale(minX)},${yScale(0)}Z`);
</script>

<div class="w-full max-w-lg mx-auto" bind:clientWidth={width} bind:clientHeight={height}>
	<svg class="relative w-full h-48 overflow-visible">
		<!-- y axis -->
		<g class="axis y-axis" transform="translate(0, {padding.top})">
			{#each yTicks as tick}
				<g class="tick tick-{tick} text-xs font-extralight text-gray-400" transform="translate(0, {yScale(tick) - padding.bottom})">
					<line x2="100%" />
					<text y="-4">{tick}</text>
				</g>
			{/each}
		</g>

		<!-- x axis -->
		<g class="axis x-axis">
			{#each xTicks as tick}
				<g class="tick tick-{tick} text-xs font-extralight text-gray-400" transform="translate({xScale(tick)},{height})">
					<line y1="-{height}" y2="-{padding.bottom}" x1="0" x2="0" />
					<text y="-2">{width > 380 ? tick : formatMobile(tick)}</text>
				</g>
			{/each}
		</g>

		<!-- data -->
		<path class="fill-teal-700/20" d={area} />
		<path class="fill-none stroke-teal-700 stroke-join-round stroke-cap-round stroke-2" d={path} />
	</svg>
</div>

