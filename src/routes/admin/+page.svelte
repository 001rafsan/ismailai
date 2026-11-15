<script lang="ts">
	import { onMount } from 'svelte';
	import { beforeNavigate, goto, preloadCode, preloadData } from '$app/navigation';
	import Lenis from 'lenis';
	import { multiAgentStore, type ScheduleCadence } from '../../lib/multiAgentStore.svelte';

	interface OrderItem {
		id: string;
		name: string;
		variant: string;
		price: number;
		qty: number;
		thumbBg: string;
		thumbEmoji: string;
	}

	interface TimelineEntry {
		id: string;
		text: string;
		time: string;
	}

	let activeNav = $state('Projects');
	let searchQuery = $state('');
	let pmNoteInput = $state('');
	let pmTargetProject = $state('all');
	let newSchedTitle = $state('');
	let newSchedCadence = $state<ScheduleCadence>('Daily');
	let newSchedRecipient = $state('accounts@ismail-ai.com');
	let meetingDeptFilter = $state<'All' | 'Core Team' | 'Sales' | 'Marketing'>('All');
	let meetingUnreadOnly = $state(false);
	let mtgTeamMember = $state('');
	let mtgDept = $state<'Sales' | 'Marketing' | 'Core Team'>('Sales');
	let mtgClient = $state('');
	let mtgTitle = $state('');
	let mtgTool = $state<'Read.ai' | 'Fireflies.ai' | 'Otter.ai'>('Read.ai');
	let mtgSummary = $state('');
	let waReplyMap = $state<Record<string, string>>({});
	let sidebarCollapsed = $state(false);
	let sidebarWidth = $state(232);
	let isResizing = $state(false);
	let carbonOpen = $state(false);
	let admVeilVisible = $state(true);
	let isLeavingAdmin = $state(false);
	let zoomOriginX = $state(36);
	let zoomOriginY = $state(218);
	let originIconHref = $state('#i-layers');
	let originLabelText = $state('');
	let selectedProjectId = $state<string | null>(null);
	let zoomingCardId = $state<string | null>(null);
	let detailClosing = $state(false);

	let activeDetailProject = $derived(
		selectedProjectId ? multiAgentStore.projects.find((p) => p.id === selectedProjectId) ?? null : null
	);

	let allowDirectLeave = false;

	beforeNavigate((nav) => {
		if (!allowDirectLeave && nav.to?.url.pathname === '/') {
			nav.cancel();
			leaveAdminWithReverseTransition();
		}
	});

	function leaveAdminWithReverseTransition() {
		if (isLeavingAdmin) return;
		isLeavingAdmin = true;
		admVeilVisible = true;
		try {
			sessionStorage.setItem('lusion_nav_state', 'reverse');
		} catch {}
		setTimeout(() => {
			allowDirectLeave = true;
			goto('/');
		}, 240);
	}

	function openProjectDetailWithZoom(projectId: string) {
		if (zoomingCardId || selectedProjectId) return;
		zoomingCardId = projectId;
		setTimeout(() => {
			admVeilVisible = true;
		}, 140);
		setTimeout(() => {
			selectedProjectId = projectId;
			zoomingCardId = null;
			setTimeout(() => {
				admVeilVisible = false;
			}, 40);
		}, 480);
	}

	function closeProjectDetailWithReverseZoom() {
		if (!selectedProjectId || detailClosing) return;
		const closingId = selectedProjectId;
		detailClosing = true;
		setTimeout(() => {
			admVeilVisible = true;
		}, 160);
		setTimeout(() => {
			selectedProjectId = null;
			detailClosing = false;
			zoomingCardId = closingId;
			setTimeout(() => {
				admVeilVisible = false;
				zoomingCardId = null;
			}, 40);
		}, 440);
	}

	onMount(() => {
		preloadCode('/').catch(() => {});
		preloadData('/').catch(() => {});
		const params = new URLSearchParams(window.location.search);
		const nav = params.get('nav');
		if (nav) activeNav = nav;
		try {
			sessionStorage.setItem('lusion_nav_state', 'in-admin');
			const rawOrigin = sessionStorage.getItem('lusion_zoom_origin');
			if (rawOrigin) {
				const parsed = JSON.parse(rawOrigin);
				if (typeof parsed.originX === 'number') zoomOriginX = parsed.originX;
				if (typeof parsed.originY === 'number') zoomOriginY = parsed.originY;
				if (typeof parsed.iconHref === 'string') originIconHref = parsed.iconHref;
				if (typeof parsed.labelText === 'string') originLabelText = parsed.labelText;
			}
		} catch {}
		requestAnimationFrame(() => {
			admVeilVisible = false;
		});

		const workspaceEl = document.querySelector<HTMLElement>('.adm-workspace');
		let lenis: Lenis | null = null;
		let rafId = 0;
		if (workspaceEl) {
			lenis = new Lenis({
				wrapper: workspaceEl,
				duration: 1.05,
				easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
				smoothWheel: true
			});
			const raf = (time: number) => {
				lenis?.raf(time);
				rafId = requestAnimationFrame(raf);
			};
			rafId = requestAnimationFrame(raf);
		}
		return () => {
			if (rafId) cancelAnimationFrame(rafId);
			lenis?.destroy();
		};
	});
	let fulfilled = $state(false);
	let shippingLabelCreated = $state(false);
	let commentText = $state('');
	let newTagText = $state('');
	let addingTag = $state(false);
	let tags = $state<string[]>(['VIP', 'Express', 'Holiday-Hold']);
	let carbonInput = $state('');
	let carbonMessages = $state<Array<{ role: 'ai' | 'user'; text: string }>>([
		{
			role: 'ai',
			text: "Let's pick the first launch region. My default recommendation for your store is the United Kingdom, since it keeps language and logistics relatively simple while opening a large market."
		}
	]);
	let carbonTodos = $state([
		{ id: 1, title: 'Set up international selling', sub: 'Research a competitive price', done: false }
	]);

	function toggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
	}

	function startSidebarResize(e: PointerEvent) {
		e.preventDefault();
		isResizing = true;
		const startX = e.clientX;
		const wasCollapsed = sidebarCollapsed;
		const startWidth = wasCollapsed ? 60 : sidebarWidth;

		function onPointerMove(ev: PointerEvent) {
			const nextWidth = startWidth + (ev.clientX - startX);
			if (!wasCollapsed && nextWidth < 140) {
				sidebarCollapsed = true;
				sidebarWidth = 232;
				isResizing = false;
				window.removeEventListener('pointermove', onPointerMove);
				window.removeEventListener('pointerup', onPointerUp);
				return;
			}
			if (wasCollapsed && nextWidth > 95) {
				sidebarCollapsed = false;
				sidebarWidth = 232;
				isResizing = false;
				window.removeEventListener('pointermove', onPointerMove);
				window.removeEventListener('pointerup', onPointerUp);
				return;
			}
			if (!sidebarCollapsed) {
				sidebarWidth = Math.min(380, Math.max(145, nextWidth));
			}
		}

		function onPointerUp() {
			isResizing = false;
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
		}

		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
	}

	function toggleCarbonAI() {
		carbonOpen = !carbonOpen;
		// 5th Pic: When right-side AI opens, left sidebar collapses to icon-only mode!
		if (carbonOpen) {
			sidebarCollapsed = true;
		}
	}

	function handleCarbonSubmit(e: SubmitEvent) {
		e.preventDefault();
		const q = carbonInput.trim();
		if (!q) return;
		carbonMessages = [...carbonMessages, { role: 'user', text: q }];
		carbonInput = '';

		let reply = `Order #1078 summary: ${totalItemsCount} items ($${total.toFixed(2)} USD), Paid, ${fulfilled ? 'Fulfilled' : 'Unfulfilled'}, customer requested a 2-day holiday delay.`;
		if (/account|follow[- ]?up|ফলোআপ|mail|মেইল|daily|weekly|monthly/i.test(q)) {
			const cadence: ScheduleCadence = /monthly/i.test(q) ? 'Monthly' : /weekly/i.test(q) ? 'Weekly' : 'Daily';
			const sent = multiAgentStore.triggerAccountFollowup(cadence);
			reply = `Kairo dispatched the ${sent.cadence} Account Team follow-up (${sent.title}) to ${sent.recipient} on time.`;
		} else if (/note|pm|project|portfolio|social|applyglobal|research|নোট|প্রজেক্ট/i.test(q)) {
			const created = multiAgentStore.routeVoiceNoteToPM(q, 'text', pmTargetProject);
			reply = `Routed to ${created.pmName} (${created.projectName}). Delegated to ${created.delegatedTo.join(' & ')}.`;
		} else if (/risk|chargeback|রিস্ক/i.test(q)) {
			reply =
				'Order #1078 has Low chargeback risk (4th repeat order from Danielle Hudson, verified Visa •••• 8829). Safe to fulfill after the 2-day holiday delay.';
		} else if (/fulfill|ship|label|ডেলিভারি/i.test(q)) {
			reply =
				'Customer requested a 2-day shipping delay due to holiday. Recommend scheduling DHL Express pickup from Montreal Warehouse in 48 hours.';
		} else if (/good|ok|sounds|হ্যাঁ|ঠিক/i.test(q)) {
			reply = 'Working on it — preparing your regional pricing and fulfillment checklist now.';
		}
		carbonMessages = [...carbonMessages, { role: 'ai', text: reply }];
	}

	function handleCreatePMNote(e: SubmitEvent) {
		e.preventDefault();
		const txt = pmNoteInput.trim();
		if (!txt) return;
		multiAgentStore.routeVoiceNoteToPM(txt, 'text', pmTargetProject);
		pmNoteInput = '';
	}

	function handleAddSchedule(e: SubmitEvent) {
		e.preventDefault();
		if (!newSchedTitle.trim()) return;
		multiAgentStore.addAccountSchedule(newSchedTitle, newSchedCadence, newSchedRecipient);
		newSchedTitle = '';
	}

	function handleSyncMeetingNote(e: SubmitEvent) {
		e.preventDefault();
		if (!mtgSummary.trim()) return;
		multiAgentStore.addMeetingSummary({
			projectId: pmTargetProject === 'all' ? 'applyglobal-ops' : pmTargetProject,
			teamMember: mtgTeamMember || `${mtgDept} Lead`,
			department: mtgDept,
			clientName: mtgClient || 'Client Sync',
			meetingTitle: mtgTitle || 'Client Meeting Summary',
			sourceTool: mtgTool,
			summary: mtgSummary
		});
		mtgTeamMember = '';
		mtgClient = '';
		mtgTitle = '';
		mtgSummary = '';
	}

	let items = $state<OrderItem[]>([
		{
			id: '1',
			name: 'Flora Sneakers',
			variant: '10.5 US',
			price: 235.0,
			qty: 1,
			thumbBg: '#e8e4dc',
			thumbEmoji: '👟'
		},
		{
			id: '2',
			name: 'Fioranti Button Down',
			variant: 'Blue / XL',
			price: 65.0,
			qty: 1,
			thumbBg: '#d8e0ea',
			thumbEmoji: '👔'
		},
		{
			id: '3',
			name: 'MVSE Vergier Beanie',
			variant: 'OS / 3 / Camo',
			price: 65.0,
			qty: 1,
			thumbBg: '#dde3d5',
			thumbEmoji: '🧶'
		}
	]);

	let timeline = $state<TimelineEntry[]>([
		{
			id: 't1',
			text: 'Order confirmation email was sent to Danielle Hudson (danielle.hudson@example.com)',
			time: '1:36pm'
		},
		{
			id: 't2',
			text: 'A $339.99 USD payment was processed using a Visa ending in 8829',
			time: '1:36pm'
		}
	]);

	let totalItemsCount = $derived(items.reduce((acc, it) => acc + it.qty, 0));
	let subtotal = $derived(items.reduce((acc, it) => acc + it.price * it.qty, 0));
	const discount = 30.0;
	const shipping = 4.99;
	let total = $derived(Math.max(0, subtotal - discount + shipping));

	let unreadMeetingsCount = $derived(
		multiAgentStore.meetingNotes.filter((m) => m.readStatus === 'Unread').length
	);

	let filteredMeetings = $derived.by(() => {
		return multiAgentStore.meetingNotes.filter((m) => {
			if (meetingUnreadOnly && m.readStatus !== 'Unread') return false;
			if (meetingDeptFilter === 'Core Team') return m.isCoreMember;
			if (meetingDeptFilter !== 'All' && m.department !== meetingDeptFilter) return false;
			return true;
		});
	});

	let primaryNav = $derived([
		{ id: 'Home', label: 'Home', badge: null as string | null, icon: 'home' },
		{ id: 'Projects', label: 'Projects & PMs', badge: String(multiAgentStore.projects.length), icon: 'content' },
		{ id: 'Meetings', label: 'Client Meetings', badge: unreadMeetingsCount > 0 ? String(unreadMeetingsCount) : null, icon: 'customers' },
		{ id: 'Leads', label: 'Leads & Pipeline', badge: String(multiAgentStore.leads.length), icon: 'growth' },
		{ id: 'Growth', label: 'Growth', badge: null as string | null, icon: 'growth' },
		{ id: 'Analytics', label: 'Analytics', badge: null as string | null, icon: 'analytics' },
		{ id: 'Payments', label: 'Payments', badge: null as string | null, icon: 'payments' },
		{ id: 'Content', label: 'Content', badge: null as string | null, icon: 'content' }
	]);

	let filteredPrimaryNav = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return primaryNav;
		return primaryNav.filter((item) => item.label.toLowerCase().includes(q));
	});

	let searchMatches = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return [];
		const entries = [
			...primaryNav.map((n) => ({ label: n.label, meta: 'Navigation', nav: n.id })),
			{ label: 'Online Store', meta: 'Channel', nav: 'Online Store' },
			{ label: 'Email', meta: 'App', nav: 'Email' },
			{ label: 'Settings', meta: 'System', nav: 'Settings' },
			{ label: 'Order #1078', meta: 'Paid · Unfulfilled · $339.99', nav: 'Orders' },
			{ label: 'Danielle Hudson', meta: 'Customer · 4 orders', nav: 'Customers' },
			...items.map((it) => ({ label: it.name, meta: `${it.variant} · $${it.price.toFixed(2)}`, nav: 'Products' }))
		];
		return entries.filter(
			(e) => e.label.toLowerCase().includes(q) || e.meta.toLowerCase().includes(q)
		).slice(0, 6);
	});

	function handleCreateShippingLabel() {
		shippingLabelCreated = true;
		fulfilled = true;
		timeline = [
			{
				id: `t-${Date.now()}`,
				text: 'DHL Express shipping label created at Montreal Warehouse',
				time: 'Just now'
			},
			...timeline
		];
	}

	function handleToggleFulfilled() {
		fulfilled = !fulfilled;
		timeline = [
			{
				id: `t-${Date.now()}`,
				text: fulfilled ? 'Order #1078 marked as Fulfilled' : 'Order #1078 marked as Unfulfilled',
				time: 'Just now'
			},
			...timeline
		];
	}

	function handlePostComment(e: SubmitEvent) {
		e.preventDefault();
		const text = commentText.trim();
		if (!text) return;
		timeline = [
			{
				id: `t-${Date.now()}`,
				text,
				time: 'Just now'
			},
			...timeline
		];
		commentText = '';
	}

	function handleAddTag(e: SubmitEvent) {
		e.preventDefault();
		const t = newTagText.trim();
		if (t && !tags.includes(t)) {
			tags = [...tags, t];
		}
		newTagText = '';
		addingTag = false;
	}

	function handleTagRemove(tag: string) {
		tags = tags.filter((t) => t !== tag);
	}
