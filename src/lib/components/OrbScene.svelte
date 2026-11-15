<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import * as THREE from 'three';

	let {
		isListening = false,
		activeCategory = null,
		voiceLevel = 0
	}: {
		isListening?: boolean;
		activeCategory?: string | null;
		voiceLevel?: number;
	} = $props();

	let targetMouse = { x: 0, y: 0 };
	let smoothMouse = { x: 0, y: 0 };
	let blinkAmount = 0;
	let nextBlinkAt = 3.2;

	const vertexShader = `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		}
	`;

	const fragmentShader = `
		uniform float uTime;
		uniform vec2 uMouse;
		uniform float uBlink;
		uniform float uBoost;
		varying vec2 vUv;

		float sdRoundedBox(vec2 p, vec2 b, float r) {
			vec2 q = abs(p) - b + r;
			return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
		}

		void main() {
			vec2 p = vUv - 0.5;
			float r = length(p);

			float radius = 0.405;
			if (r > radius + 0.085) discard;

			float outerDist = max(r - radius, 0.0);
			float outerGlow = exp(-outerDist * outerDist * 420.0) * (0.48 + uBoost * 0.22);

			float circleMask = smoothstep(radius + 0.0025, radius - 0.0025, r);

			vec2 normXY = p / radius;
			float z = sqrt(max(0.0, 1.0 - dot(normXY, normXY)));
			vec3 normal = normalize(vec3(normXY, z));

			float diag = clamp((-p.x * 0.75 + p.y * 0.85) / radius * 0.5 + 0.5, 0.0, 1.0);
			vec3 topLeftPurple = vec3(0.55, 0.40, 0.94);
			vec3 midViolet     = vec3(0.42, 0.34, 0.86);
			vec3 bottomIndigo  = vec3(0.25, 0.24, 0.74);

			vec3 sphereCol = mix(bottomIndigo, midViolet, smoothstep(0.0, 0.55, diag));
			sphereCol = mix(sphereCol, topLeftPurple, smoothstep(0.45, 1.0, diag));

			vec3 lightDir = normalize(vec3(-0.45 + uMouse.x * 0.35, 0.55 + uMouse.y * 0.35, 0.85));
			float diffuse = max(dot(normal, lightDir), 0.0);
			sphereCol *= (0.86 + diffuse * 0.28);

			float fresnel = pow(1.0 - z, 3.2);
			vec3 rimTint = vec3(0.76, 0.72, 1.0);
			sphereCol += rimTint * fresnel * (0.42 + uBoost * 0.18);

			float edgeRing = exp(-pow((r - (radius - 0.002)) * 220.0, 2.0)) * 0.35;
			sphereCol += vec3(0.85, 0.82, 1.0) * edgeRing;

			vec2 lookOffset = vec2(uMouse.x * 0.115, uMouse.y * 0.095);
			float breatheY = sin(uTime * 1.8) * 0.005;
			vec2 faceCenter = vec2(0.0, 0.068 + breatheY) + lookOffset;

			float eyeSpacing = 0.088 * (1.0 - abs(uMouse.x) * 0.08);
			float eyeWidth = 0.0255;
			float eyeHeight = mix(0.052, 0.0035, uBlink);
			float eyeRadius = min(eyeWidth, eyeHeight) * 0.92;

			vec2 leftEyePos  = p - (faceCenter + vec2(-eyeSpacing, 0.0));
			vec2 rightEyePos = p - (faceCenter + vec2( eyeSpacing, 0.0));

			float dLeft  = sdRoundedBox(leftEyePos,  vec2(eyeWidth, eyeHeight), eyeRadius);
			float dRight = sdRoundedBox(rightEyePos, vec2(eyeWidth, eyeHeight), eyeRadius);
			float dEyes  = min(dLeft, dRight);

			float eyeMask = smoothstep(0.003, -0.003, dEyes);
			float eyeGlow = exp(-max(dEyes, 0.0) * 55.0) * 0.45;

			vec3 finalInside = sphereCol + vec3(0.85, 0.88, 1.0) * eyeGlow;
			finalInside = mix(finalInside, vec3(1.0, 1.0, 1.0), eyeMask);

			vec3 glowCol = vec3(0.54, 0.42, 0.96);
			vec3 finalCol = mix(glowCol * outerGlow * 1.4, finalInside, circleMask);
			float finalAlpha = clamp(max(circleMask, outerGlow), 0.0, 1.0);

			if (finalAlpha <= 0.003) discard;
			gl_FragColor = vec4(finalCol, finalAlpha);
		}
	`;

	const uniforms = {
		uTime: { value: 0 },
		uMouse: { value: new THREE.Vector2(0, 0) },
		uBlink: { value: 0 },
		uBoost: { value: 0 }
	};

	$effect(() => {
		if (typeof window === 'undefined') return;

		const handlePointerMove = (e: PointerEvent) => {
			const nx = (e.clientX / window.innerWidth) * 2 - 1;
			const ny = -((e.clientY / window.innerHeight) * 2 - 1);
			targetMouse.x = Math.max(-1, Math.min(1, nx));
			targetMouse.y = Math.max(-1, Math.min(1, ny));
		};

		const handlePointerLeave = () => {
			targetMouse.x = 0;
			targetMouse.y = 0;
		};

		window.addEventListener('pointermove', handlePointerMove, { passive: true });
		document.addEventListener('mouseleave', handlePointerLeave);

		return () => {
			window.removeEventListener('pointermove', handlePointerMove);
			document.removeEventListener('mouseleave', handlePointerLeave);
		};
	});

	useTask((delta) => {
		const dt = Math.min(delta, 0.05);
		const speed = isListening ? 1.5 : activeCategory ? 1.2 : 1.0;
		uniforms.uTime.value += dt * speed;

		const followRate = 1 - Math.exp(-dt * 11);
		smoothMouse.x += (targetMouse.x - smoothMouse.x) * followRate;
		smoothMouse.y += (targetMouse.y - smoothMouse.y) * followRate;
		uniforms.uMouse.value.set(smoothMouse.x, smoothMouse.y);

		const t = uniforms.uTime.value;
		if (t >= nextBlinkAt) {
			const blinkProgress = (t - nextBlinkAt) / 0.16;
			if (blinkProgress >= 1.0) {
				blinkAmount = 0;
				nextBlinkAt = t + 3.4 + (Math.sin(t * 7.3) * 0.5 + 0.5) * 2.2;
			} else {
				blinkAmount = Math.sin(blinkProgress * Math.PI);
			}
		}
		uniforms.uBlink.value = blinkAmount;

		const targetBoost = Math.min(1.4, (isListening ? 0.55 : activeCategory ? 0.35 : 0.0) + voiceLevel * 0.95);
		uniforms.uBoost.value += (targetBoost - uniforms.uBoost.value) * (1 - Math.exp(-dt * 12));
	});
</script>

<T.PerspectiveCamera makeDefault position={[0, 0, 3.6]} fov={45} near={0.1} far={100} />

<T.Mesh scale={[3.08, 3.08, 1]}>
	<T.PlaneGeometry args={[1, 1]} />
	<T.ShaderMaterial
		{vertexShader}
		{fragmentShader}
		{uniforms}
		transparent={true}
		depthWrite={false}
	/>
</T.Mesh>
