export type ScheduleCadence = 'Daily' | 'Weekly' | 'Monthly';

export interface ProjectAgent {
	id: string;
	name: string;
	pmName: string;
	pmRole: string;
	domain: string;
	accent: string;
	status: 'Active' | 'Busy';
	teamMembers: string[];
	operationsSummary: string;
}

export interface ProjectTaskNote {
	id: string;
	projectId: string;
	projectName: string;
	pmName: string;
	source: 'voice' | 'text';
	note: string;
	delegatedTo: string[];
	pmReport: string;
	status: 'Delegated' | 'In Progress' | 'Completed';
	createdAt: string;
}

export interface AccountFollowupSchedule {
	id: string;
	title: string;
	cadence: ScheduleCadence;
	recipient: string;
	nextRun: string;
	lastSent: string;
	active: boolean;
	summaryTemplate: string;
}

export interface ClientMeetingNote {
	id: string;
	projectId: string;
	projectName: string;
	teamMember: string;
	department: 'Sales' | 'Marketing' | 'Core Team' | 'Account';
	isCoreMember: boolean;
	clientName: string;
	meetingTitle: string;
	sourceTool: 'Read.ai' | 'Fireflies.ai' | 'Otter.ai' | 'Google Meet AI';
	duration: string;
	summary: string;
	actionItems: string[];
	readStatus: 'Unread' | 'Read';
	occurredAt: string;
}

export interface LeadPipelineItem {
	id: string;
	name: string;
	company: string;
	projectId: string;
	projectName: string;
	owner: string;
	stage: 'New Inquiry' | 'Qualified' | 'Proposal Sent' | 'Won';
	value: string;
	nextAction: string;
}

export interface WhatsAppThread {
	id: string;
	contact: string;
	phone: string;
	projectName: string;
	lastMessage: string;
	agentReply: string;
	time: string;
	status: 'Active' | 'Needs Review';
}

const STORAGE_KEY = 'ismail_ai_multi_agent_v1';

const INITIAL_PROJECTS: ProjectAgent[] = [
	{
		id: 'portfolio-social',
		name: 'Digital Portfolio & Social Media',
		pmName: 'Aria',
		pmRole: 'Portfolio & Social PM Agent',
		domain: 'Brand, LinkedIn, IG & Reels',
		accent: '#a855f7',
		status: 'Active',
		teamMembers: ['Content Strategist AI', 'Reels & Motion Editor AI', 'Social Publisher Bot'],
		operationsSummary: 'Manages daily social posts, portfolio case studies & audience engagement.'
	},
	{
		id: 'applyglobal-ops',
		name: 'ApplyGlobal Operations',
		pmName: 'Zayd',
		pmRole: 'Admissions & Partner PM Agent',
		domain: 'Leads, Nigeria Partners & CRM',
		accent: '#3b82f6',
		status: 'Active',
		teamMembers: ['Nigeria Partner Recruiter AI', 'Student Admissions Lead', 'WhatsApp Follow-up Bot'],
		operationsSummary: 'Handles international student inquiries, partner onboarding & CRM follow-ups.'
	},
	{
		id: 'researchgoal-lab',
		name: 'ResearchGoal Virtual Lab',
		pmName: 'Nova',
		pmRole: 'R&D & UX Prototype PM Agent',
		domain: 'AI Research, UI/UX & MVP',
		accent: '#10b981',
		status: 'Active',
		teamMembers: ['AI Research Analyst', 'UX Prototype Agent', 'QA & Docs Agent'],
		operationsSummary: 'Drives continuous feature R&D, UX wireframes & virtual lab sprint reports.'
	},
	{
		id: 'account-finance',
		name: 'Account & Finance Reporting',
		pmName: 'Kairo',
		pmRole: 'Account & Finance PM Agent',
		domain: 'Daily / Weekly / Monthly Follow-ups',
		accent: '#f59e0b',
		status: 'Active',
		teamMembers: ['Bookkeeping Agent', 'Commission Tracker AI', 'Executive Mail Dispatcher'],
		operationsSummary: 'Automates timely daily, weekly & monthly follow-up emails to the Account Team.'
	}
];

