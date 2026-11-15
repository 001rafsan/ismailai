<script lang="ts">
	import { onMount } from 'svelte';
	import { goto, preloadCode, preloadData } from '$app/navigation';
	import { Canvas } from '@threlte/core';
	import OrbScene from '#lib/components/OrbScene.svelte';
	import {
		orchestrateCommand,
		type OrchestratorResponse,
		type PipelineStage
	} from '../lib/orchestrator';
	import { multiAgentStore } from '../lib/multiAgentStore.svelte';
	import gsap from 'gsap';
	import { ScrollTrigger } from 'gsap/ScrollTrigger';
	import Lenis from 'lenis';

	// State management with Svelte 5 Runes
	let activeNav = $state('Home');
	let selectedCategory = $state<string | null>(null);
	let hoveredCategory = $state<string | null>(null);
	let hoverCloseTimer: ReturnType<typeof setTimeout> | null = null;

	function openDomainHover(cls: string) {
		if (hoverCloseTimer) {
			clearTimeout(hoverCloseTimer);
			hoverCloseTimer = null;
		}
		hoveredCategory = cls;
	}

	function scheduleCloseDomainHover(cls: string) {
		if (hoverCloseTimer) clearTimeout(hoverCloseTimer);
		hoverCloseTimer = setTimeout(() => {
			if (hoveredCategory === cls) hoveredCategory = null;
		}, 140);
	}

	type BranchNode = {
		projectId: string;
		label: string;
		pm: string;
		size: 'sm' | 'md' | 'lg';
		gapX: number;
		offsetY: number;
		wirePath: string;
		dotX: number;
		dotY: number;
	};

	const BRANCH_W = 340;
	const BRANCH_H = 360;
	const ANCHOR_Y = BRANCH_H / 2;

	function buildBranchNodes(
		catCls: string,
		side: 'left' | 'right',
		subs: Array<{ projectId: string; label: string; pm: string }>
	): BranchNode[] {
		const presets4: Array<{ gapX: number; offsetY: number; size: 'sm' | 'md' | 'lg' }> = [
			{ gapX: -8, offsetY: -108, size: 'md' },
			{ gapX: 24, offsetY: -36, size: 'sm' },
			{ gapX: 30, offsetY: 38, size: 'md' },
			{ gapX: 14, offsetY: 118, size: 'lg' }
		];
		const presets2Research: Array<{ gapX: number; offsetY: number; size: 'sm' | 'md' | 'lg' }> = [
			{ gapX: 48, offsetY: -56, size: 'sm' },
			{ gapX: 30, offsetY: 44, size: 'lg' }
		];
		const presets2Default: Array<{ gapX: number; offsetY: number; size: 'sm' | 'md' | 'lg' }> = [
			{ gapX: 34, offsetY: -54, size: 'sm' },
			{ gapX: 52, offsetY: 46, size: 'lg' }
		];

		const layout =
			subs.length >= 4
				? presets4
				: catCls === 'research'
					? presets2Research
					: presets2Default;

		return subs.map((sub, i) => {
			const spec = layout[i] ?? { gapX: 36, offsetY: (i - (subs.length - 1) / 2) * 76, size: 'md' };
			const endY = ANCHOR_Y + spec.offsetY;
			const startX = side === 'left' ? BRANCH_W : 0;
			const endX = side === 'left' ? BRANCH_W - spec.gapX : spec.gapX;
			const ctrl1X = side === 'left' ? startX - 28 : startX + 28;
			const ctrl2X = side === 'left' ? endX + 26 : endX - 26;
			const wirePath = `M ${startX} ${ANCHOR_Y} C ${ctrl1X} ${ANCHOR_Y}, ${ctrl2X} ${endY}, ${endX} ${endY}`;
			return {
				...sub,
				size: spec.size,
				gapX: spec.gapX,
				offsetY: spec.offsetY,
				wirePath,
				dotX: endX,
				dotY: endY
			};
		});
	}
	let commandText = $state('');
	let inputPlaceholder = $state('Say a command... (English / বাংলা)');
	let isListening = $state(false);
	let soundPlaying = $state(false);
	let voiceLang = $state<'en-US' | 'bn-BD'>('en-US');
	let pipelineStage = $state<PipelineStage>('idle');
	let lastOrchestratorResult = $state<OrchestratorResponse | null>(null);
	let orchestratorOpen = $state(false);
	let typedDisplayReply = $state('');
	let isTypingReply = $state(false);
	let typingTimer: ReturnType<typeof setInterval> | null = null;

	// Real-time Web Audio API voice tone bars (strictly reacts to actual voice tone, never random!)
	const BASE_BARS = [8, 16, 26, 16, 8];
	let voiceBars = $state<number[]>([...BASE_BARS]);
	let voiceLevel = $state(0);

	// Derived active popup state: whichever category is hovered/touched, or selected
	let activePopupCategory = $derived(hoveredCategory ?? selectedCategory);

	// Toast & Popover states
	let toastMessage = $state('');
	let toastVisible = $state(false);
	let popoverOpen = $state(false);
	let popoverTitle = $state('');
	let popoverDescription = $state('');

	let bgVideoEl: HTMLVideoElement;
	let terrainCanvasEl: HTMLCanvasElement;
	let commandInputEl: HTMLInputElement;
	let appRootEl: HTMLDivElement;
	let transitionVeilEl: HTMLDivElement;
	let zoomPortalEl: HTMLDivElement;
	let zoomPortalContentEl: HTMLDivElement;
	let initialSavedOrigin = {
		originX: 36,
		originY: 218,
		left: 14,
		top: 197,
		width: 44,
		height: 42,
		navName: 'Home',
		iconHref: '#i-layers',
		labelText: ''
	};
	let initialReturning = false;
	if (typeof window !== 'undefined') {
		try {
			const navState = sessionStorage.getItem('lusion_nav_state');
			const rawOrigin = sessionStorage.getItem('lusion_zoom_origin');
			if (rawOrigin) {
				initialSavedOrigin = { ...initialSavedOrigin, ...JSON.parse(rawOrigin) };
			}
			if (navState === 'reverse' || navState === 'in-admin') {
				initialReturning = true;
			}
		} catch {}
	}

	let portalIconHref = $state(initialReturning ? initialSavedOrigin.iconHref || '' : '');
	let portalLabelText = $state(initialReturning ? initialSavedOrigin.labelText || '' : '');
	let isTransitioningOut = $state(false);
	let isZooming = $state(initialReturning);
	let isReturningFromAdmin = $state(initialReturning);
	let orbWebglReady = $state(!initialReturning);
	let returnOriginX = $state(initialSavedOrigin.originX);
	let returnOriginY = $state(initialSavedOrigin.originY);
	const lenisSmoothEase = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t));

	let toastTimeout: ReturnType<typeof setTimeout>;
	let recognition: any = null;

	// Web Audio API microphone analyser state
	let micStream: MediaStream | null = null;
	let micAudioCtx: AudioContext | null = null;
	let micAnalyser: AnalyserNode | null = null;
	let micRafId = 0;

	// Official Lusion.co Audio Assets (generic.ogg, hover_0.ogg, click_0.ogg)
	let bgmAudio: HTMLAudioElement | null = null;
	let hoverAudio: HTMLAudioElement | null = null;
	let clickAudio: HTMLAudioElement | null = null;

	const navItems = [
		{ id: 'Home', icon: '#i-home' },
		{ id: 'Apps', icon: '#i-grid' },
		{ id: 'Projects', icon: '#i-layers' },
		{ id: 'Analytics', icon: '#i-chart' },
		{ id: 'AI Tools', icon: '#i-sparkle' },
		{ id: 'Settings', icon: '#i-settings' }
	];

	const categories = [
		{ id: 'Research', side: 'left', cls: 'research', icon: '#i-layers', subtitle: 'Explore · Analyze' },
		{ id: 'Team', side: 'left', cls: 'team', icon: '#i-users', subtitle: 'Manage · Assign' },
		{ id: 'Sales', side: 'left', cls: 'sales', icon: '#i-trending', subtitle: 'Leads · Revenue' },
		{ id: 'Web Chat', side: 'left', cls: 'marketing', icon: '#i-web-chat', subtitle: 'Campaigns · Growth' },
		{ id: 'Phones', side: 'right', cls: 'finance', icon: '#i-phone', subtitle: 'Budget · Reports' },
		{ id: 'Text', side: 'right', cls: 'content', icon: '#i-text-sms', subtitle: 'Write · Edit · Publish' },
		{ id: 'WhatsApp', key: 'WhatsApp', side: 'right', cls: 'design', icon: '#i-whatsapp', subtitle: 'Leads · Broadcast · Chat' },
		{ id: 'Email', side: 'right', cls: 'development', icon: '#i-mail', subtitle: 'Build · Deploy · Monitor' }
	];

	const DOMAIN_SUBDOMAINS: Record<string, Array<{ projectId: string; label: string; pm: string }>> = {
		research: [
			{ projectId: 'researchgoal-lab', label: 'ResearchGoal Virtual Lab', pm: 'Nova' },
			{ projectId: 'portfolio-social', label: 'Market & Brand Research', pm: 'Aria' }
		],
		team: [
			{ projectId: 'portfolio-social', label: 'Portfolio & Social Team', pm: 'Aria' },
			{ projectId: 'applyglobal-ops', label: 'ApplyGlobal Admissions Team', pm: 'Zayd' },
			{ projectId: 'researchgoal-lab', label: 'Virtual Lab R&D Team', pm: 'Nova' },
			{ projectId: 'account-finance', label: 'Account & Finance Team', pm: 'Kairo' }
		],
		sales: [
			{ projectId: 'applyglobal-ops', label: 'ApplyGlobal Leads & Sales', pm: 'Zayd' },
			{ projectId: 'account-finance', label: 'Revenue & Commissions', pm: 'Kairo' }
		],
		marketing: [
			{ projectId: 'portfolio-social', label: 'Social Media & Reels', pm: 'Aria' },
			{ projectId: 'applyglobal-ops', label: 'Partner Campaigns', pm: 'Zayd' }
		],
		finance: [
			{ projectId: 'account-finance', label: 'Daily / Weekly / Monthly Reports', pm: 'Kairo' },
			{ projectId: 'applyglobal-ops', label: 'Partner Call Routing', pm: 'Zayd' }
		],
		content: [
			{ projectId: 'portfolio-social', label: 'Portfolio & Social Copy', pm: 'Aria' },
			{ projectId: 'researchgoal-lab', label: 'Research Docs & UX', pm: 'Nova' }
		],
		design: [
			{ projectId: 'applyglobal-ops', label: 'Nigeria WhatsApp Bot', pm: 'Zayd' },
			{ projectId: 'portfolio-social', label: 'Client WhatsApp Broadcasts', pm: 'Aria' }
		],
		development: [
			{ projectId: 'account-finance', label: 'Account Follow-up Emails', pm: 'Kairo' },
			{ projectId: 'researchgoal-lab', label: 'Sprint & QA Digests', pm: 'Nova' }
		]
	};

	const quickPrompts = [
		{ label: 'Create a project', icon: '#i-plus' },
		{ label: 'Show analytics', icon: '#i-chart' },
		{ label: 'Schedule a meeting', icon: '#i-calendar' },
		{ label: 'Generate report', icon: '#i-file' }
	];

	function initLusionAudio() {
		if (typeof window === 'undefined') return;
		if (!bgmAudio) {
			bgmAudio = new Audio('/lusion-bgm.ogg');
			bgmAudio.loop = true;
			bgmAudio.volume = 0.55;
		}
		if (!hoverAudio) {
			hoverAudio = new Audio('/lusion-hover.ogg');
			hoverAudio.volume = 0.35;
		}
		if (!clickAudio) {
			clickAudio = new Audio('/lusion-click.ogg');
			clickAudio.volume = 0.45;
		}
	}

	function startLusionAudio() {
		initLusionAudio();
		if (bgmAudio) {
			bgmAudio
				.play()
				.then(() => {
					soundPlaying = true;
				})
				.catch(() => {
					soundPlaying = false;
				});
		}
	}

	function stopLusionAudio() {
		if (bgmAudio) {
			bgmAudio.pause();
		}
		soundPlaying = false;
	}

	function toggleSound() {
		if (soundPlaying) {
			stopLusionAudio();
		} else {
			startLusionAudio();
		}
	}

	function playHoverSound() {
		if (!soundPlaying || !hoverAudio) return;
		hoverAudio.currentTime = 0;
		hoverAudio.play().catch(() => {});
	}

	function playClickSound() {
		if (!soundPlaying || !clickAudio) return;
		clickAudio.currentTime = 0;
		clickAudio.play().catch(() => {});
	}

	function notify(message: string) {
		toastMessage = message;
		toastVisible = true;
		clearTimeout(toastTimeout);
		toastTimeout = setTimeout(() => {
			toastVisible = false;
		}, 3900);
	}

	function showPopover(title: string, description: string) {
		popoverTitle = title;
		popoverDescription = description;
		popoverOpen = true;
	}

	function navigateWithLusionZoom(
		targetUrl: string,
		triggerEl?: HTMLElement | null,
		navName: string = 'Projects'
	) {
		if (isTransitioningOut) return;
		isTransitioningOut = true;
		isZooming = true;
		hoveredCategory = null;
		gsap.killTweensOf([appRootEl, zoomPortalEl, zoomPortalContentEl, transitionVeilEl]);

		const rect = triggerEl?.getBoundingClientRect();
		const originX = rect ? Math.round(rect.left + rect.width / 2) : 36;
		const originY = rect ? Math.round(rect.top + rect.height / 2) : 218;
		const boxLeft = rect ? Math.round(rect.left) : originX - 22;
		const boxTop = rect ? Math.round(rect.top) : originY - 21;
		const boxW = rect ? Math.round(rect.width) : 44;
		const boxH = rect ? Math.round(rect.height) : 42;

		const isIconOnlyBtn = triggerEl?.classList.contains('nav-btn') ?? false;
		const useEl = triggerEl?.querySelector('use');
		const detectedIcon = useEl?.getAttribute('href') ?? '';
		let detectedText = '';
		if (triggerEl && !isIconOnlyBtn) {
			detectedText = (triggerEl.textContent ?? '').trim();
		}
		portalIconHref = detectedIcon;
		portalLabelText = detectedText;

		try {
			sessionStorage.setItem('lusion_nav_state', 'forward');
			sessionStorage.setItem(
				'lusion_zoom_origin',
				JSON.stringify({
					originX,
					originY,
					left: boxLeft,
					top: boxTop,
					width: boxW,
					height: boxH,
					navName,
					iconHref: detectedIcon,
					labelText: detectedText
				})
			);
		} catch {}

		const tl = gsap.timeline();

		// Pure GPU compositor animation: move transparent logo from button -> center while growing small -> big & fading out smoothly
		if (zoomPortalEl && zoomPortalContentEl) {
			const centerX = Math.round(window.innerWidth / 2);
			const centerY = Math.round(window.innerHeight / 2);
			const targetScale = detectedIcon && !detectedText ? 9.5 : 4.2;
			gsap.set(zoomPortalEl, {
				x: originX,
				y: originY,
				opacity: 1,
				force3D: true
			});
			gsap.set(zoomPortalContentEl, {
				scale: 1,
				opacity: 0.85,
				force3D: true
			});
			tl.to(
				zoomPortalEl,
				{
					x: centerX,
					y: centerY,
					duration: 0.52,
					ease: 'power3.out',
					force3D: true
				},
				0
			);
			tl.to(
				zoomPortalContentEl,
				{
					scale: targetScale,
					duration: 0.62,
					ease: 'power2.inOut',
					force3D: true
				},
				0
			);
			tl.to(
				zoomPortalContentEl,
				{
					opacity: 0,
					duration: 0.32,
					ease: 'power2.out'
				},
				0.3
			);
		}

		if (appRootEl) {
			gsap.set(appRootEl, {
				transformOrigin: `${originX}px ${originY}px`,
				force3D: true
			});
			tl.to(
				appRootEl,
				{
					scale: 1.72,
					opacity: 0,
					duration: 0.54,
					ease: 'power2.inOut',
					force3D: true
				},
				0
			);
		}

		if (transitionVeilEl) {
			tl.fromTo(
				transitionVeilEl,
				{ opacity: 0, pointerEvents: 'auto' },
				{ opacity: 1, duration: 0.48, ease: 'power2.inOut' },
				0.06
			);
		}

		setTimeout(() => {
			goto(targetUrl);
		}, 580);
	}

	function handleNavClick(navName: string, ev?: MouseEvent) {
		playClickSound();
		activeNav = navName;
		const btn = (ev?.currentTarget as HTMLElement | null) ?? null;
		if (navName === 'Apps') {
			navigateWithLusionZoom('/admin', btn, 'Apps');
			return;
		}
		if (navName === 'Projects') {
			navigateWithLusionZoom('/admin?nav=Projects', btn, 'Projects');
			return;
		}
		if (navName === 'Analytics') {
			navigateWithLusionZoom('/admin?nav=Analytics', btn, 'Analytics');
			return;
		}
		if (navName === 'Settings') {
			navigateWithLusionZoom('/admin?nav=Settings', btn, 'Settings');
			return;
		}
		if (navName !== 'Home') {
			showPopover(navName, `${navName} is ready for integration with your application routes.`);
		} else {
			popoverOpen = false;
		}
	}

	function handleCategoryClick(categoryKey: string, categoryLabel: string) {
		playClickSound();
		// Toggle selection if clicking the same category, or select the new one
		if (selectedCategory === categoryKey) {
			selectedCategory = null;
			inputPlaceholder = 'Say a command...';
		} else {
			selectedCategory = categoryKey;
			inputPlaceholder = `Ask ${categoryLabel} AI to do something...`;
			commandInputEl?.focus();
		}
	}

	function handleQuickPrompt(prompt: string) {
		playClickSound();
		commandText = prompt;
		executeCommand(prompt, 'text');
		if (commandInputEl) {
			commandInputEl.focus();
		}
	}

	function speakReply(text: string, lang: 'bn' | 'banglish' | 'en') {
		if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
		try {
			window.speechSynthesis.cancel();
			const utter = new SpeechSynthesisUtterance(text);
			const voices = window.speechSynthesis.getVoices();
			if (lang === 'bn') {
				utter.lang = 'bn-BD';
				const bnVoice = voices.find((v) => v.lang.toLowerCase().startsWith('bn'));
				if (bnVoice) utter.voice = bnVoice;
			} else {
				utter.lang = 'en-US';
				const enVoice = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
				if (enVoice) utter.voice = enVoice;
			}
			utter.rate = 1.02;
			utter.pitch = 1.0;
			window.speechSynthesis.speak(utter);
		} catch {
			// Ignore TTS errors if speechSynthesis is blocked
		}
	}

	function startTypingReply(fullText: string) {
		if (typingTimer) {
			clearInterval(typingTimer);
			typingTimer = null;
		}
		typedDisplayReply = '';
		isTypingReply = true;
		let idx = 0;
		typingTimer = setInterval(() => {
			idx = Math.min(fullText.length, idx + 2);
			typedDisplayReply = fullText.slice(0, idx);
			if (idx >= fullText.length) {
				isTypingReply = false;
				if (typingTimer) {
					clearInterval(typingTimer);
					typingTimer = null;
				}
			}
		}, 16);
	}

	function executeCommand(rawText: string, modality: 'voice' | 'text') {
		const trimmed = rawText.trim();
		if (!trimmed) {
			notify('Enter or speak a command first.');
			return;
		}
		pipelineStage = 'interpreting';
		const selectedCatObj = categories.find((c) => c.cls === selectedCategory);
		const res = orchestrateCommand(trimmed, {
			modality,
			selectedCategoryLabel: selectedCatObj?.id ?? null,
			activeProjectId: multiAgentStore.activeProjectId,
			lastResult: lastOrchestratorResult
		});

		lastOrchestratorResult = res;
		orchestratorOpen = true;
		startTypingReply(res.display_reply);
		pipelineStage = res.requires_approval ? 'awaiting_approval' : 'completed';

		// Highlight & pop up the routed module card
		if (res.categoryCls) {
			selectedCategory = res.categoryCls;
		}

		// Speak concise response via TTS (Voice AI Pipeline: STT -> LLM -> TTS)
		if (modality === 'voice' || soundPlaying) {
			speakReply(res.spoken_reply, res.language);
		}
	}

	function approvePendingAction() {
		if (!lastOrchestratorResult) return;
		playClickSound();
		const approvedText =
			lastOrchestratorResult.language === 'en'
				? `Action staged & confirmed: ${lastOrchestratorResult.pending_action}. Connect live provider credentials to dispatch externally.`
				: `অনুমোদন সম্পন্ন: ${lastOrchestratorResult.pending_action}। লাইভ প্রোভাইডার কানেক্ট করলে এটি ডিসপ্যাচ হবে।`;
		lastOrchestratorResult = {
			...lastOrchestratorResult,
			status: 'completed',
			status_detail: 'Approved by user (awaiting live connector)',
			requires_approval: false,
			display_reply: approvedText
		};
		pipelineStage = 'completed';
		notify(approvedText);
	}

	function toggleVoiceLanguage() {
		playClickSound();
		voiceLang = voiceLang === 'en-US' ? 'bn-BD' : 'en-US';
		if (recognition) {
			recognition.lang = voiceLang;
		}
		inputPlaceholder =
			voiceLang === 'bn-BD'
				? 'বাংলা বা ইংরেজিতে বলুন বা লিখুন...'
				: 'Say a command... (English / বাংলা)';
		notify(
			voiceLang === 'bn-BD'
				? 'Voice STT switched to বাংলা (bn-BD)'
				: 'Voice STT switched to English (en-US)'
		);
	}

	async function startVoiceMonitor() {
		if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
		try {
			micStream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true
				}
			});
			const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
			micAudioCtx = new AudioCtx();
			const source = micAudioCtx.createMediaStreamSource(micStream);
			micAnalyser = micAudioCtx.createAnalyser();
			micAnalyser.fftSize = 128;
			micAnalyser.smoothingTimeConstant = 0.72;
			source.connect(micAnalyser);

			const data = new Uint8Array(micAnalyser.frequencyBinCount);
			const binIndices = [2, 5, 9, 14, 20];

			const updateMeter = () => {
				if (!micAnalyser || !isListening) return;
				micAnalyser.getByteFrequencyData(data);

				let sum = 0;
				const nextBars = binIndices.map((idx, i) => {
					const v = data[idx] / 255;
					sum += v;
					// Noise floor gate: if silent (< 0.05), keep bar calm at base height (no random jumping!)
					const gated = Math.max(0, v - 0.055) / 0.945;
					const base = BASE_BARS[i];
					return Math.round(base + gated * (i === 2 ? 22 : 24));
				});

				voiceBars = nextBars;
				voiceLevel = Math.min(1, Math.max(0, sum / binIndices.length - 0.05) * 1.9);
				micRafId = requestAnimationFrame(updateMeter);
			};

			micRafId = requestAnimationFrame(updateMeter);
		} catch {
			// Mic permission denied or unavailable; bars stay calm instead of faking random motion
			voiceBars = [...BASE_BARS];
			voiceLevel = 0;
		}
	}

	function stopVoiceMonitor() {
		if (micRafId) {
			cancelAnimationFrame(micRafId);
			micRafId = 0;
		}
		if (micStream) {
			micStream.getTracks().forEach((t) => t.stop());
			micStream = null;
		}
		if (micAudioCtx) {
			micAudioCtx.close().catch(() => {});
			micAudioCtx = null;
		}
		micAnalyser = null;
		voiceBars = [...BASE_BARS];
		voiceLevel = 0;
	}

	function handleCommandSubmit(e: SubmitEvent) {
		e.preventDefault();
		playClickSound();
		executeCommand(commandText, 'text');
	}

	function toggleMic() {
		playClickSound();

		if (isListening) {
			isListening = false;
			pipelineStage = 'idle';
			stopVoiceMonitor();
			try {
				recognition?.stop();
			} catch {
				// ignore
			}
			if (!commandText) {
				inputPlaceholder =
					voiceLang === 'bn-BD'
						? 'বাংলা বা ইংরেজিতে বলুন বা লিখুন...'
						: 'Say a command... (English / বাংলা)';
			}
			return;
		}

		isListening = true;
		pipelineStage = 'listening';
		inputPlaceholder = voiceLang === 'bn-BD' ? 'শুনছি... বাংলা বা ইংরেজিতে বলুন' : 'Listening...';
		startVoiceMonitor();

		if (!recognition) {
			notify('SpeechRecognition is unavailable in this browser; microphone meter is active.');
			return;
		}
		try {
			recognition.lang = voiceLang;
			recognition.start();
		} catch {
			// Keep voice monitor active
		}
	}

	onMount(() => {
		gsap.registerPlugin(ScrollTrigger);
		preloadCode('/admin').catch(() => {});
		preloadData('/admin').catch(() => {});

		const unlockAudioOnce = () => {
			if (!soundPlaying) {
				startLusionAudio();
			}
			window.removeEventListener('pointerdown', unlockAudioOnce);
			window.removeEventListener('keydown', unlockAudioOnce);
		};
		window.addEventListener('pointerdown', unlockAudioOnce, { once: true });
		window.addEventListener('keydown', unlockAudioOnce, { once: true });

		// 1. Initialize Lenis Smooth Scrolling + GSAP ScrollTrigger sync
		const lenis = new Lenis({
			duration: 1.15,
			easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
			smoothWheel: true
		});

		lenis.on('scroll', ScrollTrigger.update);

		const gsapTicker = (time: number) => {
			lenis.raf(time * 1000);
		};
		gsap.ticker.add(gsapTicker);
		gsap.ticker.lagSmoothing(0);

		// 2. GSAP entrance animations (with Button-Targeted Reverse Zoom-Back when returning from Admin)
		let returningFromPage = initialReturning;
		let savedOrigin = { ...initialSavedOrigin };
		try {
			const navState = sessionStorage.getItem('lusion_nav_state');
			const rawOrigin = sessionStorage.getItem('lusion_zoom_origin');
			if (rawOrigin) {
				savedOrigin = { ...savedOrigin, ...JSON.parse(rawOrigin) };
			}
			if (navState === 'reverse' || navState === 'in-admin' || returningFromPage) {
				returningFromPage = true;
				sessionStorage.removeItem('lusion_nav_state');
			}
		} catch {}

		if (!returningFromPage) {
			initLusionAudio();
			bgVideoEl?.play().catch(() => {});
			startLusionAudio();
		} else {
			isZooming = true;
			returnOriginX = savedOrigin.originX;
			returnOriginY = savedOrigin.originY;
			portalIconHref = savedOrigin.iconHref || '';
			portalLabelText = savedOrigin.labelText || '';
		}

		const ctx = gsap.context(() => {
			if (returningFromPage) {
				if (transitionVeilEl) {
					gsap.fromTo(
						transitionVeilEl,
						{ opacity: 1, pointerEvents: 'none' },
						{
							opacity: 0,
							duration: 0.38,
							ease: 'power2.out',
							onComplete: () => {
								isReturningFromAdmin = false;
							}
						}
					);
				}
				if (zoomPortalEl && zoomPortalContentEl) {
					const centerX = Math.round(window.innerWidth / 2);
					const centerY = Math.round(window.innerHeight / 2);
					const startScale = savedOrigin.iconHref && !savedOrigin.labelText ? 8.5 : 3.8;
					gsap.fromTo(
						zoomPortalEl,
						{
							x: centerX,
							y: centerY,
							opacity: 1,
							force3D: true
						},
						{
							x: savedOrigin.originX,
							y: savedOrigin.originY,
							opacity: 1,
							duration: 0.42,
							ease: 'power3.out',
							force3D: true
						}
					);
					gsap.fromTo(
						zoomPortalContentEl,
						{
							scale: startScale,
							opacity: 0.78,
							force3D: true
						},
						{
							scale: 1,
							opacity: 0,
							duration: 0.42,
							ease: 'power3.out',
							force3D: true
						}
					);
				}
				if (appRootEl) {
					gsap.fromTo(
						appRootEl,
						{
							transformOrigin: `${savedOrigin.originX}px ${savedOrigin.originY}px`,
							scale: 1.62,
							opacity: 0,
							force3D: true
						},
						{
							scale: 1,
							opacity: 1,
							duration: 0.44,
							ease: 'power3.out',
							force3D: true,
							clearProps: 'transform,transformOrigin,opacity',
							onComplete: () => {
								isZooming = false;
								isReturningFromAdmin = false;
								orbWebglReady = true;
								requestAnimationFrame(() => {
									drawTerrain();
									initLusionAudio();
									bgVideoEl?.play().catch(() => {});
									startLusionAudio();
								});
							}
						}
					);
				}
				// Highlight the exact originating button as the reverse zoom lands on it
				const originBtn =
					document.querySelector<HTMLElement>(
						`button.nav-btn[aria-label="${savedOrigin.navName}"]`
					) ||
					(savedOrigin.labelText === 'Admin & PMs'
						? document.querySelector<HTMLElement>('button[aria-label="Open Multi-Agent Admin Panel"]')
						: null);
				if (originBtn) {
					gsap.fromTo(
						originBtn,
						{
							scale: 1.24,
							boxShadow: '0 0 28px rgba(192, 132, 252, 0.95)'
						},
						{
							scale: 1,
							boxShadow: '0 0 0px rgba(192, 132, 252, 0)',
							duration: 0.68,
							delay: 0.12,
							ease: 'power3.out',
							clearProps: 'transform,boxShadow'
						}
					);
				}
			} else {
				gsap.fromTo(
					'.intro',
					{ opacity: 0, y: -12 },
					{ opacity: 1, y: 0, duration: 0.75, ease: 'power3.out' }
				);

				gsap.fromTo(
					'.orb, .ring-arcs, .orbit-halo',
					{ scale: 0.92, opacity: 0 },
					{ scale: 1, opacity: 1, duration: 0.9, ease: 'power3.out', clearProps: 'transform,opacity' }
				);

				gsap.fromTo(
					'.category.left',
					{ opacity: 0, x: -18 },
					{
						opacity: 1,
						x: 0,
						duration: 0.65,
						stagger: 0.06,
						ease: 'power2.out',
						clearProps: 'transform,opacity'
					}
				);

				gsap.fromTo(
					'.category.right',
					{ opacity: 0, x: 18 },
					{
						opacity: 1,
						x: 0,
						duration: 0.65,
						stagger: 0.06,
						ease: 'power2.out',
						clearProps: 'transform,opacity'
					}
				);

				gsap.fromTo(
					'.command-area',
					{ opacity: 0, y: 14 },
					{
						opacity: 1,
						y: 0,
						duration: 0.75,
						delay: 0.15,
						ease: 'power3.out',
						clearProps: 'transform,opacity'
					}
				);
			}
		}, appRootEl);

		// 3. Escape key handler for Popover & selectedCategory reset
		const handleKeydown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				popoverOpen = false;
				orchestratorOpen = false;
				selectedCategory = null;
			}
		};
		window.addEventListener('keydown', handleKeydown);

		// 4. Web Speech API Recognition setup (Bilingual: en-US / bn-BD)
		const SpeechRecognition =
			(window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
		if (SpeechRecognition) {
			recognition = new SpeechRecognition();
			recognition.lang = voiceLang;
			recognition.interimResults = true;
			recognition.continuous = false;
			let finalTranscript = '';

			recognition.onstart = () => {
				finalTranscript = '';
				isListening = true;
				pipelineStage = 'listening';
				inputPlaceholder =
					voiceLang === 'bn-BD' ? 'শুনছি... বাংলা বা ইংরেজিতে বলুন' : 'Listening...';
			};
			recognition.onresult = (event: any) => {
				let interim = '';
				finalTranscript = '';
				for (let i = 0; i < event.results.length; i++) {
					const res = event.results[i];
					if (res.isFinal) {
						finalTranscript += res[0].transcript;
					} else {
						interim += res[0].transcript;
					}
				}
				commandText = `${finalTranscript} ${interim}`.trim();
				if (interim) pipelineStage = 'transcribing';
				requestAnimationFrame(() => {
					if (commandInputEl) {
						commandInputEl.scrollLeft = commandInputEl.scrollWidth;
					}
				});
			};
			recognition.onerror = () => {
				isListening = false;
				stopVoiceMonitor();
				pipelineStage = 'idle';
			};
			recognition.onend = () => {
				isListening = false;
				stopVoiceMonitor();
				const spoken = (finalTranscript || commandText).trim();
				if (spoken) {
					executeCommand(spoken, 'voice');
				} else {
					pipelineStage = 'idle';
					inputPlaceholder =
						voiceLang === 'bn-BD'
							? 'বাংলা বা ইংরেজিতে বলুন বা লিখুন...'
							: 'Say a command... (English / বাংলা)';
				}
			};
		}

		// 5. Purple dotted ground mesh running across the bottom of the page
		const tc = terrainCanvasEl?.getContext('2d');
		function drawTerrain() {
			if (!tc || !terrainCanvasEl) return;
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			const w = window.innerWidth;
			const h = 185;
			terrainCanvasEl.width = Math.round(w * dpr);
			terrainCanvasEl.height = Math.round(h * dpr);
			tc.setTransform(dpr, 0, 0, dpr, 0, 0);
			tc.clearRect(0, 0, w, h);

			const surfaces = [
				{ min: -65, max: w * 0.32, amp: 52, phase: 0.2, base: 148 },
				{ min: w * 0.66, max: w + 80, amp: 70, phase: 2.2, base: 150 }
			];
			for (const s of surfaces) {
				for (let row = 0; row < 32; row++) {
					const r = row / 31;
					for (let x = s.min; x < s.max; x += 8.5) {
						const nx = (x - s.min) / (s.max - s.min);
						const shape =
							Math.sin(nx * Math.PI * 1.4 + s.phase) * s.amp +
							17 * Math.sin(nx * 9.5 + s.phase * 2);
						const y = s.base - shape * (1 - r * 0.6) + r * 82;
						if (y < -10 || y > h + 4) continue;
						const alpha = (0.53 - r * 0.43) * (0.6 + 0.4 * Math.cos(nx * 3));
						tc.fillStyle = `rgba(168,40,249,${alpha})`;
						tc.beginPath();
						tc.arc(x + row * 0.9, y, 0.72 + (1 - r) * 0.16, 0, Math.PI * 2);
						tc.fill();
					}
				}
			}
		}
		if (!returningFromPage) {
			drawTerrain();
		}
		window.addEventListener('resize', drawTerrain, { passive: true });

		return () => {
			stopVoiceMonitor();
			if (bgmAudio) bgmAudio.pause();
			window.removeEventListener('resize', drawTerrain);
			window.removeEventListener('keydown', handleKeydown);
			window.removeEventListener('pointerdown', unlockAudioOnce);
			window.removeEventListener('keydown', unlockAudioOnce);
			gsap.ticker.remove(gsapTicker);
			lenis.destroy();
			ctx.revert();
		};
	});