</script>

<svelte:head>
	<title>Ismail AI Admin — Order #1078</title>
</svelte:head>

<div
	class="adm-lusion-veil"
	class:visible={admVeilVisible}
	class:leaving={isLeavingAdmin}
	style={`--zoom-origin-x:${zoomOriginX}px;--zoom-origin-y:${zoomOriginY}px;`}
	aria-hidden="true"
>
	<div class="adm-veil-logo">
		{#if originIconHref}
			<svg class="adm-veil-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
				<use href={originIconHref} />
			</svg>
		{:else if originLabelText}
			<span class="adm-veil-label">{originLabelText}</span>
		{/if}
	</div>
</div>

<div
	class="shopify-shell"
	class:leaving-admin={isLeavingAdmin}
	style={`--zoom-origin-x:${zoomOriginX}px;--zoom-origin-y:${zoomOriginY}px;`}
>
	<!-- Crisp Outline Icon Definitions for Admin Sidebar + Dashboard Portal -->
	<svg class="adm-svg-defs" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
		<symbol id="i-home" viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></symbol>
		<symbol id="i-grid" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></symbol>
		<symbol id="i-layers" viewBox="0 0 24 24"><path d="m12 2 9 5-9 5-9-5 9-5Zm-9 10 9 5 9-5M3 17l9 5 9-5" /></symbol>
		<symbol id="i-chart" viewBox="0 0 24 24"><path d="M3 21h18" /><rect x="4" y="12" width="4" height="9" rx=".4" /><rect x="10" y="6" width="4" height="15" rx=".4" /><rect x="16" y="9" width="4" height="12" rx=".4" /></symbol>
		<symbol id="i-settings" viewBox="0 0 24 24"><path d="m9.8 2.5-.5 2a8 8 0 0 0-1.6.9l-2-.6-2 3.5 1.5 1.4a8 8 0 0 0 0 1.9l-1.5 1.4 2 3.5 2-.6a8 8 0 0 0 1.6.9l.5 2h4l.5-2a8 8 0 0 0 1.6-.9l2 .6 2-3.5-1.5-1.4a8 8 0 0 0 0-1.9l1.5-1.4-2-3.5-2 .6a8 8 0 0 0-1.6-.9l-.5-2z" transform="translate(0 1)" /><circle cx="12" cy="12" r="3" /></symbol>
		<symbol id="adm-home" viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></symbol>
		<symbol id="adm-orders" viewBox="0 0 24 24"><path d="M4 6h16l-1.5 13a1 1 0 0 1-1 .9H6.5a1 1 0 0 1-1-.9L4 6Z" /><path d="M9 10v2a3 3 0 0 0 6 0v-2" /></symbol>
		<symbol id="adm-products" viewBox="0 0 24 24"><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" /><circle cx="7" cy="7" r="1.5" /></symbol>
		<symbol id="adm-customers" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" /></symbol>
		<symbol id="adm-growth" viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8" /><path d="M17 7h4v4" /></symbol>
		<symbol id="adm-analytics" viewBox="0 0 24 24"><path d="M4 20h16" /><rect x="5" y="12" width="3" height="8" rx="1" /><rect x="10.5" y="7" width="3" height="13" rx="1" /><rect x="16" y="10" width="3" height="10" rx="1" /></symbol>
		<symbol id="adm-payments" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></symbol>
		<symbol id="adm-content" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h6" /></symbol>
		<symbol id="adm-store" viewBox="0 0 24 24"><path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" /><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" /></symbol>
		<symbol id="adm-email" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></symbol>
		<symbol id="adm-whatsapp" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" /></symbol>
		<symbol id="adm-settings" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></symbol>
	</svg>

	<!-- Left Pure Dark Black Sidebar (Independent Scroll, Collapsible & Resizable) -->
	<aside
		class="adm-sidebar"
		class:collapsed={sidebarCollapsed}
		class:compact={!sidebarCollapsed && sidebarWidth < 172}
		class:resizing={isResizing}
		style:width={!sidebarCollapsed && sidebarWidth !== 232 ? `${sidebarWidth}px` : undefined}
		aria-label="Admin navigation"
	>
		<div class="adm-brand-row">
			<button
				type="button"
				class="adm-store-pill"
				title={sidebarCollapsed ? 'Expand sidebar' : 'Back to Ismail AI Voice Center'}
				onclick={() => (sidebarCollapsed ? toggleSidebar() : leaveAdminWithReverseTransition())}
			>
				{#if sidebarCollapsed}
					<span class="adm-store-name-mini">I<span>A</span></span>
				{:else}
					<span class="adm-store-name">Ismail <span>AI</span></span>
				{/if}
			</button>
			{#if !sidebarCollapsed}
				<button
					type="button"
					class="adm-view-web-btn"
					title="Back to AI Voice Command Center"
					onclick={leaveAdminWithReverseTransition}
				>
					View Web
				</button>
			{/if}
		</div>

		{#if sidebarCollapsed}
			<button
				type="button"
				class="adm-collapsed-search"
				title="Expand sidebar"
				onclick={toggleSidebar}
			>
				⌕
			</button>
		{:else}
			<div class="adm-search-wrap">
				<div class="adm-search-box">
					<span class="adm-search-icon">⌕</span>
					<input
						type="text"
						placeholder="Search"
						bind:value={searchQuery}
						aria-label="Search admin"
						onkeydown={(e) => {
							if (e.key === 'Escape') searchQuery = '';
							if (e.key === 'Enter' && searchMatches.length > 0) {
								activeNav = searchMatches[0].nav;
								searchQuery = '';
							}
						}}
					/>
					{#if searchQuery}
						<button
							type="button"
							class="adm-search-clear"
							title="Clear search"
							onclick={() => (searchQuery = '')}
						>
							×
						</button>
					{/if}
					<button
						type="button"
						class="adm-kbd-toggle"
						title="Collapse sidebar"
						aria-label="Toggle sidebar"
						onclick={toggleSidebar}
					>
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<rect x="3" y="3" width="18" height="18" rx="3" />
							<line x1="9" y1="3" x2="9" y2="21" />
						</svg>
					</button>
				</div>
				{#if searchQuery.trim().length > 0}
					<div class="adm-search-results" role="listbox" aria-label="Search results">
						{#if searchMatches.length === 0}
							<div class="adm-search-empty">No matches for "{searchQuery}"</div>
						{:else}
							{#each searchMatches as match (`${match.nav}-${match.label}`)}
								<button
									type="button"
									class="adm-search-result-item"
									onclick={() => {
										activeNav = match.nav;
										searchQuery = '';
									}}
								>
									<span class="adm-sr-label">{match.label}</span>
									<span class="adm-sr-meta">{match.meta}</span>
								</button>
							{/each}
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<nav class="adm-nav">
			{#each filteredPrimaryNav as item (item.id)}
				<button
					type="button"
					class="adm-nav-item"
					class:active={activeNav === item.id}
					title={item.label}
					onclick={() => (activeNav = item.id)}
				>
					<span class="adm-nav-left">
						<svg class="adm-nav-icon"><use href={`#adm-${item.icon}`} /></svg>
						{#if !sidebarCollapsed}
							<span class="adm-nav-label">{item.label}</span>
						{/if}
					</span>
					{#if !sidebarCollapsed && item.badge}
						<span class="adm-nav-badge">{item.badge}</span>
					{/if}
				</button>
			{/each}

			{#if !sidebarCollapsed}
				<div class="adm-nav-section">Channels</div>
			{/if}
			<button
				type="button"
				class="adm-nav-item"
				class:active={activeNav === 'Online Store'}
				title="Online Store"
				onclick={() => (activeNav = 'Online Store')}
			>
				<span class="adm-nav-left">
					<svg class="adm-nav-icon"><use href="#adm-store" /></svg>
					{#if !sidebarCollapsed}
						<span class="adm-nav-label">Online Store</span>
					{/if}
				</span>
			</button>

			{#if !sidebarCollapsed}
				<div class="adm-nav-section">Apps</div>
			{/if}
			<button
				type="button"
				class="adm-nav-item"
				class:active={activeNav === 'Email'}
				title="Email"
				onclick={() => (activeNav = 'Email')}
			>
				<span class="adm-nav-left">
					<svg class="adm-nav-icon"><use href="#adm-email" /></svg>
					{#if !sidebarCollapsed}
						<span class="adm-nav-label">Email</span>
					{/if}
				</span>
			</button>
			<button
				type="button"
				class="adm-nav-item"
				class:active={activeNav === 'WhatsApp'}
				title="WhatsApp"
				onclick={() => (activeNav = 'WhatsApp')}
			>
				<span class="adm-nav-left">
					<svg class="adm-nav-icon"><use href="#adm-whatsapp" /></svg>
					{#if !sidebarCollapsed}
						<span class="adm-nav-label">WhatsApp</span>
					{/if}
				</span>
				{#if !sidebarCollapsed}
					<span class="adm-nav-badge">{multiAgentStore.whatsappThreads.length}</span>
				{/if}
			</button>
		</nav>

		<div class="adm-sidebar-bottom">
			<button
				type="button"
				class="adm-nav-item"
				class:active={activeNav === 'Settings'}
				title="Settings"
				onclick={() => (activeNav = 'Settings')}
			>
				<span class="adm-nav-left">
					<svg class="adm-nav-icon"><use href="#adm-settings" /></svg>
					{#if !sidebarCollapsed}
						<span class="adm-nav-label">Settings</span>
					{/if}
				</span>
			</button>
			{#if !sidebarCollapsed}
				<div class="adm-footer-store">
					<span class="adm-hash"># MVSE</span>
					<button type="button" class="adm-bell" aria-label="Notifications">🔔</button>
				</div>
			{/if}
		</div>
	</aside>

	<!-- Draggable Resizer Handle (<->) -->
	<div
		class="adm-resizer"
		class:active={isResizing}
		role="separator"
		aria-orientation="vertical"
		aria-label="Resize sidebar"
		onpointerdown={startSidebarResize}
	></div>

	<!-- Right Light Workspace Surface -->
	<main class="adm-workspace">
		<div class="adm-topbar">
			<div style="display:flex;align-items:center;gap:10px;">
				<button
					type="button"
					class="lusion-back-pill"
					title="Reverse transition back to Voice Command Center"
					onclick={leaveAdminWithReverseTransition}
				>
					← BACK
				</button>
				<button type="button" class="adm-breadcrumb" onclick={leaveAdminWithReverseTransition}>
					<span>‹</span> {activeNav}
				</button>
			</div>
			<div class="adm-top-actions">
				<!-- Sticky ASK CARBON AI Button (4th Video/Pic Search-Sparkle Icon + Rotating Prismatic Arc Border + Clean Medium Font) -->
				<button
					type="button"
					class="ask-carbon-btn"
					class:active={carbonOpen}
					onclick={toggleCarbonAI}
				>
					<svg class="ask-carbon-search-svg" viewBox="0 0 24 24" aria-hidden="true">
						<defs>
							<linearGradient id="carbonSearchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
								<stop offset="0%" stop-color="#1e293b" />
								<stop offset="50%" stop-color="#3b82f6" />
								<stop offset="100%" stop-color="#f59e0b" />
							</linearGradient>
						</defs>
						<!-- Magnifying glass arc leaving top-right open for sparkle -->
						<path
							d="M15.8 5.2A6.5 6.5 0 1 0 17.5 11"
							fill="none"
							stroke="url(#carbonSearchGrad)"
							stroke-width="2.1"
							stroke-linecap="round"
						/>
						<!-- Handle -->
						<path
							d="M15.6 15.6L20 20"
							fill="none"
							stroke="url(#carbonSearchGrad)"
							stroke-width="2.3"
							stroke-linecap="round"
						/>
						<!-- 4-point AI sparkle at top-right -->
						<path
							d="M17.5 2.5L18.4 5.1L21 6L18.4 6.9L17.5 9.5L16.6 6.9L14 6L16.6 5.1Z"
							fill="#3b82f6"
						/>
					</svg>
					<span class="ask-carbon-text">ASK CARBON</span>
				</button>
			</div>
		</div>

		{#if activeNav === 'Home' || activeNav === 'Projects'}
			{#if activeDetailProject}
				<section
					class="lusion-project-detail"
					class:closing={detailClosing}
					style={`--proj-accent:${activeDetailProject.accent}`}
				>
					<div class="lusion-detail-topbar">
						<span class="lusion-detail-brand" style={`color:${activeDetailProject.accent}`}>
							ISMAIL AI · {activeDetailProject.pmName.toUpperCase()}
						</span>
						<button
							type="button"
							class="lusion-detail-back"
							onclick={closeProjectDetailWithReverseZoom}
						>
							← BACK
						</button>
					</div>

					<div class="lusion-detail-body">
						<div class="lusion-detail-left">
							<h1 class="lusion-detail-title">{activeDetailProject.name}</h1>
							<p class="lusion-detail-desc">
								{activeDetailProject.operationsSummary} Managed autonomously by {activeDetailProject.pmName} ({activeDetailProject.pmRole}), coordinating multi-agent execution, voice command routing, and automated client reporting across all connected channels.
							</p>
							<button
								type="button"
								class="lusion-launch-btn"
								onclick={() => {
									pmTargetProject = activeDetailProject.id;
									closeProjectDetailWithReverseZoom();
								}}
							>
								<span class="lusion-launch-dot"></span>
								LAUNCH PROJECT
							</button>
						</div>

						<div class="lusion-detail-mid">
							<div class="lusion-detail-group">
								<div class="lusion-detail-heading" style={`color:${activeDetailProject.accent}`}>
									AI TEAM &amp; SERVICES
								</div>
								{#each activeDetailProject.teamMembers as member (member)}
									<div class="lusion-detail-item">{member}</div>
								{/each}
								<div class="lusion-detail-item">Voice Command Routing</div>
								<div class="lusion-detail-item">Automated Follow-up Reports</div>
							</div>

							<div class="lusion-detail-group" style="margin-top:24px;">
								<div class="lusion-detail-heading" style={`color:${activeDetailProject.accent}`}>
									LINKS
								</div>
								<button
									type="button"
									class="lusion-detail-link"
									onclick={() => {
										selectedProjectId = null;
										activeNav = 'Meetings';
									}}
								>
									Client Meeting Notes
								</button>
								<button
									type="button"
									class="lusion-detail-link"
									onclick={() => {
										selectedProjectId = null;
										activeNav = 'Leads';
									}}
								>
									Leads &amp; Pipeline
								</button>
								<button
									type="button"
									class="lusion-detail-link"
									onclick={() => {
										selectedProjectId = null;
										activeNav = 'Email';
									}}
								>
									Scheduled Email Reports
								</button>
							</div>
						</div>

						<div class="lusion-detail-stage" style={`--proj-accent:${activeDetailProject.accent}`}>
							<div class="lusion-stage-orb"></div>
							<div class="lusion-stage-caption">
								<strong>{activeDetailProject.pmName} · Active PM Agent</strong>
								<span>Real-time Voice &amp; Multi-Agent Orchestration</span>
							</div>
						</div>
					</div>
				</section>
			{:else}
				<div class="adm-order-header" class:fading-out={zoomingCardId !== null}>
					<div class="adm-order-title-row">
						<h1>Multi-Agent Project Command Center</h1>
						<span class="adm-badge fulfilled">{multiAgentStore.projects.length} Active PM Agents</span>
						<span class="adm-badge paid">{multiAgentStore.taskNotes.length} Voice &amp; Task Notes</span>
					</div>
					<p class="adm-order-subtitle">
						Each project runs its own dedicated AI Project Manager who delegates voice notes to team members &amp; reports back live. Click any project card for Lusion zoom transition.
					</p>
				</div>

				<section class="adm-card adm-pm-composer-card" class:fading-out={zoomingCardId !== null}>
					<form class="adm-pm-composer" onsubmit={handleCreatePMNote}>
						<select bind:value={pmTargetProject} aria-label="Target project">
							<option value="all">Auto-Route to Best PM</option>
							{#each multiAgentStore.projects as p (p.id)}
								<option value={p.id}>{p.pmName} — {p.name}</option>
							{/each}
						</select>
						<input
							type="text"
							placeholder="Give a task note to your Project Manager (English / বাংলা)..."
							bind:value={pmNoteInput}
						/>
						<button type="submit" class="adm-btn-dark">Assign to PM</button>
					</form>
				</section>

				<div class="adm-pm-grid" class:has-zooming-card={zoomingCardId !== null}>
					{#each multiAgentStore.projects as proj (proj.id)}
						<section
							class="adm-card adm-pm-card lusion-clickable-card"
							class:zooming-card={zoomingCardId === proj.id}
							class:sibling-fade={zoomingCardId !== null && zoomingCardId !== proj.id}
							onclick={() => openProjectDetailWithZoom(proj.id)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									openProjectDetailWithZoom(proj.id);
								}
							}}
							role="button"
							tabindex="0"
						>
							<div class="adm-pm-head">
								<div class="adm-pm-title-wrap">
									<span class="adm-pm-dot" style={`background:${proj.accent}`}></span>
									<div>
										<h2 class="adm-card-title" style="margin:0">{proj.name}</h2>
										<div class="adm-pm-role">{proj.pmName} · {proj.pmRole}</div>
									</div>
								</div>
								<span class="adm-badge fulfilled">{proj.status}</span>
							</div>
							<p class="adm-pm-ops">{proj.operationsSummary}</p>
							<div class="adm-pm-team">
								{#each proj.teamMembers as member (member)}
									<span class="adm-tag-chip">{member}</span>
								{/each}
							</div>
							<div class="lusion-card-cta">
								<span>→ Explore {proj.name}</span>
							</div>
						</section>
					{/each}
				</div>
			{/if}

			<section class="adm-card" style="margin-top:16px">
				<div class="adm-tags-head" style="margin-bottom:12px">
					<h2 class="adm-card-title" style="margin:0">Live Voice Task Notes &amp; PM Team Reports</h2>
					<button type="button" class="adm-btn-outline" onclick={() => (activeNav = 'Email')}>
						Account Follow-ups →
					</button>
				</div>
				<div class="adm-notes-feed">
					{#each multiAgentStore.taskNotes as note (note.id)}
						<div class="adm-note-row">
							<div class="adm-note-top">
								<span class="adm-badge paid">{note.pmName} · {note.projectName}</span>
								<span class="adm-badge {note.status === 'Completed' ? 'fulfilled' : 'unfulfilled'}">{note.status}</span>
								<span class="adm-note-time">{note.source === 'voice' ? '🎙 Voice' : '⌨ Text'} · {note.createdAt}</span>
							</div>
							<div class="adm-note-body">"{note.note}"</div>
							<div class="adm-note-report">
								<strong>PM Report:</strong> {note.pmReport}
							</div>
							<div class="adm-note-actions">
								<div class="adm-pm-team">
									{#each note.delegatedTo as m (m)}
										<span class="adm-tag-chip">{m}</span>
									{/each}
								</div>
								{#if note.status !== 'Completed'}
									<button
										type="button"
										class="adm-btn-outline"
										onclick={() => multiAgentStore.updateNoteStatus(note.id, 'Completed')}
									>
										Mark Completed
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</section>
		{:else if activeNav === 'Meetings'}
			<div class="adm-order-header">
				<div class="adm-order-title-row">
					<h1>Client Meeting Summaries</h1>
					<span class="adm-badge fulfilled">Read.ai · Fireflies · Otter Synced</span>
					{#if unreadMeetingsCount > 0}
						<span class="adm-badge unfulfilled">{unreadMeetingsCount} Unread</span>
					{/if}
				</div>
				<p class="adm-order-subtitle">
					Every client meeting by your Sales, Marketing &amp; Core Team members — summarized automatically for you to read whenever you are free.
				</p>
			</div>

			<section class="adm-card adm-pm-composer-card">
				<div class="adm-note-actions" style="margin-bottom:10px">
					<div class="adm-pm-team">
						{#each ['All', 'Core Team', 'Sales', 'Marketing'] as tab (tab)}
							<button
								type="button"
								class={meetingDeptFilter === tab ? 'adm-btn-dark' : 'adm-btn-outline'}
								onclick={() => (meetingDeptFilter = tab as typeof meetingDeptFilter)}
							>
								{tab}
							</button>
						{/each}
						<button
							type="button"
							class={meetingUnreadOnly ? 'adm-btn-dark' : 'adm-btn-outline'}
							onclick={() => (meetingUnreadOnly = !meetingUnreadOnly)}
						>
							Unread Only
						</button>
					</div>
					{#if unreadMeetingsCount > 0}
						<button type="button" class="adm-btn-outline" onclick={() => multiAgentStore.markAllMeetingsRead()}>
							Mark All Read ✓
						</button>
					{/if}
				</div>
				<form class="adm-pm-composer" onsubmit={handleSyncMeetingNote}>
					<select bind:value={mtgDept} aria-label="Department">
						<option value="Sales">Sales Team</option>
						<option value="Marketing">Marketing Team</option>
						<option value="Core Team">Core Team</option>
					</select>
					<select bind:value={mtgTool} aria-label="AI Note Tool">
						<option value="Read.ai">Read.ai</option>
						<option value="Fireflies.ai">Fireflies.ai</option>
						<option value="Otter.ai">Otter.ai</option>
					</select>
					<input type="text" placeholder="Team member (e.g. Rahim)" bind:value={mtgTeamMember} style="max-width:170px" />
					<input type="text" placeholder="Client name" bind:value={mtgClient} style="max-width:160px" />
					<input type="text" placeholder="Meeting summary note..." bind:value={mtgSummary} />
					<button type="submit" class="adm-btn-dark">Sync Note</button>
				</form>
			</section>

			<div class="adm-notes-feed">
				{#each filteredMeetings as mtg (mtg.id)}
					<section class="adm-card adm-pm-card">
						<div class="adm-note-top">
							<span class="adm-badge paid">{mtg.teamMember}</span>
							<span class="adm-badge {mtg.isCoreMember ? 'fulfilled' : 'paid'}">
								{mtg.isCoreMember ? 'Core Team' : mtg.department}
							</span>
							<span class="adm-tag-chip">{mtg.sourceTool} · {mtg.duration}</span>
							<span class="adm-badge {mtg.readStatus === 'Unread' ? 'unfulfilled' : 'fulfilled'}">
								{mtg.readStatus}
							</span>
							<span class="adm-note-time">{mtg.occurredAt}</span>
						</div>
						<div class="adm-pm-head">
							<div>
								<h2 class="adm-card-title" style="margin:0">{mtg.meetingTitle} — {mtg.clientName}</h2>
								<div class="adm-pm-role">Project: {mtg.projectName}</div>
							</div>
						</div>
						<p class="adm-pm-ops">{mtg.summary}</p>
						<div class="adm-note-actions">
							<div class="adm-pm-team">
								{#each mtg.actionItems as act (act)}
									<span class="adm-tag-chip">✓ {act}</span>
								{/each}
							</div>
							<button
								type="button"
								class="adm-btn-outline"
								onclick={() => multiAgentStore.markMeetingRead(mtg.id)}
							>
								{mtg.readStatus === 'Unread' ? 'Mark as Read ✓' : 'Mark Unread'}
							</button>
						</div>
					</section>
				{/each}
			</div>
		{:else if activeNav === 'Leads'}
			<div class="adm-order-header">
				<div class="adm-order-title-row">
					<h1>Leads &amp; Pipeline</h1>
					<span class="adm-badge fulfilled">{multiAgentStore.leads.length} Active Opportunities</span>
				</div>
				<p class="adm-order-subtitle">
					Track incoming Sales &amp; Marketing leads across all projects and advance pipeline stages.
				</p>
			</div>

			<div class="adm-pm-grid">
				{#each multiAgentStore.leads as lead (lead.id)}
					<section class="adm-card adm-pm-card">
						<div class="adm-pm-head">
							<div>
								<h2 class="adm-card-title" style="margin:0">{lead.name}</h2>
								<div class="adm-pm-role">{lead.company} · {lead.projectName}</div>
							</div>
							<span class="adm-badge {lead.stage === 'Won' ? 'fulfilled' : 'paid'}">{lead.stage}</span>
						</div>
						<div class="adm-sched-meta">
							<span>Owner: <strong>{lead.owner}</strong></span>
							<span>Value: <strong>{lead.value}</strong></span>
						</div>
						<p class="adm-pm-ops">Next: {lead.nextAction}</p>
						<div class="adm-note-actions">
							<button
								type="button"
								class="adm-btn-outline"
								onclick={() => multiAgentStore.advanceLeadStage(lead.id)}
							>
								Advance Stage →
							</button>
						</div>
					</section>
				{/each}
			</div>
		{:else if activeNav === 'WhatsApp'}
			<div class="adm-order-header">
				<div class="adm-order-title-row">
					<h1>WhatsApp Business &amp; AI Bot</h1>
					<span class="adm-badge fulfilled">Live Agent Connected</span>
				</div>
				<p class="adm-order-subtitle">
					Automated WhatsApp client conversations handled by your Project Manager AI Agents.
				</p>
			</div>

			<div class="adm-notes-feed">
				{#each multiAgentStore.whatsappThreads as wa (wa.id)}
					<section class="adm-card adm-pm-card">
						<div class="adm-note-top">
							<span class="adm-badge paid">{wa.contact}</span>
							<span class="adm-tag-chip">{wa.phone}</span>
							<span class="adm-badge {wa.status === 'Active' ? 'fulfilled' : 'unfulfilled'}">{wa.status}</span>
							<span class="adm-note-time">{wa.time}</span>
						</div>
						<div class="adm-pm-role">Project: {wa.projectName}</div>
						<div class="adm-note-body">Client: "{wa.lastMessage}"</div>
						<div class="adm-note-report">{wa.agentReply}</div>
						<form
							class="adm-pm-composer"
							onsubmit={(e) => {
								e.preventDefault();
								multiAgentStore.sendWhatsAppReply(wa.id, waReplyMap[wa.id] ?? '');
								waReplyMap = { ...waReplyMap, [wa.id]: '' };
							}}
						>
							<input
								type="text"
								placeholder="Reply on WhatsApp..."
								value={waReplyMap[wa.id] ?? ''}
								oninput={(e) => (waReplyMap = { ...waReplyMap, [wa.id]: e.currentTarget.value })}
							/>
							<button type="submit" class="adm-btn-dark">Send WhatsApp</button>
						</form>
					</section>
				{/each}
			</div>
		{:else if activeNav === 'Email' || activeNav === 'Payments'}
			<div class="adm-order-header">
				<div class="adm-order-title-row">
					<h1>Account Team Follow-up &amp; Reporting</h1>
					<span class="adm-badge fulfilled">Kairo · Account PM Active</span>
				</div>
				<p class="adm-order-subtitle">
					Automated Daily, Weekly &amp; Monthly follow-up emails dispatched on time to your Account Team.
				</p>
			</div>

			<section class="adm-card adm-pm-composer-card">
				<form class="adm-pm-composer" onsubmit={handleAddSchedule}>
					<select bind:value={newSchedCadence} aria-label="Cadence">
						<option value="Daily">Daily</option>
						<option value="Weekly">Weekly</option>
						<option value="Monthly">Monthly</option>
					</select>
					<input type="text" placeholder="Follow-up report title..." bind:value={newSchedTitle} />
					<input type="email" placeholder="Recipient email" bind:value={newSchedRecipient} style="max-width:220px" />
					<button type="submit" class="adm-btn-dark">Add Schedule</button>
				</form>
			</section>

			<div class="adm-pm-grid">
				{#each multiAgentStore.accountSchedules as sched (sched.id)}
					<section class="adm-card adm-pm-card">
						<div class="adm-pm-head">
							<div>
								<h2 class="adm-card-title" style="margin:0">{sched.title}</h2>
								<div class="adm-pm-role">{sched.cadence} · {sched.recipient}</div>
							</div>
							<span class="adm-badge {sched.active ? 'fulfilled' : 'unfulfilled'}">
								{sched.active ? 'On Schedule' : 'Paused'}
							</span>
						</div>
						<p class="adm-pm-ops">{sched.summaryTemplate}</p>
						<div class="adm-sched-meta">
							<span>Next: <strong>{sched.nextRun}</strong></span>
							<span>Last: <strong>{sched.lastSent}</strong></span>
						</div>
						<div class="adm-note-actions" style="margin-top:10px">
							<button
								type="button"
								class="adm-btn-outline"
								onclick={() => multiAgentStore.toggleSchedule(sched.id)}
							>
								{sched.active ? 'Pause' : 'Resume'}
							</button>
							<button
								type="button"
								class="adm-btn-dark"
								onclick={() => multiAgentStore.triggerAccountFollowup(sched.id)}
							>
								Send Follow-up Now
							</button>
						</div>
					</section>
				{/each}
			</div>
		{:else}
		<div class="adm-order-header">
			<div class="adm-order-title-row">
				<h1>Order # 1078</h1>
				<span class="adm-badge paid">Paid</span>
				<span class="adm-badge" class:unfulfilled={!fulfilled} class:fulfilled={fulfilled}>
					{fulfilled ? 'Fulfilled' : 'Unfulfilled'}
				</span>
			</div>
			<p class="adm-order-subtitle">24 Sept 2026 at 12:00 PM via Online Store</p>
		</div>

		<div class="adm-grid">
			<!-- Left Column -->
			<div class="adm-col-left">
				<div class="adm-note-banner">
					<div class="adm-note-title">Note from customer</div>
					<div class="adm-note-body">
						Please delay shipping 2 days as I'm out on holiday and unable to retrieve the package. Thanks!
					</div>
				</div>

				<!-- Fulfillment Card -->
				<section class="adm-card">
					<div class="adm-card-header">
						<span class="adm-badge" class:unfulfilled={!fulfilled} class:fulfilled={fulfilled}>
							{fulfilled ? 'Fulfilled' : 'Unfulfilled'}
						</span>
						<div class="adm-card-actions">
							<button type="button" class="adm-btn-ghost" title="More options">•••</button>
							<button type="button" class="adm-btn-secondary" onclick={handleToggleFulfilled}>
								{fulfilled ? 'Mark as unfulfilled' : 'Mark as fulfilled'} ⌄
							</button>
							<button
								type="button"
								class="adm-btn-primary"
								onclick={handleCreateShippingLabel}
								disabled={shippingLabelCreated}
							>
								{shippingLabelCreated ? 'Shipping label created' : 'Create shipping label'}
							</button>
						</div>
					</div>

					<div class="adm-warehouse-bar">
						<span class="adm-ship-tag">🚚 Express</span>
						<span class="adm-warehouse-name">📍 Montreal Warehouse</span>
					</div>

					<div class="adm-items-list">
						{#each items as item (item.id)}
							<div class="adm-item-row">
								<div class="adm-item-thumb" style="background:{item.thumbBg}">
									<span>{item.thumbEmoji}</span>
								</div>
								<div class="adm-item-info">
									<div class="adm-item-name">{item.name}</div>
									<div class="adm-item-variant">{item.variant}</div>
								</div>
								<div class="adm-item-qty">
									<span>${item.price.toFixed(2)}</span>
									<span class="adm-times">×</span>
									<input
										type="number"
										min="1"
										max="99"
										bind:value={item.qty}
										aria-label="Quantity for {item.name}"
									/>
								</div>
								<div class="adm-item-total">${(item.price * item.qty).toFixed(2)}</div>
							</div>
						{/each}
					</div>
				</section>

				<!-- Payment Card -->
				<section class="adm-card">
					<h2 class="adm-card-title">Payment</h2>
					<div class="adm-payment-rows">
						<div class="adm-pay-row">
							<span>Subtotal</span>
							<span class="adm-pay-mid">{totalItemsCount} items</span>
							<span>${subtotal.toFixed(2)}</span>
						</div>
						<div class="adm-pay-row">
							<span>Discount</span>
							<span class="adm-pay-mid">10OFF</span>
							<span>-${discount.toFixed(2)}</span>
						</div>
						<div class="adm-pay-row">
							<span>Shipping</span>
							<span class="adm-pay-mid">DHL Express</span>
							<span>${shipping.toFixed(2)}</span>
						</div>
						<div class="adm-pay-row total">
							<span>Total</span>
							<span></span>
							<span>${total.toFixed(2)}</span>
						</div>
					</div>
					<div class="adm-pay-methods">
						<div class="adm-pay-method-row">
							<span class="shop-cash-pill">shop cash</span>
							<span>$50.00</span>
						</div>
						<div class="adm-pay-method-row">
							<span class="card-dots">🟠🟡 •••• 8829</span>
							<span>${Math.max(0, total - 50).toFixed(2)}</span>
						</div>
					</div>
				</section>
			</div>

			<!-- Right Column -->
			<div class="adm-col-right">
				<!-- Customer Card with Subtle Map Accent -->
				<section class="adm-card adm-customer-card">
					<div class="adm-map-glow" aria-hidden="true">
						<span class="adm-map-pin"></span>
					</div>
					<h2 class="adm-card-title">Danielle Hudson</h2>
					<div class="adm-meta-line">✉ danielle.hudson@example.com</div>
					<div class="adm-meta-line">🛍 4 orders</div>

					<h3 class="adm-subhead">Shipping address</h3>
					<p class="adm-address">
						Danielle Hudson<br />
						184 Kent Ave<br />
						Brooklyn, NY<br />
						United States
					</p>
				</section>

				<!-- Order Risk Card -->
				<section class="adm-card">
					<h2 class="adm-card-title">Order risk</h2>
					<p class="adm-muted-text">Low chargeback risk. You can fulfill this order.</p>
					<div class="adm-risk-bar">
						<div class="risk-seg active"><span>Low</span></div>
						<div class="risk-seg"><span>Medium</span></div>
						<div class="risk-seg"><span>High</span></div>
					</div>
				</section>

				<!-- Conversion Summary Card -->
				<section class="adm-card">
					<h2 class="adm-card-title">Conversion summary</h2>
					<div class="adm-meta-line">🛒 4th order</div>
					<div class="adm-meta-line">🔗 Source: direct</div>
					<div class="adm-meta-line truncate">🌐 Landing page: /admin/api/unversio...</div>
				</section>

				<!-- Tags Card -->
				<section class="adm-card">
					<div class="adm-tags-head">
						<h2 class="adm-card-title">Tags</h2>
						<button type="button" class="adm-plus-btn" onclick={() => (addingTag = !addingTag)}>+</button>
					</div>
					<div class="adm-tags-list">
						{#each tags as tag (tag)}
							<span class="adm-tag-chip">
								{tag}
								<button
									type="button"
									aria-label="Remove {tag}"
									onclick={() => (tags = tags.filter((t) => t !== tag))}
								>
									×
								</button>
							</span>
						{/each}
					</div>
					{#if addingTag}
						<form class="adm-tag-form" onsubmit={handleAddTag}>
							<input type="text" placeholder="Add a tag..." bind:value={newTagText} />
							<button type="submit">Add</button>
						</form>
					{/if}
				</section>

				<!-- Timeline Card -->
				<section class="adm-card">
					<h2 class="adm-card-title">Timeline</h2>
					<form class="adm-comment-form" onsubmit={handlePostComment}>
						<input type="text" placeholder="Leave a comment" bind:value={commentText} />
					</form>
					<ul class="adm-timeline-list">
						{#each timeline as entry (entry.id)}
							<li>
								<span class="adm-tl-dot"></span>
								<span class="adm-tl-text">{entry.text}</span>
								<span class="adm-tl-time">{entry.time}</span>
							</li>
						{/each}
					</ul>
				</section>
			</div>
		</div>
		{/if}

	</main>

	<!-- 5th Pic: Right-side Carbon AI Sidekick Panel (Smoothly animates open & close) -->
	<aside
		class="carbon-ai-panel"
		class:open={carbonOpen}
		aria-label="Ask Carbon AI Assistant"
		aria-hidden={!carbonOpen}
	>
			<div class="carbon-header">
				<button type="button" class="carbon-title-btn">
					<span>International expansion</span>
					<span class="carbon-chev">⌄</span>
				</button>
				<div class="carbon-header-actions">
					<button type="button" title="New thread" onclick={() => (carbonMessages = carbonMessages.slice(0, 1))}>✎</button>
					<button type="button" title="Open Voice Center" onclick={() => goto('/')}>⤢</button>
					<button type="button" title="Close Carbon AI" onclick={() => (carbonOpen = false)}>×</button>
				</div>
			</div>

			<div class="carbon-body">
				<!-- Gradient To-dos Card matching 5th pic -->
				<div class="carbon-todo-card">
					<div class="carbon-todo-top">
						<span>To-dos</span>
						<span>{carbonTodos.filter((t) => t.done).length}/5</span>
					</div>
					{#each carbonTodos as todo (todo.id)}
						<button
							type="button"
							class="carbon-todo-inner"
							onclick={() => (todo.done = !todo.done)}
						>
							<div class="todo-row-main">
								<span class="todo-circle" class:done={todo.done}>◐</span>
								<span class="todo-title">{todo.title}</span>
								<span class="todo-count">↪ 3</span>
							</div>
							<div class="todo-sub">{todo.sub}</div>
						</button>
					{/each}
				</div>

				<div class="carbon-thought">💡 Thought for 1 sec</div>

				<div class="carbon-messages">
					{#each carbonMessages as msg, i (i)}
						<div class="carbon-msg" class:user={msg.role === 'user'}>
							{msg.text}
						</div>
					{/each}
				</div>

				<div class="carbon-quick-chip-row">
					<button
						type="button"
						class="carbon-quick-chip"
						onclick={() => {
							carbonInput = 'Sounds good!';
							handleCarbonSubmit(new SubmitEvent('submit'));
						}}
					>
						Sounds good!
					</button>
				</div>

				<div class="carbon-working">⋮ Working on it</div>
			</div>

			<form class="carbon-input-bar" onsubmit={handleCarbonSubmit}>
				<span class="carbon-mini-orb" aria-hidden="true">✦</span>
				<input
					type="text"
					placeholder="Work with Carbon..."
					bind:value={carbonInput}
				/>
				<button type="button" class="carbon-bar-btn" title="Add context">+</button>
				<button type="button" class="carbon-bar-btn" title="Voice mode" onclick={() => goto('/')}>🎙</button>
			</form>
	</aside>
</div>

<style>
	.adm-svg-defs {
		position: absolute;
		width: 0;
		height: 0;
		overflow: hidden;
		pointer-events: none;
	}

	.shopify-shell {
		display: flex;
		height: 100vh;
		overflow: hidden;
		background: #000000;
		color: #1a1c1e;
		font-family: var(--font-body);
	}

	/* Left Pure Dark Black Sidebar with Hidden Independent Scroll */
	.adm-sidebar {
		width: 232px;
		height: 100vh;
		overflow-y: auto;
		flex-shrink: 0;
		background: #000000;
		color: #d4d7dc;
		display: flex;
		flex-direction: column;
		padding: 14px 12px;
		gap: 10px;
		scrollbar-width: none;
		-ms-overflow-style: none;
		transition: width 0.52s cubic-bezier(0.22, 1, 0.36, 1), padding 0.52s cubic-bezier(0.22, 1, 0.36, 1);
	}

	.adm-sidebar.resizing {
		transition: none;
	}

	.adm-resizer {
		width: 8px;
		margin: 10px -4px;
		cursor: col-resize;
		flex-shrink: 0;
		position: relative;
		z-index: 60;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.adm-resizer::after {
		content: '';
		width: 3px;
		height: 36px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.14);
		opacity: 0;
		transition: opacity 0.2s ease, background 0.2s ease, height 0.2s ease;
	}

	.adm-resizer:hover::after,
	.adm-resizer.active::after {
		opacity: 1;
		height: 64px;
		background: #a855f7;
	}

	.adm-sidebar::-webkit-scrollbar {
		display: none;
	}

	.adm-sidebar.collapsed {
		width: 60px;
		padding: 14px 10px;
		align-items: center;
	}

	.adm-sidebar.collapsed .adm-nav-item {
		justify-content: center;
		padding: 8px;
	}

	.adm-collapsed-search {
		width: 38px;
		height: 34px;
		border-radius: 9px;
		background: #141414;
		border: 1px solid #262626;
		color: #9ca3af;
		font-size: 15px;
		cursor: pointer;
		display: grid;
		place-items: center;
	}

	.adm-kbd-toggle {
		color: #9ca3af;
		background: transparent;
		border: 0;
		padding: 2px;
		border-radius: 5px;
		cursor: pointer;
		display: grid;
		place-items: center;
		transition: background 0.15s, color 0.15s;
	}

	.adm-kbd-toggle:hover {
		background: #222222;
		color: #ffffff;
	}

	.adm-brand-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 2px 4px;
		gap: 8px;
		min-width: 0;
	}

	.adm-store-pill {
		display: flex;
		align-items: center;
		gap: 8px;
		background: transparent;
		border: 0;
		padding: 0;
		color: #ffffff;
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 21px;
		letter-spacing: -0.02em;
		line-height: 1.1;
		white-space: nowrap;
		flex-shrink: 0;
		cursor: pointer;
		transition: font-size 0.18s ease;
	}

	.adm-sidebar.compact .adm-store-pill {
		font-size: 16px;
	}

	.adm-store-name {
		white-space: nowrap;
	}

	.adm-store-name span {
		color: #c864fa;
		font-weight: 600;
	}

	.adm-store-name-mini {
		font-size: 16px;
		font-weight: 700;
		color: #ffffff;
	}

	.adm-store-name-mini span {
		color: #c864fa;
	}

	.adm-view-web-btn {
		background: #141414;
		border: 1px solid #2b2b2b;
		color: #e5e7eb;
		padding: 4px 10px;
		border-radius: 7px;
		cursor: pointer;
		font-family: var(--font-body);
		font-size: 11.5px;
		font-weight: 500;
		white-space: nowrap;
		min-width: 0;
		flex-shrink: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		transition: background 0.15s, border-color 0.15s, color 0.15s, padding 0.18s ease;
	}

	.adm-sidebar.compact .adm-view-web-btn {
		padding: 4px 7px;
		font-size: 11px;
	}

	.adm-view-web-btn:hover {
		background: #222222;
		border-color: #a855f7;
		color: #ffffff;
	}

	.adm-search-wrap {
		position: relative;
	}

	.adm-search-box {
		display: flex;
		align-items: center;
		gap: 6px;
		background: #141414;
		border: 1px solid #262626;
		border-radius: 9px;
		padding: 6px 10px;
	}

	.adm-search-box:focus-within {
		border-color: #52525b;
	}

	.adm-search-clear {
		background: transparent;
		border: 0;
		color: #9ca3af;
		font-size: 15px;
		line-height: 1;
		cursor: pointer;
		padding: 0 2px;
	}

	.adm-search-clear:hover {
		color: #ffffff;
	}

	.adm-search-results {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		right: 0;
		background: #141414;
		border: 1px solid #2b2b2b;
		border-radius: 10px;
		padding: 4px;
		z-index: 80;
		box-shadow: 0 12px 28px rgba(0, 0, 0, 0.55);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.adm-search-result-item {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 1px;
		width: 100%;
		background: transparent;
		border: 0;
		border-radius: 7px;
		padding: 7px 9px;
		cursor: pointer;
		text-align: left;
		transition: background 0.12s;
	}

	.adm-search-result-item:hover {
		background: #242429;
	}

	.adm-sr-label {
		color: #f3f4f6;
		font-size: 12.5px;
		font-weight: 500;
	}

	.adm-sr-meta {
		color: #9ca3af;
		font-size: 11px;
	}

	.adm-search-empty {
		padding: 8px 10px;
		font-size: 12px;
		color: #9ca3af;
	}

	.adm-search-icon {
		color: #8c919b;
		font-size: 14px;
	}

	.adm-search-box input {
		flex: 1;
		min-width: 0;
		background: transparent;
		border: 0;
		outline: 0;
		color: #f3f4f6;
		font-size: 13px;
	}

	.adm-nav {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
	}

	.adm-nav-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 7px 10px;
		border: 0;
		border-radius: 8px;
		background: transparent;
		color: #b8bcc4;
		font-size: 13.5px;
		font-weight: 400;
		cursor: pointer;
		text-align: left;
		transition: background 0.15s, color 0.15s;
	}

	.adm-nav-left {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.adm-nav-icon {
		width: 16px;
		height: 16px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.85;
		stroke-linecap: round;
		stroke-linejoin: round;
		flex-shrink: 0;
		opacity: 0.85;
	}

	.adm-nav-item:hover {
		background: #141414;
		color: #ffffff;
	}

	.adm-nav-item.active {
		background: #222222;
		color: #ffffff;
		font-weight: 600;
	}

	.adm-nav-item.active .adm-nav-icon {
		opacity: 1;
	}

	.adm-nav-badge {
		background: #262626;
		color: #e5e7eb;
		font-size: 11px;
		padding: 1px 7px;
		border-radius: 999px;
	}

	.adm-nav-section {
		font-size: 11.5px;
		color: #737373;
		font-weight: 500;
		padding: 12px 10px 4px;
	}

	.adm-sidebar-bottom {
		border-top: 1px solid #1a1a1a;
		padding-top: 8px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.adm-footer-store {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 4px 10px;
		font-size: 12.5px;
		font-weight: 600;
		color: #e5e7eb;
	}

	.adm-bell {
		background: transparent;
		border: 0;
		cursor: pointer;
		font-size: 13px;
	}

	/* Light Main Workspace with Hidden Independent Scroll */
	.adm-workspace {
		flex: 1;
		min-width: 0;
		height: calc(100vh - 20px);
		margin: 10px 10px 10px 0;
		background: #f6f6f7;
		border-radius: 14px;
		padding: 18px 28px 40px;
		overflow-y: auto;
		position: relative;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.adm-workspace::-webkit-scrollbar {
		display: none;
	}

	.adm-topbar {
		position: sticky;
		top: 0;
		z-index: 45;
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: -18px -28px 14px;
		padding: 14px 28px 10px;
		background: transparent;
		pointer-events: none;
	}

	.adm-breadcrumb,
	.adm-top-actions {
		pointer-events: auto;
	}

	/* Sticky ASK CARBON Button matching 4th video prismatic rotating border glow */
	@property --carbon-angle {
		syntax: '<angle>';
		initial-value: 0deg;
		inherits: false;
	}

	.ask-carbon-btn {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 18px;
		border-radius: 999px;
		border: 1.6px solid transparent;
		background:
			linear-gradient(#f8f9fa, #ffffff) padding-box,
			conic-gradient(
				from var(--carbon-angle),
				#d1d5db 0deg,
				#d1d5db 115deg,
				#3b82f6 130deg,
				#ec4899 150deg,
				#f59e0b 170deg,
				#d1d5db 185deg,
				#d1d5db 295deg,
				#8b5cf6 310deg,
				#10b981 330deg,
				#3b82f6 350deg,
				#d1d5db 360deg
			) border-box;
		color: #3c4043;
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 14px;
		letter-spacing: 0.02em;
		cursor: pointer;
		box-shadow:
			0 2px 10px rgba(17, 24, 39, 0.07),
			0 0 12px rgba(139, 92, 246, 0.09);
		animation: carbonPrismSpin 3.6s linear infinite;
		transition: transform 0.25s ease, box-shadow 0.25s ease;
	}

	.ask-carbon-btn:hover {
		transform: translateY(-1px);
		box-shadow:
			0 5px 16px rgba(17, 24, 39, 0.12),
			0 0 18px rgba(139, 92, 246, 0.2);
	}

	.ask-carbon-btn.active {
		background:
			linear-gradient(#ffffff, #f3e8ff) padding-box,
			conic-gradient(
				from var(--carbon-angle),
				#d1d5db 0deg,
				#d1d5db 110deg,
				#8b5cf6 130deg,
				#ec4899 155deg,
				#3b82f6 175deg,
				#d1d5db 190deg,
				#d1d5db 290deg,
				#a855f7 310deg,
				#3b82f6 335deg,
				#d1d5db 360deg
			) border-box;
		color: #4c1d95;
		box-shadow:
			0 5px 16px rgba(17, 24, 39, 0.12),
			0 0 18px rgba(139, 92, 246, 0.22);
	}

	.ask-carbon-search-svg {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
		color: #3c4043;
	}

	@keyframes carbonPrismSpin {
		to {
			--carbon-angle: 360deg;
		}
	}

	.adm-breadcrumb {
		background: transparent;
		border: 0;
		font-size: 13.5px;
		font-weight: 500;
		color: #4b5563;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 0;
	}

	.adm-top-actions {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.adm-order-header {
		margin-bottom: 18px;
	}

	.adm-order-title-row {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.adm-order-title-row h1 {
		margin: 0;
		font-family: var(--font-display);
		font-size: 24px;
		font-weight: 700;
		letter-spacing: -0.025em;
		color: #111827;
	}

	.adm-order-subtitle {
		margin: 4px 0 0;
		font-size: 12.5px;
		color: #6b7280;
	}

	.adm-badge {
		font-size: 11.5px;
		font-weight: 600;
		padding: 3px 9px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
	}

	.adm-badge.paid {
		background: #e5e7eb;
		color: #374151;
	}

	.adm-badge.unfulfilled {
		background: #fef08a;
		color: #854d0e;
	}

	.adm-badge.fulfilled {
		background: #d1fae5;
		color: #065f46;
	}

	.adm-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.85fr) minmax(280px, 1fr);
		gap: 18px;
		align-items: start;
	}

	.adm-col-left,
	.adm-col-right {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.adm-note-banner {
		background: #fef9c3;
		border: 1px solid #fde047;
		border-radius: 12px;
		padding: 12px 14px;
	}

	.adm-note-title {
		font-size: 11.5px;
		font-weight: 600;
		color: #713f12;
		margin-bottom: 4px;
	}

	.adm-note-body {
		font-size: 13px;
		color: #422006;
		line-height: 1.45;
	}

	.adm-card {
		background: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 16px;
		box-shadow: 0 1px 2px rgba(17, 24, 39, 0.04);
	}

	.adm-card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 10px;
		margin-bottom: 12px;
	}

	.adm-card-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.adm-btn-ghost {
		background: transparent;
		border: 0;
		color: #6b7280;
		cursor: pointer;
		padding: 6px;
	}

	.adm-btn-secondary {
		background: #ffffff;
		border: 1px solid #d1d5db;
		color: #111827;
		font-size: 12.5px;
		font-weight: 600;
		padding: 6px 12px;
		border-radius: 8px;
		cursor: pointer;
	}

	.adm-btn-primary {
		background: #18181b;
		border: 1px solid #18181b;
		color: #ffffff;
		font-size: 12.5px;
		font-weight: 600;
		padding: 6px 13px;
		border-radius: 8px;
		cursor: pointer;
	}

	.adm-btn-primary:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.adm-warehouse-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 8px 12px;
		font-size: 12.5px;
		color: #374151;
		margin-bottom: 12px;
	}

	.adm-items-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.adm-item-row {
		display: grid;
		grid-template-columns: 44px 1fr auto 74px;
		align-items: center;
		gap: 12px;
		padding-bottom: 10px;
		border-bottom: 1px solid #f3f4f6;
	}

	.adm-item-row:last-child {
		border-bottom: 0;
		padding-bottom: 0;
	}

	.adm-item-thumb {
		width: 44px;
		height: 44px;
		border-radius: 8px;
		display: grid;
		place-items: center;
		font-size: 20px;
		border: 1px solid #e5e7eb;
	}

	.adm-item-name {
		font-size: 13.5px;
		font-weight: 600;
		color: #111827;
	}

	.adm-item-variant {
		font-size: 12px;
		color: #6b7280;
		margin-top: 2px;
	}

	.adm-item-qty {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		color: #374151;
	}

	.adm-item-qty input {
		width: 44px;
		padding: 4px 6px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		text-align: center;
		font-size: 12.5px;
	}

	.adm-item-total {
		text-align: right;
		font-size: 13.5px;
		font-weight: 600;
		color: #111827;
	}

	.adm-card-title {
		margin: 0 0 10px;
		font-family: var(--font-display);
		font-size: 14.5px;
		font-weight: 600;
		color: #111827;
	}

	.adm-payment-rows {
		display: flex;
		flex-direction: column;
		gap: 8px;
		font-size: 13px;
		color: #374151;
		padding-bottom: 12px;
		border-bottom: 1px solid #f3f4f6;
	}

	.adm-pay-row {
		display: grid;
		grid-template-columns: 110px 1fr auto;
		align-items: center;
	}

	.adm-pay-mid {
		color: #6b7280;
	}

	.adm-pay-row.total {
		font-weight: 700;
		color: #111827;
		padding-top: 6px;
		font-size: 14px;
	}

	.adm-pay-methods {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding-top: 10px;
		font-size: 12.5px;
		color: #4b5563;
	}

	.adm-pay-method-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.shop-cash-pill {
		background: #ede9fe;
		color: #5b21b6;
		font-weight: 700;
		font-size: 11px;
		padding: 2px 7px;
		border-radius: 5px;
	}

	.adm-customer-card {
		position: relative;
		overflow: hidden;
	}

	.adm-map-glow {
		position: absolute;
		top: -12px;
		right: -12px;
		width: 120px;
		height: 110px;
		background: radial-gradient(circle at 60% 40%, rgba(187, 247, 208, 0.7), rgba(219, 234, 254, 0.4) 55%, transparent 75%);
		pointer-events: none;
	}

	.adm-map-pin {
		position: absolute;
		top: 38px;
		right: 36px;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #2563eb;
		box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.18);
	}

	.adm-meta-line {
		font-size: 12.5px;
		color: #4b5563;
		margin-bottom: 5px;
	}

	.adm-meta-line.truncate {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.adm-subhead {
		margin: 12px 0 4px;
		font-size: 12.5px;
		font-weight: 600;
		color: #111827;
	}

	.adm-address {
		margin: 0;
		font-size: 12.5px;
		line-height: 1.5;
		color: #4b5563;
	}

	.adm-muted-text {
		margin: 0 0 10px;
		font-size: 12.5px;
		color: #4b5563;
	}

	.adm-risk-bar {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
		text-align: center;
		font-size: 11.5px;
		color: #6b7280;
	}

	.risk-seg {
		border-top: 4px solid #e5e7eb;
		padding-top: 5px;
	}

	.risk-seg.active {
		border-top-color: #10b981;
		color: #065f46;
		font-weight: 600;
	}

	.adm-tags-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.adm-plus-btn {
		background: transparent;
		border: 0;
		font-size: 18px;
		color: #6b7280;
		cursor: pointer;
	}

	.adm-tags-list {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.adm-tag-chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		background: #f3f4f6;
		color: #374151;
		font-size: 11.5px;
		padding: 3px 8px;
		border-radius: 6px;
	}

	.adm-tag-chip button {
		background: transparent;
		border: 0;
		cursor: pointer;
		color: #6b7280;
		font-size: 13px;
		padding: 0;
	}

	.adm-tag-form {
		display: flex;
		gap: 6px;
		margin-top: 8px;
	}

	.adm-tag-form input {
		flex: 1;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		padding: 4px 8px;
		font-size: 12px;
	}

	.adm-tag-form button {
		background: #18181b;
		color: #fff;
		border: 0;
		border-radius: 6px;
		padding: 4px 10px;
		font-size: 12px;
		cursor: pointer;
	}

	.adm-comment-form input {
		width: 100%;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 8px 10px;
		font-size: 12.5px;
		margin-bottom: 12px;
		outline: 0;
	}

	.adm-comment-form input:focus {
		border-color: #9ca3af;
	}

	.adm-timeline-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.adm-timeline-list li {
		display: grid;
		grid-template-columns: 10px 1fr auto;
		gap: 8px;
		align-items: start;
		font-size: 12px;
		color: #4b5563;
		line-height: 1.4;
	}

	.adm-tl-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #9ca3af;
		margin-top: 4px;
	}

	.adm-tl-time {
		color: #9ca3af;
		font-size: 11px;
		white-space: nowrap;
	}

	/* Multi-Agent Project Managers & Account Follow-up Views */
	.adm-pm-composer-card {
		margin-bottom: 16px;
	}

	.adm-pm-composer {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.adm-pm-composer select,
	.adm-pm-composer input {
		height: 36px;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		padding: 0 11px;
		font-family: var(--font-body);
		font-size: 13px;
		color: #111827;
		background: #ffffff;
		outline: 0;
	}

	.adm-pm-composer input {
		flex: 1;
		min-width: 220px;
	}

	.adm-pm-composer select:focus,
	.adm-pm-composer input:focus {
		border-color: #8b5cf6;
	}

	.adm-pm-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px;
	}

	@media (max-width: 980px) {
		.adm-pm-grid {
			grid-template-columns: 1fr;
		}
	}

	.adm-pm-card {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.adm-pm-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 10px;
	}

	.adm-pm-title-wrap {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.adm-pm-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.adm-pm-role {
		font-size: 12px;
		color: #6b7280;
		margin-top: 2px;
	}

	.adm-pm-ops {
		font-size: 13px;
		color: #374151;
		margin: 0;
		line-height: 1.45;
	}

	.adm-pm-team {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.adm-notes-feed {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.adm-note-row {
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		padding: 12px 14px;
		background: #fafafa;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.adm-note-top {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.adm-note-time {
		margin-left: auto;
		font-size: 11.5px;
		color: #6b7280;
	}

	.adm-note-body {
		font-size: 13.5px;
		font-weight: 500;
		color: #111827;
	}

	.adm-note-report {
		font-size: 12.5px;
		color: #4b5563;
		line-height: 1.45;
	}

	.adm-note-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
		margin-top: 2px;
	}

	.adm-sched-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		font-size: 12px;
		color: #4b5563;
	}

	/* 5th Pic: Right-side Carbon AI Sidekick Panel */
	.carbon-ai-panel {
		width: 0;
		flex-shrink: 0;
		height: calc(100vh - 20px);
		margin: 10px 0 10px 0;
		background: #ffffff;
		border-radius: 14px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border: 0 solid #e5e7eb;
		opacity: 0;
		pointer-events: none;
		transform: translateX(18px);
		transition:
			width 0.52s cubic-bezier(0.22, 1, 0.36, 1),
			margin 0.52s cubic-bezier(0.22, 1, 0.36, 1),
			opacity 0.44s cubic-bezier(0.22, 1, 0.36, 1),
			transform 0.52s cubic-bezier(0.22, 1, 0.36, 1),
			border-width 0.35s ease;
	}

	.carbon-ai-panel.open {
		width: 332px;
		margin: 10px 10px 10px 0;
		opacity: 1;
		border-width: 1px;
		pointer-events: auto;
		transform: translateX(0);
	}

	.carbon-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 13px 16px;
		border-bottom: 1px solid #f1f5f9;
	}

	.carbon-title-btn {
		background: transparent;
		border: 0;
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 13.5px;
		color: #111827;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 0;
	}

	.carbon-header-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.carbon-header-actions button {
		background: transparent;
		border: 0;
		color: #6b7280;
		font-size: 15px;
		cursor: pointer;
		padding: 2px 5px;
		border-radius: 6px;
	}

	.carbon-header-actions button:hover {
		background: #f3f4f6;
		color: #111827;
	}

	.carbon-body {
		flex: 1;
		overflow-y: auto;
		padding: 14px 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.carbon-body::-webkit-scrollbar {
		display: none;
	}

	.carbon-todo-card {
		border-radius: 14px;
		padding: 10px 10px 10px;
		background: linear-gradient(125deg, #ec4899 0%, #f97316 48%, #a855f7 100%);
		color: #ffffff;
	}

	.carbon-todo-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-family: var(--font-display);
		font-size: 12px;
		font-weight: 600;
		padding: 0 4px 8px;
	}

	.carbon-todo-inner {
		width: 100%;
		text-align: left;
		background: #ffffff;
		border: 0;
		border-radius: 10px;
		padding: 10px 12px;
		cursor: pointer;
		color: #111827;
	}

	.todo-row-main {
		display: flex;
		align-items: center;
		gap: 8px;
		font-family: var(--font-display);
		font-size: 13px;
		font-weight: 600;
	}

	.todo-circle.done {
		color: #10b981;
	}

	.todo-count {
		margin-left: auto;
		font-size: 11.5px;
		color: #6b7280;
	}

	.todo-sub {
		font-size: 12px;
		color: #6b7280;
		margin-top: 4px;
		padding-left: 20px;
	}

	.carbon-thought {
		font-size: 12px;
		color: #6b7280;
	}

	.carbon-messages {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.carbon-msg {
		font-size: 13px;
		line-height: 1.55;
		color: #1f2937;
	}

	.carbon-msg.user {
		align-self: flex-end;
		background: #f3f4f6;
		padding: 8px 12px;
		border-radius: 12px;
		color: #111827;
		font-weight: 500;
	}

	.carbon-quick-chip-row {
		display: flex;
		justify-content: flex-end;
	}

	.carbon-quick-chip {
		background: #f3f4f6;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 7px 13px;
		font-size: 12.5px;
		font-weight: 500;
		color: #111827;
		cursor: pointer;
	}

	.carbon-working {
		font-size: 12px;
		color: #6b7280;
	}

	.carbon-input-bar {
		margin: 10px 14px 14px;
		padding: 8px 12px;
		border: 1px solid #e5e7eb;
		border-radius: 14px;
		display: flex;
		align-items: center;
		gap: 8px;
		background: #ffffff;
	}

	.carbon-mini-orb {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: linear-gradient(135deg, #8b5cf6, #6366f1);
		color: #fff;
		display: grid;
		place-items: center;
		font-size: 12px;
		flex-shrink: 0;
	}

	.carbon-input-bar input {
		flex: 1;
		min-width: 0;
		border: 0;
		outline: 0;
		font-size: 13px;
		color: #111827;
		background: transparent;
	}

	.carbon-bar-btn {
		background: transparent;
		border: 0;
		color: #6b7280;
		cursor: pointer;
		font-size: 14px;
		padding: 2px 4px;
	}

	/* Lusion Zoom-Out & Reverse Page/Card Transition Styles */
	.adm-lusion-veil {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		background: radial-gradient(circle at 50% 50%, rgba(26, 9, 48, 0.88) 0%, rgba(8, 2, 16, 0.96) 78%);
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.46s cubic-bezier(0.22, 1, 0.36, 1);
		will-change: opacity;
		backface-visibility: hidden;
	}

	.adm-lusion-veil.visible {
		opacity: 1;
		pointer-events: auto;
	}

	.adm-veil-logo {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		color: rgba(245, 234, 255, 0.72);
		transform: scale(12.5);
		opacity: 0;
		transition:
			transform 0.48s cubic-bezier(0.16, 1, 0.3, 1),
			opacity 0.44s cubic-bezier(0.16, 1, 0.3, 1);
		will-change: transform, opacity;
	}

	.adm-lusion-veil.visible .adm-veil-logo {
		transform: scale(8.5);
		opacity: 0.68;
	}

	.adm-lusion-veil.leaving {
		transition: opacity 0.22s cubic-bezier(0.22, 1, 0.36, 1);
	}

	.adm-lusion-veil.leaving .adm-veil-logo {
		transition:
			transform 0.24s cubic-bezier(0.22, 1, 0.36, 1),
			opacity 0.22s cubic-bezier(0.22, 1, 0.36, 1);
		transform: scale(8.5);
		opacity: 0.72;
	}

	.adm-veil-svg {
		width: 24px;
		height: 24px;
		stroke: rgba(245, 234, 255, 0.78);
	}

	.adm-veil-label {
		font-family: var(--font-display);
		font-size: 13px;
		font-weight: 500;
		letter-spacing: -0.01em;
		color: rgba(245, 234, 255, 0.78);
		white-space: nowrap;
	}

	.shopify-shell {
		transform-origin: var(--zoom-origin-x, 36px) var(--zoom-origin-y, 218px);
		transition:
			transform 0.24s cubic-bezier(0.22, 1, 0.36, 1),
			opacity 0.22s cubic-bezier(0.22, 1, 0.36, 1);
		animation: admLusionEnter 0.44s cubic-bezier(0.22, 1, 0.36, 1);
		will-change: transform, opacity;
		backface-visibility: hidden;
	}

	.shopify-shell.leaving-admin {
		transform-origin: var(--zoom-origin-x, 36px) var(--zoom-origin-y, 218px);
		transform: scale(0.84);
		opacity: 0;
	}

	@keyframes admLusionEnter {
		from {
			transform: scale(0.92);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	.lusion-back-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 30px;
		padding: 0 14px;
		border-radius: 999px;
		border: 1px solid #d1d5db;
		background: #111827;
		color: #ffffff;
		font-family: var(--font-display);
		font-size: 11.5px;
		font-weight: 600;
		letter-spacing: 0.04em;
		cursor: pointer;
		transition: transform 0.2s ease, background 0.2s ease;
	}

	.lusion-back-pill:hover {
		transform: translateX(-2px) scale(1.03);
		background: #1f2937;
	}

	.lusion-clickable-card {
		cursor: pointer;
		transition:
			transform 0.48s cubic-bezier(0.22, 1, 0.36, 1),
			opacity 0.38s cubic-bezier(0.22, 1, 0.36, 1),
			box-shadow 0.32s ease,
			border-color 0.28s ease;
		will-change: transform, opacity;
	}

	.lusion-clickable-card:hover {
		transform: translateY(-4px) scale(1.015);
		border-color: #a855f7;
		box-shadow: 0 14px 32px rgba(15, 23, 42, 0.1);
	}

	.lusion-clickable-card.zooming-card {
		position: relative;
		z-index: 80;
		transform: scale(2.15);
		opacity: 0;
		box-shadow: 0 32px 80px rgba(0, 0, 0, 0.45);
	}

	.lusion-clickable-card.sibling-fade,
	.fading-out {
		opacity: 0;
		transform: scale(0.94);
		transition:
			opacity 0.3s ease,
			transform 0.35s ease;
	}

	.lusion-card-cta {
		margin-top: 12px;
		padding-top: 10px;
		border-top: 1px solid #f1f5f9;
		font-family: var(--font-display);
		font-size: 12.5px;
		font-weight: 600;
		color: #111827;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	/* Dark Lusion Case-Study Detail View */
	.lusion-project-detail {
		background: #141110;
		color: #f5efe8;
		border-radius: 22px;
		padding: 32px 36px 40px;
		min-height: 540px;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
		animation: lusionDetailIn 0.56s cubic-bezier(0.22, 1, 0.36, 1);
		transition:
			transform 0.42s cubic-bezier(0.22, 1, 0.36, 1),
			opacity 0.36s ease;
	}

	.lusion-project-detail.closing {
		opacity: 0;
		transform: scale(0.94);
	}

	@keyframes lusionDetailIn {
		from {
			opacity: 0;
			transform: scale(1.08);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.lusion-detail-topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 28px;
	}

	.lusion-detail-brand {
		font-family: var(--font-display);
		font-size: 18px;
		font-weight: 700;
		letter-spacing: 0.06em;
	}

	.lusion-detail-back {
		height: 38px;
		padding: 0 20px;
		border-radius: 999px;
		border: 0;
		background: #f5efe8;
		color: #141110;
		font-family: var(--font-display);
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.05em;
		cursor: pointer;
		transition: transform 0.2s ease, background 0.2s ease;
	}

	.lusion-detail-back:hover {
		transform: scale(1.05);
		background: #ffffff;
	}

	.lusion-detail-body {
		display: grid;
		grid-template-columns: 1.25fr 0.75fr 1.35fr;
		gap: 32px;
		align-items: start;
	}

	.lusion-detail-title {
		font-family: var(--font-display);
		font-size: 46px;
		font-weight: 600;
		letter-spacing: -0.03em;
		line-height: 1.05;
		margin: 0 0 24px;
		color: #fff6ec;
	}

	.lusion-detail-desc {
		font-family: var(--font-body);
		font-size: 13.5px;
		line-height: 1.65;
		color: #d6cec4;
		margin: 0 0 32px;
	}

	.lusion-launch-btn {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		height: 44px;
		padding: 0 24px;
		border-radius: 999px;
		border: 0;
		background: #f5efe8;
		color: #141110;
		font-family: var(--font-display);
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.05em;
		cursor: pointer;
		transition: transform 0.2s ease;
	}

	.lusion-launch-btn:hover {
		transform: translateY(-2px) scale(1.03);
	}

	.lusion-launch-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #141110;
	}

	.lusion-detail-heading {
		font-family: var(--font-display);
		font-size: 11.5px;
		font-weight: 700;
		letter-spacing: 0.08em;
		margin-bottom: 10px;
	}

	.lusion-detail-item {
		font-size: 13px;
		color: #e7dfd6;
		line-height: 1.75;
	}

	.lusion-detail-link {
		display: block;
		background: transparent;
		border: 0;
		padding: 0;
		font-family: var(--font-body);
		font-size: 13px;
		color: #e7dfd6;
		line-height: 1.85;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.lusion-detail-stage {
		position: relative;
		height: 360px;
		border-radius: 20px;
		background: radial-gradient(circle at 50% 45%, rgba(168, 85, 247, 0.28), #0b0713 72%);
		border: 1px solid rgba(255, 255, 255, 0.12);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.lusion-stage-orb {
		width: 148px;
		height: 148px;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #f3e8ff, var(--proj-accent, #a855f7) 60%, #1e1b4b);
		box-shadow: 0 0 60px var(--proj-accent, #a855f7);
		animation: stagePulse 3.4s ease-in-out infinite;
	}

	@keyframes stagePulse {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.07); }
	}

	.lusion-stage-caption {
		margin-top: 24px;
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.lusion-stage-caption strong {
		font-family: var(--font-display);
		font-size: 15px;
		color: #ffffff;
	}

	.lusion-stage-caption span {
		font-size: 12px;
		color: #cbd5e1;
	}

	@media (max-width: 960px) {
		.adm-sidebar {
			display: none;
		}
		.adm-grid {
			grid-template-columns: 1fr;
		}
		.carbon-ai-panel {
			position: fixed;
			right: 10px;
			top: 10px;
			z-index: 60;
			width: calc(100vw - 20px);
			max-width: 360px;
		}
	}
</style>