const INITIAL_NOTES: ProjectTaskNote[] = [
	{
		id: 'note-101',
		projectId: 'portfolio-social',
		projectName: 'Digital Portfolio & Social Media',
		pmName: 'Aria',
		source: 'voice',
		note: 'Update digital portfolio hero with the new 3D AI case study and schedule 3 LinkedIn reels.',
		delegatedTo: ['Content Strategist AI', 'Reels & Motion Editor AI', 'Social Publisher Bot'],
		pmReport: 'Aria briefed all 3 team agents: hero mockups queued and 3 reels scheduled for 6:00 PM BST.',
		status: 'In Progress',
		createdAt: '10 mins ago'
	},
	{
		id: 'note-102',
		projectId: 'applyglobal-ops',
		projectName: 'ApplyGlobal Operations',
		pmName: 'Zayd',
		source: 'voice',
		note: 'Follow up with 14 pending student leads from Facebook & Nigeria partner pipeline.',
		delegatedTo: ['Nigeria Partner Recruiter AI', 'WhatsApp Follow-up Bot'],
		pmReport: 'Zayd assigned 14 leads to WhatsApp Follow-up Bot; 9 replies received and 3 calls booked.',
		status: 'Completed',
		createdAt: '1 hour ago'
	},
	{
		id: 'note-103',
		projectId: 'account-finance',
		projectName: 'Account & Finance Reporting',
		pmName: 'Kairo',
		source: 'text',
		note: 'Prepare weekly commission & Order #1078 reconciliation summary for Account Team.',
		delegatedTo: ['Bookkeeping Agent', 'Commission Tracker AI', 'Executive Mail Dispatcher'],
		pmReport: 'Kairo compiled $339.99 Order #1078 + partner payouts; ready for weekly follow-up dispatch.',
		status: 'Delegated',
		createdAt: '2 hours ago'
	}
];

const INITIAL_SCHEDULES: AccountFollowupSchedule[] = [
	{
		id: 'sched-daily',
		title: 'Daily Cashflow & Operations Digest',
		cadence: 'Daily',
		recipient: 'accounts@ismail-ai.com',
		nextRun: 'Today · 09:00 PM BST',
		lastSent: 'Yesterday · 09:00 PM',
		active: true,
		summaryTemplate: 'Daily revenue, pending invoices, Order #1078 status & PM task completions.'
	},
	{
		id: 'sched-weekly',
		title: 'Weekly Multi-Project KPI & Commission Report',
		cadence: 'Weekly',
		recipient: 'finance-team@ismail-ai.com',
		nextRun: 'Sunday · 10:00 AM BST',
		lastSent: 'Last Sunday · 10:00 AM',
		active: true,
		summaryTemplate: 'Project-wise PM performance, partner commissions & weekly expense breakdown.'
	},
	{
		id: 'sched-monthly',
		title: 'Monthly Executive P&L & Partner Settlement',
		cadence: 'Monthly',
		recipient: 'accounts-lead@ismail-ai.com',
		nextRun: '1st of Next Month · 09:00 AM',
		lastSent: '1st of This Month',
		active: true,
		summaryTemplate: 'Full monthly profit & loss statement, tax reserve & multi-project ROI summary.'
	}
];