</script>

<!-- SVG Icon Sprite Definitions -->
<svg class="defs" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
	<symbol id="i-home" viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></symbol>
	<symbol id="i-grid" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></symbol>
	<symbol id="i-layers" viewBox="0 0 24 24"><path d="m12 2 9 5-9 5-9-5 9-5Zm-9 10 9 5 9-5M3 17l9 5 9-5" /></symbol>
	<symbol id="i-chart" viewBox="0 0 24 24"><path d="M3 21h18" /><rect x="4" y="12" width="4" height="9" rx=".4" /><rect x="10" y="6" width="4" height="15" rx=".4" /><rect x="16" y="9" width="4" height="12" rx=".4" /></symbol>
	<symbol id="i-sparkle" viewBox="0 0 24 24"><path d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2Z" /></symbol>
	<symbol id="i-settings" viewBox="0 0 24 24"><path d="m9.8 2.5-.5 2a8 8 0 0 0-1.6.9l-2-.6-2 3.5 1.5 1.4a8 8 0 0 0 0 1.9l-1.5 1.4 2 3.5 2-.6a8 8 0 0 0 1.6.9l.5 2h4l.5-2a8 8 0 0 0 1.6-.9l2 .6 2-3.5-1.5-1.4a8 8 0 0 0 0-1.9l1.5-1.4-2-3.5-2 .6a8 8 0 0 0-1.6-.9l-.5-2z" transform="translate(0 1)" /><circle cx="12" cy="12" r="3" /></symbol>
	<symbol id="i-users" viewBox="0 0 24 24"><circle cx="10" cy="7.5" r="3.5" /><path d="M2.5 20v-2c0-3.4 2.7-5.5 7.5-5.5s7.5 2.1 7.5 5.5v2zm14-15a3.5 3.5 0 0 1 0 7m1.5 2c2.7.3 3.5 2.3 3.5 4v2" /></symbol>
	<symbol id="i-trending" viewBox="0 0 24 24"><path d="M3 20h18M5 16l5-5 4 3 6-8m-5 0h5v5" /><path d="M5 18v2m5-6v6m5-5v5m5-8v8" /></symbol>
	<symbol id="i-web-chat" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" /><circle cx="9.5" cy="12" r="1" /><circle cx="12.5" cy="12" r="1" /><circle cx="15.5" cy="12" r="1" /></symbol>
	<symbol id="i-phone" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" /></symbol>
	<symbol id="i-text-sms" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 9h8M8 13h5" /></symbol>
	<symbol id="i-whatsapp" viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 20.5l1.5-5.3A8.5 8.5 0 1 1 21 11.5Z" /><path d="M9.5 8.8c.2-.4.4-.4.6-.4h.5c.2 0 .4.1.5.4l.7 1.6c.1.3 0 .5-.2.7l-.4.4c.5.9 1.2 1.6 2.1 2.1l.4-.4c.2-.2.4-.3.7-.2l1.6.7c.3.1.4.3.4.5v.5c0 .3-.2.6-.5.8-.5.3-1.4.4-2.7-.2-1.6-.7-3.1-2.2-3.8-3.8-.6-1.3-.5-2.2-.2-2.7Z" /></symbol>
	<symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></symbol>
	<symbol id="i-mic" viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="13" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v4m-4 0h8" /></symbol>
	<symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 3v18M3 12h18" /></symbol>
	<symbol id="i-calendar" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 2v6m10-6v6M3 10h18" /></symbol>
	<symbol id="i-file" viewBox="0 0 24 24"><path d="M6 2h8l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 0v6h5M8 13h8M8 17h8" /></symbol>
	<symbol id="i-bell" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 12a2 2 0 0 0 4 0" /></symbol>
	<symbol id="i-close" viewBox="0 0 24 24"><path d="M5 5 19 19M19 5 5 19" /></symbol>