const INITIAL_MEETING_NOTES: ClientMeetingNote[] = [
	{
		id: 'mtg-201',
		projectId: 'applyglobal-ops',
		projectName: 'ApplyGlobal Operations',
		teamMember: 'Rahim · Sales Lead',
		department: 'Sales',
		isCoreMember: true,
		clientName: 'Lagos Global Edu Partners',
		meetingTitle: 'Q4 Student Intake & Partner Commission Tier',
		sourceTool: 'Read.ai',
		duration: '28 mins',
		summary:
			'Client agreed to send 45+ qualified Fall intake applications if commission payout is settled bi-weekly. Requested branded landing page & WhatsApp onboarding kit.',
		actionItems: [
			'Send updated partner MOU by tomorrow 3 PM',
			'Zayd PM Agent to activate WhatsApp Follow-up Bot for Lagos cohort'
		],
		readStatus: 'Unread',
		occurredAt: 'Today · 4:15 PM'
	},
	{
		id: 'mtg-202',
		projectId: 'portfolio-social',
		projectName: 'Digital Portfolio & Social Media',
		teamMember: 'Tania · Marketing Lead',
		department: 'Marketing',
		isCoreMember: true,
		clientName: 'Apex Studio Dubai',
		meetingTitle: '3D Brand Reels & Paid Campaign Retainer',
		sourceTool: 'Read.ai',
		duration: '34 mins',
		summary:
			'Client loved the dark-purple 3D AI Command Center aesthetic and wants 8 short-form reels + LinkedIn campaign management starting next week ($3,200/mo retainer).',
		actionItems: [
			'Aria PM Agent to queue 2 sample reel storyboards',
			'Send retainer proposal & timeline by Thursday'
		],
		readStatus: 'Unread',
		occurredAt: 'Today · 2:40 PM'
	},
	{
		id: 'mtg-203',
		projectId: 'researchgoal-lab',
		projectName: 'ResearchGoal Virtual Lab',
		teamMember: 'Sadia · Core Product Lead',
		department: 'Core Team',
		isCoreMember: true,
		clientName: 'Dr. Mahmud (NIW Research Group)',
		meetingTitle: 'Virtual Lab MVP Scope & UX Walkthrough',
		sourceTool: 'Fireflies.ai',
		duration: '41 mins',
		summary:
			'Reviewed interactive prototype and citation pipeline. Client requested automated weekly progress digests and one-click PDF export for grant reviewers.',
		actionItems: [
			'Nova PM Agent to add PDF export ticket to Sprint 4',
			'Share updated Figma/live preview link'
		],
		readStatus: 'Unread',
		occurredAt: 'Today · 11:20 AM'
	},
	{
		id: 'mtg-204',
		projectId: 'account-finance',
		projectName: 'Account & Finance Reporting',
		teamMember: 'Nabil · Sales & Account Exec',
		department: 'Sales',
		isCoreMember: false,
		clientName: 'MVSE Wholesale Buyer',
		meetingTitle: 'Q1 Restock & Monthly Settlement Alignment',
		sourceTool: 'Otter.ai',
		duration: '16 mins',
		summary:
			'Confirmed recurring Q1 restock schedule and aligned monthly invoice settlement dates with Kairo Account PM.',
		actionItems: ['Kairo to include Q1 restock forecast in Weekly KPI email'],
		readStatus: 'Read',
		occurredAt: 'Yesterday · 5:05 PM'
	}
];

const INITIAL_LEADS: LeadPipelineItem[] = [
	{
		id: 'lead-1',
		name: 'Lagos Global Edu Partners',
		company: 'Nigeria Partner Network',
		projectId: 'applyglobal-ops',
		projectName: 'ApplyGlobal Operations',
		owner: 'Rahim · Sales Lead',
		stage: 'Proposal Sent',
		value: '$12,500',
		nextAction: 'Send MOU & commission tier sheet'
	},
	{
		id: 'lead-2',
		name: 'Apex Studio Dubai',
		company: 'Apex Creative LLC',
		projectId: 'portfolio-social',
		projectName: 'Digital Portfolio & Social Media',
		owner: 'Tania · Marketing Lead',
		stage: 'Qualified',
		value: '$3,200/mo',
		nextAction: 'Deliver 2 sample 3D reel storyboards'
	},
	{
		id: 'lead-3',
		name: 'Dr. Mahmud NIW Group',
		company: 'ResearchGoal Partner',
		projectId: 'researchgoal-lab',
		projectName: 'ResearchGoal Virtual Lab',
		owner: 'Sadia · Core Product Lead',
		stage: 'New Inquiry',
		value: '$6,800',
		nextAction: 'Share Virtual Lab prototype link'
	},
	{
		id: 'lead-4',
		name: 'Dhaka EdTech Cohort',
		company: 'StudyAbroad BD',
		projectId: 'applyglobal-ops',
		projectName: 'ApplyGlobal Operations',
		owner: 'Zayd · PM Agent',
		stage: 'Won',
		value: '$8,400',
		nextAction: 'Onboarding completed via WhatsApp Bot'
	}
];

const INITIAL_WHATSAPP: WhatsAppThread[] = [
	{
		id: 'wa-1',
		contact: 'Chinedu Okafor (Nigeria Agent)',
		phone: '+234 803 441 9920',
		projectName: 'ApplyGlobal Operations',
		lastMessage: 'We have 18 new Fall student files ready for review today.',
		agentReply: 'Zayd PM Bot: Received! Admissions Lead is verifying all 18 files now.',
		time: '12 mins ago',
		status: 'Active'
	},
	{
		id: 'wa-2',
		contact: 'Apex Studio Dubai',
		phone: '+971 50 812 3304',
		projectName: 'Digital Portfolio & Social Media',
		lastMessage: 'Can we preview the 3D purple reel hook before Friday?',
		agentReply: 'Aria PM Bot: Yes, storyboard + preview will be sent tomorrow by 4 PM.',
		time: '38 mins ago',
		status: 'Needs Review'
	}
];

function loadInitialState() {
	if (typeof window === 'undefined') {
		return {
			projects: INITIAL_PROJECTS,
			taskNotes: INITIAL_NOTES,
			accountSchedules: INITIAL_SCHEDULES,
			meetingNotes: INITIAL_MEETING_NOTES,
			leads: INITIAL_LEADS,
			whatsappThreads: INITIAL_WHATSAPP,
			activeProjectId: 'all'
		};
	}
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			return {
				projects: Array.isArray(parsed.projects) && parsed.projects.length ? parsed.projects : INITIAL_PROJECTS,
				taskNotes: Array.isArray(parsed.taskNotes) ? parsed.taskNotes : INITIAL_NOTES,
				accountSchedules:
					Array.isArray(parsed.accountSchedules) && parsed.accountSchedules.length
						? parsed.accountSchedules
						: INITIAL_SCHEDULES,
				meetingNotes:
					Array.isArray(parsed.meetingNotes) && parsed.meetingNotes.length
						? parsed.meetingNotes
						: INITIAL_MEETING_NOTES,
				leads: Array.isArray(parsed.leads) && parsed.leads.length ? parsed.leads : INITIAL_LEADS,
				whatsappThreads:
					Array.isArray(parsed.whatsappThreads) && parsed.whatsappThreads.length
						? parsed.whatsappThreads
						: INITIAL_WHATSAPP,
				activeProjectId: typeof parsed.activeProjectId === 'string' ? parsed.activeProjectId : 'all'
			};
		}
	} catch {
		// Fallback to seed data
	}
	return {
		projects: INITIAL_PROJECTS,
		taskNotes: INITIAL_NOTES,
		accountSchedules: INITIAL_SCHEDULES,
		meetingNotes: INITIAL_MEETING_NOTES,
		leads: INITIAL_LEADS,
		whatsappThreads: INITIAL_WHATSAPP,
		activeProjectId: 'all'
	};
}

const seed = loadInitialState();

class MultiAgentStore {
	projects = $state<ProjectAgent[]>(seed.projects);
	taskNotes = $state<ProjectTaskNote[]>(seed.taskNotes);
	accountSchedules = $state<AccountFollowupSchedule[]>(seed.accountSchedules);
	meetingNotes = $state<ClientMeetingNote[]>(seed.meetingNotes);
	leads = $state<LeadPipelineItem[]>(seed.leads);
	whatsappThreads = $state<WhatsAppThread[]>(seed.whatsappThreads);
	activeProjectId = $state<string>(seed.activeProjectId);