</svg>

<div class="background" aria-hidden="true"></div>

<!-- Exact Appiex (https://appiex.com/ai-automation) Background Video & Purple Overlay -->
<video
	bind:this={bgVideoEl}
	class="bg-video-fixed"
	autoplay
	loop
	muted
	playsinline
	preload="auto"
	aria-hidden="true"
>
	<source src="/vde.webm" type="video/webm" />
	<source src="/vde.mp4" type="video/mp4" />
</video>
<div class="bg-video-overlay" aria-hidden="true"></div>

<canvas id="terrain" bind:this={terrainCanvasEl} aria-hidden="true"></canvas>
<div class="lusion-btn-portal" bind:this={zoomPortalEl} aria-hidden="true">
	<div class="portal-content" bind:this={zoomPortalContentEl}>
		{#if portalIconHref}
			<svg class="portal-svg-icon" viewBox="0 0 24 24"><use href={portalIconHref} /></svg>
		{/if}
		{#if portalLabelText}
			<span class="portal-label-text">{portalLabelText}</span>
		{/if}
	</div>
</div>
<div
	class="lusion-transition-veil"
	class:initial-veil={isReturningFromAdmin}
	bind:this={transitionVeilEl}
	aria-hidden="true"
></div>

<div
	class="app"
	class:is-zooming={isZooming}
	class:initial-reverse-zoom={isReturningFromAdmin}
	style={`--rev-origin-x:${returnOriginX}px;--rev-origin-y:${returnOriginY}px;`}
	bind:this={appRootEl}
>
	<aside class="sidebar" aria-label="Main navigation">
		<button class="brand-mark" aria-label="Ismail AI home" onmouseenter={playHoverSound} onclick={(e) => handleNavClick('Home', e)}>
			<svg viewBox="0 0 60 60" aria-hidden="true">
				<defs>
					<linearGradient id="brandGrad" x1="0" x2="1" y1="0" y2="1">
						<stop stop-color="#f1abff" />
						<stop offset=".5" stop-color="#b849f9" />
						<stop offset="1" stop-color="#861be0" />
					</linearGradient>
				</defs>
				<path
					d="M8 46 26 11c2-4 6-4 8 0l18 35c1.4 2.7-.4 5-3.2 5h-7l-9.2-18c-.9-1.8-2.4-1.8-3.4 0l-4 8 10-5 5.1 8.8-26 12c-4.8 2.3-8.8-1.1-6.3-5.8Z"
					fill="url(#brandGrad)"
				/>
			</svg>
		</button>
		<nav class="nav-group">
			{#each navItems as item (item.id)}
				<button
					class="nav-btn"
					class:active={activeNav === item.id}
					aria-label={item.id}
					onmouseenter={playHoverSound}
					onclick={(e) => handleNavClick(item.id, e)}
				>
					<svg class="icon"><use href={item.icon} /></svg>
					<span class="nav-label" aria-hidden="true">{item.id}</span>
				</button>
			{/each}
		</nav>
	</aside>

	<main class="main">
		<header class="topbar">
			<div class="top-left">
				<span class="wordmark">Ismail <span>AI</span></span>
				<span class="header-divider"></span>
				<span class="top-subtitle">Voice Control Dashboard</span>
			</div>
			<div class="top-right">
				<button
					type="button"
					class="lang-toggle"
					aria-label="Open Multi-Agent Admin Panel"
					title="Open Multi-Agent Admin & Project Managers"
					onmouseenter={playHoverSound}
					onclick={(e) => {
						playClickSound();
						navigateWithLusionZoom('/admin', e.currentTarget as HTMLElement);
					}}
				>
					<span class="lang-dot bn"></span>
					<span>Admin &amp; PMs</span>
				</button>

				<!-- Bilingual Voice Language Toggle (English / বাংলা) -->
				<button
					type="button"
					class="lang-toggle"
					aria-label="Switch voice recognition language"
					title="Switch voice recognition language (English / বাংলা)"
					onmouseenter={playHoverSound}
					onclick={toggleVoiceLanguage}
				>
					<span class="lang-dot" class:bn={voiceLang === 'bn-BD'}></span>
					<span>{voiceLang === 'bn-BD' ? 'বাংলা' : 'EN'}</span>
				</button>

				<!-- Official Lusion.co Sound Toggle -->
				<button
					type="button"
					class="sound-toggle"
					class:playing={soundPlaying}
					aria-label={soundPlaying ? 'Mute ambient sound' : 'Play ambient sound'}
					onmouseenter={playHoverSound}
					onclick={toggleSound}
				>
					<span class="sound-bars" aria-hidden="true">
						<span></span><span></span><span></span><span></span>
					</span>
					<span>{soundPlaying ? 'Sound On' : 'Sound Off'}</span>
				</button>

				<div class="status">
					<span class="status-dot"></span>
					<span>System Online</span>
				</div>
				<button
					class="header-icon"
					id="notifications"
					aria-label="Notifications"
					onmouseenter={playHoverSound}
					onclick={() => {
						playClickSound();
						showPopover(
							'Notifications',
							'No new notifications in this UI preview. Connect your app to show live updates.'
						);
					}}
				>
					<svg class="icon"><use href="#i-bell" /></svg>
				</button>
				<button
					class="avatar"
					id="profile"
					aria-label="Profile"
					onmouseenter={playHoverSound}
					onclick={() => {
						playClickSound();
						showPopover(
							'Account',
							'AA · Demo profile. Connect your authentication provider for account settings.'
						);
					}}
				>
					AA
				</button>
			</div>
		</header>

		<div class="workspace-scaler">
			<div class="workspace">
				<!-- 3rd Pic: Equalizer bars above heading removed; 5th Video Infinite Loop Animation placed right beside "AI Command Center" -->
				<div class="intro">
					<div class="heading-row">
						<h1>AI <span>Command</span> Center</h1>
						<div class="infinity-badge" aria-hidden="true">
							<svg class="infinity-svg" viewBox="0 0 100 54" xmlns="http://www.w3.org/2000/svg">
								<defs>
									<linearGradient id="infinityBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
										<stop offset="0%" stop-color="#9d20fd" stop-opacity="0.15" />
										<stop offset="50%" stop-color="#df7bff" stop-opacity="1" />
										<stop offset="100%" stop-color="#ffffff" stop-opacity="1" />
									</linearGradient>
								</defs>
								<path
									class="infinity-track"
									pathLength="230"
									d="M 50 27 C 36 7, 10 7, 10 27 C 10 47, 36 47, 50 27 C 64 7, 90 7, 90 27 C 90 47, 64 47, 50 27 Z"
								/>
								<path
									class="infinity-glow-beam"
									pathLength="230"
									d="M 50 27 C 36 7, 10 7, 10 27 C 10 47, 36 47, 50 27 C 64 7, 90 7, 90 27 C 90 47, 64 47, 50 27 Z"
								/>
							</svg>
						</div>
					</div>
					<p>Control&nbsp; · &nbsp;Automate&nbsp; · &nbsp;Analyze&nbsp; · &nbsp;Create</p>
				</div>

				<!-- 1st Pic: When any category is touched/hovered/selected, it pops up larger & others sink/darken -->
				<section
					class="hub-stage"
					class:has-active-category={activePopupCategory !== null}
					aria-label="AI command categories"
				>
					<div class="orbit-halo" aria-hidden="true"></div>
					<svg class="orbit-lines" viewBox="0 0 1200 456" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
						<defs>
							<linearGradient id="linkGradient" x1="0" y1="0" x2="1" y2="0">
								<stop stop-color="#9e20ce" stop-opacity=".32" />
								<stop offset=".55" stop-color="#c14bff" stop-opacity=".96" />
								<stop offset="1" stop-color="#ae34fb" stop-opacity=".6" />
							</linearGradient>
							<filter id="lineGlow" x="-70%" y="-70%" width="240%" height="240%">
								<feGaussianBlur in="SourceGraphic" stdDeviation=".65" result="blur" />
								<feMerge>
									<feMergeNode in="blur" />
									<feMergeNode in="SourceGraphic" />
								</feMerge>
							</filter>
							<filter id="nodeGlow" x="-300%" y="-300%" width="700%" height="700%">
								<feGaussianBlur stdDeviation="5" result="g" />
								<feMerge>
									<feMergeNode in="g" />
									<feMergeNode in="SourceGraphic" />
								</feMerge>
							</filter>
						</defs>
						<circle class="orbit-ring outer" cx="600" cy="220" r="236" />
						<circle class="orbit-ring" cx="600" cy="220" r="202" />
						<circle class="orbit-ring" cx="600" cy="220" r="158" />
						<path
							class="connection-soft"
							d="M356 59C398 57 412 96 443 104 M305 163C355 161 365 168 403 185 M305 270C358 273 369 250 400 254 M355 374C394 375 407 350 431 337 M860 59C821 59 787 90 757 104 M904 163C854 163 832 178 797 185 M904 270C852 270 826 257 800 254 M854 374C816 374 789 344 768 337"
						/>
						<path class="connection" d="M356 59C398 57 412 96 443 104" />
						<path class="connection" d="M305 163C355 161 365 168 403 185" />
						<path class="connection" d="M305 270C358 273 369 250 400 254" />
						<path class="connection" d="M355 374C394 375 407 350 431 337" />
						<path class="connection" d="M860 59C821 59 787 90 757 104" />
						<path class="connection" d="M904 163C854 163 832 178 797 185" />
						<path class="connection" d="M904 270C852 270 826 257 800 254" />
						<path class="connection" d="M854 374C816 374 789 344 768 337" />
						<g filter="url(#nodeGlow)" fill="#efadff" stroke="#ac25fa" stroke-width="3">
							<circle cx="443" cy="104" r="6" />
							<circle cx="403" cy="185" r="6" />
							<circle cx="400" cy="254" r="6" />
							<circle cx="431" cy="337" r="6" />
							<circle cx="757" cy="104" r="6" />
							<circle cx="797" cy="185" r="6" />
							<circle cx="800" cy="254" r="6" />
							<circle cx="768" cy="337" r="6" />
						</g>
					</svg>

					<div class="ring-arcs" aria-hidden="true"></div>

					<!-- 3rd Pic + 4th Video: Pure 60fps GPU-accelerated WebGL Orb with 4th Video in Purple -->
					<div class="orb" aria-label="Animated AI voice visualizer">
						{#if orbWebglReady}
							<div class="threlte-orb-layer" aria-hidden="true">
								<Canvas>
									<OrbScene
										{isListening}
										activeCategory={activePopupCategory}
										{voiceLevel}
									/>
								</Canvas>
							</div>
						{:else}
							<div class="orb-fast-proxy" aria-hidden="true">
								<span></span><span></span>
							</div>
						{/if}
					</div>

					<span class="star" style="left:602px;top:14px"></span>
					<span class="star" style="left:611px;top:50px"></span>
					<span class="star" style="left:606px;top:414px"></span>
					<span class="star" style="left:598px;top:444px"></span>
					<span class="star" style="left:523px;top:104px"></span>
					<span class="star" style="left:685px;top:359px"></span>

					{#each categories as cat (cat.cls)}
						<button
							class="category {cat.side} {cat.cls}"
							class:selected={selectedCategory === cat.cls}
							class:active-popup={activePopupCategory === cat.cls}
							data-category={cat.id}
							onmouseenter={() => {
								openDomainHover(cat.cls);
								playHoverSound();
							}}
							onmouseleave={() => scheduleCloseDomainHover(cat.cls)}
							onclick={() => handleCategoryClick(cat.cls, cat.id)}
						>
							<span class="category-icon">
								<svg class="icon"><use href={cat.icon} /></svg>
							</span>
							<span class="category-text">
								<strong>{cat.id}</strong>
								<small>{cat.subtitle}</small>
							</span>
						</button>
					{/each}

					{#if hoveredCategory && DOMAIN_SUBDOMAINS[hoveredCategory]}
						{@const activeCat = categories.find((c) => c.cls === hoveredCategory)}
						{#if activeCat}
							{@const branchNodes = buildBranchNodes(
								activeCat.cls,
								activeCat.side as 'left' | 'right',
								DOMAIN_SUBDOMAINS[activeCat.cls]
							)}
							<div
								class="subdomain-branch {activeCat.side} {activeCat.cls}"
								role="menu"
								tabindex="-1"
								aria-label="{activeCat.id} sub-domains"
								onmouseenter={() => openDomainHover(activeCat.cls)}
								onmouseleave={() => scheduleCloseDomainHover(activeCat.cls)}
							>
								<svg
									class="subdomain-wires"
									viewBox="0 0 {BRANCH_W} {BRANCH_H}"
									aria-hidden="true"
								>
									{#each branchNodes as node (node.label)}
										<path class="sub-wire" d={node.wirePath} />
										<circle class="sub-wire-dot" cx={node.dotX} cy={node.dotY} r="3.4" />
									{/each}
								</svg>
								<div class="subdomain-capsules">
									{#each branchNodes as node (node.label)}
										<button
											type="button"
											class="subdomain-capsule size-{node.size}"
											style="{activeCat.side === 'left'
												? `right: ${node.gapX}px;`
												: `left: ${node.gapX}px;`} top: {ANCHOR_Y + node.offsetY}px;"
											onclick={() => {
												playClickSound();
												multiAgentStore.setActiveProject(node.projectId);
												selectedCategory = activeCat.cls;
												inputPlaceholder = `Voice note for ${node.pm} (${node.label})...`;
												hoveredCategory = null;
												commandInputEl?.focus();
											}}
										>
											<span class="subdomain-pm">{node.pm}</span>
											<span class="subdomain-label">{node.label}</span>
										</button>
									{/each}
								</div>
							</div>
						{/if}
					{/if}
				</section>

				<section class="command-area" aria-label="Voice and text command input">
					<form id="commandForm" class="command-form" onsubmit={handleCommandSubmit}>
						<div class="capsule-glass-sheen" aria-hidden="true"></div>
						<!-- Real-time Voice Tone Bars: calm when silent, dances strictly to your voice tone -->
						<div
							class="wave-indicator"
							class:voice-active={isListening && voiceLevel > 0.04}
							aria-hidden="true"
						>
							{#each voiceBars as barHeight, idx (idx)}
								<b style="--h:{barHeight}px"></b>
							{/each}
						</div>
						<label for="commandInput" class="screen-reader-only">AI command</label>
						<input
							id="commandInput"
							bind:this={commandInputEl}
							bind:value={commandText}
							type="text"
							placeholder={inputPlaceholder}
							autocomplete="off"
							spellcheck="false"
						/>
						<button
							class="mic-button"
							class:listening={isListening}
							type="button"
							id="micButton"
							aria-label={isListening ? 'Stop listening' : 'Start voice input'}
							title={isListening ? 'Stop listening' : 'Start voice input'}
							onmouseenter={playHoverSound}
							onclick={toggleMic}
						>
							<svg class="icon"><use href="#i-mic" /></svg>
						</button>
					</form>

					<div class="quick-actions">
						{#each quickPrompts as qp (qp.label)}
							<button
								type="button"
								class="quick-action"
								data-prompt={qp.label}
								onmouseenter={playHoverSound}
								onclick={() => handleQuickPrompt(qp.label)}
							>
								<svg class="icon"><use href={qp.icon} /></svg>
								{qp.label}
							</button>
						{/each}
					</div>
				</section>
			</div>
		</div>

		{#if orchestratorOpen && lastOrchestratorResult}
			<aside
				class="orchestrator-sheet"
				role="region"
				aria-label="Ismail AI Orchestrator response"
				data-lenis-prevent
				data-lenis-prevent-wheel
				data-lenis-prevent-touch
			>
				<div class="orchestrator-meta">
					<span class="orch-badge module">{lastOrchestratorResult.module}</span>
					<span class="orch-badge route">{lastOrchestratorResult.route}</span>
					{#if lastOrchestratorResult.pmAgent}
						<span class="orch-badge status completed">PM: {lastOrchestratorResult.pmAgent}</span>
					{/if}
					<span class="orch-badge status {lastOrchestratorResult.status}">
						{lastOrchestratorResult.status.replace('_', ' ')}
					</span>
					<button
						type="button"
						class="orch-close"
						aria-label="Close response"
						onclick={() => (orchestratorOpen = false)}
					>
						×
					</button>
				</div>
				<div class="orch-intent-label">{lastOrchestratorResult.intent}</div>
				<p class="orchestrator-reply">
					{typedDisplayReply}{#if isTypingReply}<span class="typing-caret" aria-hidden="true">|</span>{/if}
				</p>
				<div class="orchestrator-footer">
					<div class="orch-followups">
						{#each lastOrchestratorResult.suggested_followups as fu (fu)}
							<button
								type="button"
								class="orch-chip"
								onclick={() => {
									commandText = fu;
									executeCommand(fu, 'text');
								}}
							>
								{fu}
							</button>
						{/each}
						{#if lastOrchestratorResult.pmAgent}
							<button
								type="button"
								class="orch-chip"
								style="border-color: rgba(168,85,247,0.7); color: #e9d5ff;"
								onclick={(e) => navigateWithLusionZoom('/admin?nav=Projects', e.currentTarget as HTMLElement)}
							>
								Open in Admin →
							</button>
						{/if}
					</div>
					{#if lastOrchestratorResult.requires_approval}
						<button type="button" class="orch-approve" onclick={approvePendingAction}>
							Approve &amp; Execute
						</button>
					{/if}
				</div>
			</aside>
		{/if}
	</main>
</div>

<div class="popover" class:open={popoverOpen} id="popover" role="dialog" aria-label="Information">
	<button id="closePopover" aria-label="Close" onclick={() => (popoverOpen = false)}>
		<svg class="icon" style="width:17px;height:17px"><use href="#i-close" /></svg>
	</button>
	<strong id="popoverTitle">{popoverTitle}</strong>
	<p id="popoverText">{popoverDescription}</p>
</div>

<div class="toast" class:show={toastVisible} id="toast" role="status" aria-live="polite">
	{toastMessage}
</div>