	private persist() {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					projects: this.projects,
					taskNotes: this.taskNotes,
					accountSchedules: this.accountSchedules,
					meetingNotes: this.meetingNotes,
					leads: this.leads,
					whatsappThreads: this.whatsappThreads,
					activeProjectId: this.activeProjectId
				})
			);
		} catch {
			// Ignore quota errors
		}
	}

	setActiveProject(projectId: string) {
		this.activeProjectId = projectId;
		this.persist();
	}

	inferProjectForText(text: string, preferredProjectId?: string): ProjectAgent {
		const lower = text.toLowerCase();
		if (/portfolio|social|পোর্টফোলিও|সোশ্যাল|instagram|linkedin|facebook|reel|রিল|পোস্ট/i.test(lower)) {
			return this.projects[0];
		}
		if (/applyglobal|nigeria|নাইজেরিয়া|নাইজেরিয়া|student|স্টুডেন্ট|lead|লিড|admission|partner/i.test(lower)) {
			return this.projects[1];
		}
		if (/research|virtual lab|রিসার্চ|ux|ui|prototype|প্রোটোটাইপ|mvp|ফিচার/i.test(lower)) {
			return this.projects[2];
		}
		if (/account|অ্যাকাউন্ট|finance|ফাইন্যান্স|follow[- ]?up|ফলোআপ|mail|মেইল|daily|weekly|monthly|ডেইলি|উইকলি|মান্থলি|invoice|হিসাব/i.test(lower)) {
			return this.projects[3];
		}
		if (preferredProjectId && preferredProjectId !== 'all') {
			const match = this.projects.find((p) => p.id === preferredProjectId);
			if (match) return match;
		}
		return this.projects[0];
	}

	routeVoiceNoteToPM(noteText: string, source: 'voice' | 'text', preferredProjectId?: string): ProjectTaskNote {
		const project = this.inferProjectForText(noteText, preferredProjectId ?? this.activeProjectId);
		const delegatedTo = project.teamMembers.slice(0, 2);
		const newNote: ProjectTaskNote = {
			id: `note-${Date.now()}`,
			projectId: project.id,
			projectName: project.name,
			pmName: project.pmName,
			source,
			note: noteText,
			delegatedTo,
			pmReport: `${project.pmName} (${project.pmRole}) received your ${source} note, delegated execution to ${delegatedTo.join(' & ')}, and is preparing the team status report.`,
			status: 'Delegated',
			createdAt: 'Just now'
		};
		this.taskNotes = [newNote, ...this.taskNotes];
		this.persist();
		return newNote;
	}

	updateNoteStatus(noteId: string, status: ProjectTaskNote['status']) {
		this.taskNotes = this.taskNotes.map((n) =>
			n.id === noteId
				? {
						...n,
						status,
						pmReport:
							status === 'Completed'
								? `${n.pmName} verified all deliverables from ${n.delegatedTo.join(', ')} and marked this task Completed.`
								: n.pmReport
					}
				: n
		);
		this.persist();
	}

	triggerAccountFollowup(cadenceOrId?: ScheduleCadence | string): AccountFollowupSchedule {
		const target =
			this.accountSchedules.find(
				(s) => s.id === cadenceOrId || s.cadence.toLowerCase() === String(cadenceOrId).toLowerCase()
			) ?? this.accountSchedules[0];

		const nowLabel = 'Just now (Dispatched on time)';
		this.accountSchedules = this.accountSchedules.map((s) =>
			s.id === target.id ? { ...s, lastSent: nowLabel, active: true } : s
		);

		const accountPM = this.projects.find((p) => p.id === 'account-finance') ?? this.projects[3];
		const logNote: ProjectTaskNote = {
			id: `note-${Date.now()}`,
			projectId: accountPM.id,
			projectName: accountPM.name,
			pmName: accountPM.pmName,
			source: 'voice',
			note: `Dispatched ${target.cadence} follow-up report (${target.title}) to ${target.recipient}`,
			delegatedTo: ['Executive Mail Dispatcher', 'Bookkeeping Agent'],
			pmReport: `${accountPM.pmName} sent the ${target.cadence} Account Team follow-up email on time to ${target.recipient}.`,
			status: 'Completed',
			createdAt: 'Just now'
		};
		this.taskNotes = [logNote, ...this.taskNotes];
		this.persist();
		return { ...target, lastSent: nowLabel };
	}

	toggleSchedule(scheduleId: string) {
		this.accountSchedules = this.accountSchedules.map((s) =>
			s.id === scheduleId ? { ...s, active: !s.active } : s
		);
		this.persist();
	}

	addAccountSchedule(title: string, cadence: ScheduleCadence, recipient: string) {
		const newSched: AccountFollowupSchedule = {
			id: `sched-${Date.now()}`,
			title: title.trim() || `${cadence} Account Follow-up`,
			cadence,
			recipient: recipient.trim() || 'accounts@ismail-ai.com',
			nextRun: cadence === 'Daily' ? 'Tomorrow · 09:00 AM' : cadence === 'Weekly' ? 'Next Sunday · 10:00 AM' : '1st of Next Month',
			lastSent: 'Scheduled (Pending first run)',
			active: true,
			summaryTemplate: 'Automated PM & financial follow-up report.'
		};
		this.accountSchedules = [newSched, ...this.accountSchedules];
		this.persist();
		return newSched;
	}

	markMeetingRead(id: string) {
		this.meetingNotes = this.meetingNotes.map((m) =>
			m.id === id ? { ...m, readStatus: m.readStatus === 'Unread' ? 'Read' : 'Unread' } : m
		);
		this.persist();
	}

	markAllMeetingsRead() {
		this.meetingNotes = this.meetingNotes.map((m) => ({ ...m, readStatus: 'Read' }));
		this.persist();
	}

	addMeetingSummary(input: {
		projectId: string;
		teamMember: string;
		department: ClientMeetingNote['department'];
		clientName: string;
		meetingTitle: string;
		sourceTool: ClientMeetingNote['sourceTool'];
		summary: string;
	}) {
		const proj = this.projects.find((p) => p.id === input.projectId) ?? this.projects[0];
		const created: ClientMeetingNote = {
			id: `mtg-${Date.now()}`,
			projectId: proj.id,
			projectName: proj.name,
			teamMember: input.teamMember.trim() || 'Team Member',
			department: input.department,
			isCoreMember: true,
			clientName: input.clientName.trim() || 'Client',
			meetingTitle: input.meetingTitle.trim() || 'Client Sync',
			sourceTool: input.sourceTool,
			duration: '25 mins',
			summary: input.summary.trim(),
			actionItems: [`${proj.pmName} PM Agent notified for follow-up`],
			readStatus: 'Unread',
			occurredAt: 'Just now'
		};
		this.meetingNotes = [created, ...this.meetingNotes];
		this.persist();
		return created;
	}

	advanceLeadStage(id: string) {
		const order: LeadPipelineItem['stage'][] = ['New Inquiry', 'Qualified', 'Proposal Sent', 'Won'];
		this.leads = this.leads.map((l) => {
			if (l.id !== id) return l;
			const nextIdx = (order.indexOf(l.stage) + 1) % order.length;
			return { ...l, stage: order[nextIdx] };
		});
		this.persist();
	}

	sendWhatsAppReply(threadId: string, replyText: string) {
		const txt = replyText.trim();
		if (!txt) return;
		this.whatsappThreads = this.whatsappThreads.map((w) =>
			w.id === threadId ? { ...w, agentReply: `You: ${txt}`, time: 'Just now', status: 'Active' } : w
		);
		this.persist();
	}
}

export const multiAgentStore = new MultiAgentStore();
