import commandDataset from './data/commandExamples.json';
import { multiAgentStore, type ScheduleCadence } from './multiAgentStore.svelte';

export type DetectedLanguage = 'bn' | 'banglish' | 'en';

export type PipelineStage =
	| 'idle'
	| 'listening'
	| 'transcribing'
	| 'interpreting'
	| 'retrieving'
	| 'drafting'
	| 'awaiting_approval'
	| 'completed';

export interface OrchestratorResponse {
	request_id: string;
	input: { modality: 'voice' | 'text'; transcript: string };
	language: DetectedLanguage;
	intent: string;
	module: string;
	categoryCls: string | null;
	route: string;
	status: 'ready' | 'missing_integration' | 'awaiting_approval' | 'authorization_gate' | 'completed';
	status_detail: string;
	spoken_reply: string;
	display_reply: string;
	card_type: string;
	suggested_followups: string[];
	sources: string[];
	requires_approval: boolean;
	pending_action: string | null;
	projectName?: string;
	pmAgent?: string;
	delegatedTeam?: string[];
	taskNoteId?: string;
}

interface DatasetCommand {
	id: string;
	category: string;
	example_command: string;
	natural_variants: string[];
	intent: string;
	sample_ai_response: string;
	recommended_ui: string;
	required_capability: string;
	minimum_access: string;
	operation: string;
	implementation_note: string;
}

const commands = commandDataset.commands as DatasetCommand[];

const CATEGORY_TO_CARD_CLS: Record<string, string> = {
	Research: 'research',
	Team: 'team',
	Sales: 'sales',
	Marketing: 'marketing', // Web Chat card
	Finance: 'finance', // Phones card
	Content: 'content', // Text card
	Design: 'design', // Sales (UI/Brand) card
	Development: 'development', // Email card
	'Cross-module': 'research',
	General: 'research'
};

const CATEGORY_TO_ROUTE: Record<string, string> = {
	Research: 'research_agent',
	Team: 'kpi_team_agent',
	Sales: 'crm_sales_agent',
	Marketing: 'marketing_agent',
	Finance: 'finance_agent',
	Content: 'content_agent',
	Design: 'design_agent',
	Development: 'development_agent',
	'Cross-module': 'orchestrator',
	General: 'orchestrator'
};

// Bilingual keyword expansion (Bangla Unicode & Banglish -> English intent concepts)
const BILINGUAL_SYNONYMS: Array<[RegExp, string[]]> = [
	[/নাইজেরিয়া|nigeria/i, ['nigeria', 'agent', 'recruit', 'applyglobal']],
	[/এপ্লাইগ্লোবাল|applyglobal/i, ['applyglobal', 'agent', 'recruit', 'student']],
	[/রিসার্চগোল|researchgoal|ভার্চুয়াল ল্যাব|virtual lab/i, ['researchgoal', 'virtual', 'lab', 'mvp', 'research']],
	[/ফাইন্যান্স|finance|হিসাব|টাকা|বাজেট|খরচ|আয়|কমিশন|revenue|budget|commission/i, ['finance', 'financial', 'budget', 'revenue', 'commission', 'report']],
	[/লিড|lead|স্টুডেন্ট|student|ইনকোয়ারি|inquiry|ভর্তি|admission/i, ['lead', 'student', 'inquiries', 'facebook', 'followup', 'follow-ups']],
	[/এজেন্ট|agent|পার্টনার|partner/i, ['agent', 'agents', 'recruitment', 'recruiting', 'partner']],
	[/ক্যাম্পেইন|campaign|মার্কেটিং|marketing|পোস্ট|post|লিঙ্কডইন|linkedin|ঈদ|eid|দিওয়ালি|diwali/i, ['campaign', 'marketing', 'calendar', 'linkedin', 'eid', 'diwali', 'post']],
	[/হোয়াটসঅ্যাপ|whatsapp|ওয়েব চ্যাট|web chat|চ্যাট|chat/i, ['whatsapp', 'messaging', 'leads', 'responses']],
	[/টিম|team|টাস্ক|task|মিটিং|meeting|কেপিআই|kpi|ট্রেনিং|training/i, ['team', 'tasks', 'department', 'meeting', 'kpi', 'training']],
	[/প্রজেক্ট|project|প্রকল্প|বানাও|তৈরি|create/i, ['project', 'create', 'portfolio', 'plan', 'mvp']],
	[/রিপোর্ট|report|বিশ্লেষণ|analysis|এনালিটিক্স|analytics|দেখাও|show/i, ['report', 'analytics', 'analyze', 'summary', 'overview']],
	[/ইমেইল|email|মেইল|মেসেজ|message|পাঠাও|send|লিখো|write|ড্রাফট|draft/i, ['email', 'message', 'send', 'draft', 'write', 'faq']],
	[/ডিজাইন|design|ড্যাশবোর্ড|dashboard|ইউআই|ui|ফ্লো|flow/i, ['design', 'dashboard', 'ux', 'ui', 'flow']],
	[/আইন|legal|niw|লয়ার|lawyer|ভিসা|i-20/i, ['niw', 'lawyer', 'legal', 'i-20']],
	[/ফোন|phone|কল|call|ভয়েস|voice|রিটেল|retell/i, ['voice', 'retell', 'phone', 'call', 'pipeline']],
	[/ওনার|owner|গোপন|confidential/i, ['owner', 'confidential', 'financials']]
];

// Retell AI Voice Agent Document Knowledge Base (from the 10 uploaded slides)
interface VoiceDocTopic {
	id: string;
	keywords: RegExp;
	intent: string;
	module: string;
	categoryCls: string;
	route: string;
	en: { spoken: string; display: string; followups: string[] };
	bn: { spoken: string; display: string; followups: string[] };
}

const RETELL_VOICE_DOCS: VoiceDocTopic[] = [
	{
		id: 'RETELL-PIPELINE',
		keywords: /pipeline|পাইপলাইন|stt|tts|transcriber|speech[- ]to[- ]text|text[- ]to[- ]speech|elevenlabs|whisper|deepgram|কিভাবে কাজ|how.*voice.*work/i,
		intent: 'VOICE_AI_PIPELINE',
		module: 'Phones',
		categoryCls: 'finance',
		route: 'development_agent',
		en: {
			spoken:
				'The Voice AI pipeline runs three core modules in real time: Speech-to-Text transcriber like Whisper or Deepgram, an LLM intelligence layer for reasoning, and Text-to-Speech like ElevenLabs to speak naturally.',
			display:
				'Voice AI Pipeline (Listen → Think → Speak):\n1. Transcriber (STT): Whisper / Deepgram for real-time multilingual speech-to-text.\n2. Intelligence (LLM): GPT-5 / GPT-4 / Claude 3 with custom prompts & context.\n3. Voice (TTS): ElevenLabs / PlayHT with emotional tones & natural pauses.',
			followups: ['Show the 7 building blocks', 'How do webhooks & Make.com connect?']
		},
		bn: {
			spoken:
				'Voice AI পাইপলাইন তিনটি মূল মডিউলে কাজ করে: Speech-to-Text ট্রান্সক্রাইবার, LLM ইন্টেলিজেন্স, এবং ElevenLabs বা PlayHT-এর মতো Text-to-Speech ভয়েস।',
			display:
				'Voice AI Pipeline (শোনা → চিন্তা → বলা):\n১. Transcriber (STT): Whisper / Deepgram রিয়েল-টাইম বহুভাষিক ট্রান্সক্রিপশন।\n২. Intelligence (LLM): কাস্টম প্রম্পট ও কনটেক্সট হ্যান্ডলিংসহ ডাইনামিক রিজনিং।\n৩. Voice (TTS): ElevenLabs / PlayHT ন্যাচারাল পজ ও ইমোশনাল টোন।',
			followups: ['৭টি বিল্ডিং ব্লক দেখাও', 'Make.com অটোমেশন কীভাবে কাজ করে?']
		}
	},
	{
		id: 'RETELL-BLOCKS',
		keywords: /retell|রিটেল|building block|7 core|বিল্ডিং ব্লক|function calling|warm transfer|conversation flow|voice agent/i,
		intent: 'VOICE_AGENT_ARCHITECTURE',
		module: 'Phones',
		categoryCls: 'finance',
		route: 'development_agent',
		en: {
			spoken:
				'An AI Voice Agent uses 7 core building blocks orchestrated by Retell AI: Speech-to-Text, LLM, Text-to-Speech, Function Calling, Conversation Flow, Warm Transfer, and Analytics & Monitoring.',
			display:
				'7 Building Blocks of AI Voice Agents (Retell AI):\n• Speech-to-Text (Whisper/Deepgram) & Text-to-Speech (ElevenLabs/PlayHT)\n• Intelligence (LLM) & Conversation Flow (guided pathways, intent routing)\n• Function Calling (book appointments, update CRM, end_call)\n• Warm Transfer (transfer_call with briefing notes) & Analytics (sentiment, latency, call history).',
			followups: ['Explain developer & SIP options', 'Connect voice calls to Make.com']
		},
		bn: {
			spoken:
				'একটি AI Voice Agent ৭টি মূল ব্লকে চলে: Speech-to-Text, LLM, Text-to-Speech, Function Calling, Conversation Flow, Warm Transfer এবং Analytics & Monitoring।',
			display:
				'AI Voice Agent-এর ৭টি কোর মডিউল (Retell AI):\n• Speech-to-Text, LLM এবং Text-to-Speech\n• Function Calling (অ্যাপয়েন্টমেন্ট বুক, CRM আপডেট, end_call)\n• Conversation Flow (ইন্টেন্ট রাউটিং ও ফলব্যাক)\n• Warm Transfer (হিউম্যান হ্যান্ডঅফ) ও Call Analytics।',
			followups: ['ডেভেলপার ও SIP অপশন দেখাও', 'Make.com ওয়েবহুক অটোমেশন দেখাও']
		}
	},
	{
		id: 'RETELL-AUTOMATION',
		keywords: /make\.com|webhook|ওয়েবহুক|twilio|vonage|telnyx|sip|byoc|concurrent|অটোমেশন|automation/i,
		intent: 'VOICE_CALL_AUTOMATION',
		module: 'Email',
		categoryCls: 'development',
		route: 'development_agent',
		en: {
			spoken:
				'Retell AI sends call data via webhooks to Make.com to trigger 1,500+ apps automatically, and supports WebSocket streaming, Twilio, Vonage, Telnyx, custom SIP trunking, and 1,000+ concurrent calls.',
			display:
				'Voice Calls + Automations & Developer Options:\n• No-Code: Retell → Webhook → Make.com (update CRM, send emails, create tickets across 1,500+ apps).\n• Developer & BYOC: WebSocket API, REST endpoints, Twilio / Vonage / Telnyx, custom SIP trunking, 1,000+ concurrent calls.',
			followups: ['Show Voice AI pipeline', 'Write a technical plan for WhatsApp-to-CRM']
		},
		bn: {
			spoken:
				'Retell AI ওয়েবহুকের মাধ্যমে Make.com-এ কল ডেটা পাঠিয়ে ১,৫০০+ অ্যাপে অটোমেশন চালায় এবং Twilio, Vonage, Telnyx ও SIP trunking সাপোর্ট করে।',
			display:
				'Voice Calls + Make.com অটোমেশন ও ডেভেলপার অপশন:\n• No-Code: Retell → Webhook → Make.com (অটো CRM আপডেট, ইমেইল, টিকিট)।\n• Developer & BYOC: WebSocket API, REST, Twilio/Vonage/Telnyx, কাস্টম SIP ও ১,০০০+ কনকারেন্ট কল।',
			followups: ['Voice AI পাইপলাইন দেখাও', 'WhatsApp-to-CRM টেকনিক্যাল প্ল্যান বানাও']
		}
	}
];

export function detectLanguage(text: string): DetectedLanguage {
	if (/[\u0980-\u09FF]/.test(text)) return 'bn';
	const banglishPattern =
		/\b(koro|korbo|korte|dekhao|dekho|amar|amader|baniye|banao|dao|pathao|ache|nei|hobe|lagbe|jonno|gula|gulo|tumi|ami|sob|ekhon|ki|keno|kothay|kivabe|parbo|chaile|shuno|bolo|likho|hisab|ta|er)\b/i;
	if (banglishPattern.test(text)) return 'banglish';
	return 'en';
}

function tokenizeExpanded(text: string): string[] {
	const cleaned = text
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s-]/gu, ' ')
		.split(/\s+/)
		.filter((w) => w.length > 1);

	const expanded = new Set<string>(cleaned);
	for (const [pattern, words] of BILINGUAL_SYNONYMS) {
		if (pattern.test(text)) {
			for (const w of words) expanded.add(w);
		}
	}
	return Array.from(expanded);
}

function buildBanglaResponseForDataset(
	cmd: DatasetCommand,
	lang: DetectedLanguage
): { spoken: string; display: string } {
	const isBanglish = lang === 'banglish';

	// Specific Addendum §9 Bangla/Banglish variants
	if (cmd.id === 'SAL-02' || /nigeria/i.test(cmd.example_command)) {
		return {
			spoken: isBanglish
				? 'Nigeria-r agent lead gula filter kore dekhate parbo, kintu ekhon live CRM data connected nei. Chaile filter setup kore dite pari.'
				: 'নাইজেরিয়ার এজেন্ট লিডগুলো ফিল্টার করে দেখাতে পারব, কিন্তু এখন লাইভ CRM ডেটা কানেক্টেড নেই। চাইলে আমি ফিল্টার সেটআপ করে দিতে পারি।',
			display: isBanglish
				? `Module: ${cmd.category} (${cmd.intent})\nStatus: Live CRM connected nei.\nSuggested Filter: country=Nigeria; lead_type=AGENT_PARTNER; status=open.`
				: `মডিউল: ${cmd.category} (${cmd.intent})\nস্ট্যাটাস: লাইভ CRM কানেক্টেড নেই।\nপ্রস্তাবিত ফিল্টার: country=Nigeria; lead_type=AGENT_PARTNER; status=open।`
		};
	}

	if (cmd.id === 'RES-02' || /researchgoal/i.test(cmd.example_command)) {
		return {
			spoken: isBanglish
				? 'ResearchGoal-er virtual lab concept dhore MVP plan banacchi—student onboarding, professor mentorship ar milestone tracking.'
				: 'ResearchGoal-এর ভার্চুয়াল ল্যাব কনসেপ্ট ধরে একটি MVP প্ল্যান তৈরি করছি—স্টুডেন্ট অনবোর্ডিং, প্রফেসর মেন্টরশিপ এবং মাইলস্টোন ট্র্যাকিংসহ।',
			display: isBanglish
				? `Module: Research (${cmd.intent})\nMVP Plan Draft: Student onboarding, professor mentorship, project matching, ar milestone tracking. Kon professor available ar paid RA role ache kina oigula verify korte hobe.`
				: `মডিউল: Research (${cmd.intent})\nMVP প্ল্যান ড্রাফট: স্টুডেন্ট অনবোর্ডিং, প্রফেসর মেন্টরশিপ, প্রজেক্ট ম্যাচিং ও মাইলস্টোন ট্র্যাকিং। কোন প্রফেসর অ্যাভেইলেবল তা ভেরিফাই করতে হবে।`
		};
	}

	if (cmd.category === 'Finance') {
		return {
			spoken: isBanglish
				? 'Finance report-ta ekhono amar kache nei. Upload korle revenue, expense, margin ar budget variance check kore dekhabo.'
				: 'ফাইন্যান্স রিপোর্টটি এখনো আমার কাছে নেই। আপলোড করলে রেভিনিউ, খরচ, মার্জিন ও বাজেট ভ্যারিয়েন্স বিশ্লেষণ করে দেখাব।',
			display: `${cmd.sample_ai_response}`
		};
	}

	if (cmd.operation === 'approval') {
		return {
			spoken: isBanglish
				? 'Draft ready korchi. Apnar confirmation o approval chara kono message send ba live change hobe na.'
				: 'ড্রাফট প্রস্তুত করা হয়েছে। আপনার কনফার্মেশন ও অ্যাপ্রুভাল ছাড়া কোনো মেসেজ পাঠানো বা লাইভ পরিবর্তন করা হবে না।',
			display: `${cmd.sample_ai_response}`
		};
	}

	return {
		spoken: isBanglish
			? `${cmd.category} module-e "${cmd.intent}" request process korchi. Screen-e details dekhun.`
			: `${cmd.category} মডিউলে আপনার অনুরোধ (${cmd.intent}) প্রসেস করা হয়েছে। বিস্তারিত স্ক্রিনে দেখুন।`,
		display: cmd.sample_ai_response
	};
}

export function orchestrateCommand(
	rawInput: string,
	options: {
		modality: 'voice' | 'text';
		selectedCategoryLabel?: string | null;
		activeProjectId?: string;
		lastResult?: OrchestratorResponse | null;
	}
): OrchestratorResponse {
	const transcript = rawInput.trim();
	const language = detectLanguage(transcript);
	const requestId = `req_${Date.now().toString(36)}`;

	// 1. Conversational continuity (Addendum §3 & §10): follow-up on lastResult
	if (
		options.lastResult &&
		/shorter|bangla|বাংলা|30[- ]day|ছোট করে|translate|অনুবাদ/i.test(transcript) &&
		transcript.split(/\s+/).length <= 10
	) {
		const prev = options.lastResult;
		const isBnReq = language !== 'en' || /bangla|বাংলা/i.test(transcript);
		const shortened =
			prev.display_reply.length > 140
				? prev.display_reply.slice(0, 137) + '...'
				: prev.display_reply;
		return {
			...prev,
			request_id: requestId,
			input: { modality: options.modality, transcript },
			language,
			spoken_reply: isBnReq
				? `আগের ফলাফল (${prev.intent}) সংক্ষেপে আপডেট করা হয়েছে।`
				: `Updated the previous ${prev.intent} result as requested.`,
			display_reply: isBnReq
				? `সংক্ষিপ্ত ফলো-আপ (${prev.module}): ${shortened}`
				: `Follow-up (${prev.module}): ${shortened}`,
			status: 'completed',
			status_detail: 'Context-linked follow-up'
		};
	}

	// 2. Check Retell AI Voice Agent document knowledge first if voice/retell/pipeline keywords match
	for (const doc of RETELL_VOICE_DOCS) {
		if (doc.keywords.test(transcript)) {
			const localized = language === 'en' ? doc.en : doc.bn;
			return {
				request_id: requestId,
				input: { modality: options.modality, transcript },
				language,
				intent: doc.intent,
				module: doc.module,
				categoryCls: doc.categoryCls,
				route: doc.route,
				status: 'completed',
				status_detail: 'Grounded in Retell AI Voice Agent docs',
				spoken_reply: localized.spoken,
				display_reply: localized.display,
				card_type: 'source-results',
				suggested_followups: localized.followups,
				sources: ['Retell AI Voice Agent Architecture Docs (10 slides)'],
				requires_approval: false,
				pending_action: null
			};
		}
	}

	// 2.5 Check Project-Wise Multi-Agent & Account Team Follow-up Commands
	const isAccountFollowup =
		/(account\s*team|accounts|অ্যাকাউন্ট|ফলোআপ|follow[- ]?up).*(mail|email|report|মেইল|রিপোর্ট|পাঠাও|send)|(daily|weekly|monthly|ডেইলি|উইকলি|মান্থলি).*(account|অ্যাকাউন্ট|follow[- ]?up|ফলোআপ|mail|মেইল)/i.test(
			transcript
		);

	if (isAccountFollowup) {
		const cadence: ScheduleCadence = /monthly|মান্থলি|মাসিক/i.test(transcript)
			? 'Monthly'
			: /weekly|উইকলি|সাপ্তাহিক/i.test(transcript)
				? 'Weekly'
				: 'Daily';
		const dispatched = multiAgentStore.triggerAccountFollowup(cadence);
		return {
			request_id: requestId,
			input: { modality: options.modality, transcript },
			language,
			intent: 'ACCOUNT_TEAM_FOLLOWUP',
			module: 'Email',
			categoryCls: 'development',
			route: 'finance_agent',
			status: 'completed',
			status_detail: `${dispatched.cadence} Follow-up Dispatched · ${dispatched.recipient}`,
			spoken_reply:
				language === 'en'
					? `Kairo dispatched the ${dispatched.cadence} follow-up report to ${dispatched.recipient} on time.`
					: `Kairo অ্যাকাউন্ট টিমের (${dispatched.recipient}) কাছে ${dispatched.cadence} ফলোআপ রিপোর্ট মেইল সময়মতো পাঠিয়ে দিয়েছে।`,
			display_reply:
				language === 'en'
					? `PM Agent: Kairo (Account & Finance)\nDispatched: ${dispatched.title} (${dispatched.cadence})\nRecipient: ${dispatched.recipient}\nStatus: Sent on time & logged to Admin > Email.`
					: `PM এজেন্ট: Kairo (Account & Finance)\nরিপোর্ট: ${dispatched.title} (${dispatched.cadence})\nপ্রাপক: ${dispatched.recipient}\nস্ট্যাটাস: সময়মতো পাঠানো হয়েছে এবং Admin > Email-এ লগ হয়েছে।`,
			card_type: 'email_dispatch_card',
			suggested_followups:
				language === 'en'
					? ['Show all Account schedules', 'Send Weekly KPI report too']
					: ['সব অ্যাকাউন্ট শিডিউল দেখাও', 'সাপ্তাহিক KPI রিপোর্টও পাঠাও'],
			sources: ['MultiAgentStore', 'AccountFollowupScheduler'],
			requires_approval: false,
			pending_action: null,
			projectName: 'Account & Finance Reporting',
			pmAgent: 'Kairo',
			delegatedTeam: ['Executive Mail Dispatcher', 'Bookkeeping Agent']
		};
	}

	const isProjectPMNote =
		/(project\s*manager|pm|প্রজেক্ট\s*ম্যানেজার|ম্যানেজার|নোট|note|delegate|লিড|টিম|portfolio|পোর্টফোলিও|social\s*media|সোশ্যাল)/i.test(
			transcript
		) || (options.activeProjectId && options.activeProjectId !== 'all');

	if (isProjectPMNote) {
		const note = multiAgentStore.routeVoiceNoteToPM(
			transcript,
			options.modality,
			options.activeProjectId
		);
		return {
			request_id: requestId,
			input: { modality: options.modality, transcript },
			language,
			intent: 'PROJECT_PM_DELEGATION',
			module: 'Team',
			categoryCls: 'team',
			route: 'kpi_team_agent',
			status: 'completed',
			status_detail: `Routed to ${note.pmName} (${note.projectName})`,
			spoken_reply:
				language === 'en'
					? `Note routed to ${note.pmName} for ${note.projectName}. Team members ${note.delegatedTo.join(' and ')} are executing it now.`
					: `আপনার নোটটি ${note.projectName}-এর প্রজেক্ট ম্যানেজার ${note.pmName}-এর কাছে পাঠানো হয়েছে এবং ${note.delegatedTo.join(' ও ')}-কে কাজ বুঝিয়ে দেওয়া হয়েছে।`,
			display_reply:
				language === 'en'
					? `Project: ${note.projectName}\nPM Agent: ${note.pmName}\nDelegated Team: ${note.delegatedTo.join(', ')}\nPM Report: ${note.pmReport}`
					: `প্রজেক্ট: ${note.projectName}\nPM এজেন্ট: ${note.pmName}\nটিম মেম্বার: ${note.delegatedTo.join(', ')}\nPM রিপোর্ট: ${note.pmReport}`,
			card_type: 'pm_delegation_card',
			suggested_followups:
				language === 'en'
					? ['Send Daily Account follow-up email', 'Show Portfolio & Social status']
					: ['অ্যাকাউন্ট টিমকে ডেইলি ফলোআপ মেইল পাঠাও', 'পোর্টফোলিও ও সোশ্যাল মিডিয়ার আপডেট দাও'],
			sources: ['MultiAgentStore', 'ProjectManagerRouter'],
			requires_approval: false,
			pending_action: null,
			projectName: note.projectName,
			pmAgent: note.pmName,
			delegatedTeam: note.delegatedTo,
			taskNoteId: note.id
		};
	}

	// 3. Score against all 82 commands in Ismail_AI_Command_Center_Examples.json
	const tokens = tokenizeExpanded(transcript);
	let bestCmd: DatasetCommand | null = null;
	let bestScore = 0;

	for (const cmd of commands) {
		const haystack = `${cmd.example_command} ${cmd.category} ${cmd.intent} ${cmd.sample_ai_response}`.toLowerCase();
		let score = 0;

		for (const tok of tokens) {
			if (haystack.includes(tok)) {
				score += tok.length >= 5 ? 3 : 2;
			}
		}

		// Boost if the user has selected a category pill in the UI
		if (
			options.selectedCategoryLabel &&
			cmd.category.toLowerCase() === options.selectedCategoryLabel.toLowerCase()
		) {
			score += 1.5;
		}

		// Exact phrase boosts for Addendum §9 demos
		if (/nigeria/i.test(transcript) && cmd.id === 'SAL-02') score += 8;
		if (/researchgoal/i.test(transcript) && /mvp|plan|প্ল্যান/i.test(transcript) && cmd.id === 'CRO-02')
			score += 8;
		if (/indian agent/i.test(transcript) && /campaign|ক্যাম্পেইন|pathao|পাঠাও/i.test(transcript) && cmd.id === 'MAR-03')
			score += 8;
		if (/create a project|নতুন প্রজেক্ট/i.test(transcript) && cmd.id === 'GEN-06') score += 8;
		if (/show analytics|এনালিটিক্স/i.test(transcript) && cmd.id === 'GEN-11') score += 8;
		if (/schedule a meeting|মিটিং/i.test(transcript) && cmd.id === 'GEN-10') score += 8;
		if (/generate report|রিপোর্ট/i.test(transcript) && cmd.id === 'GEN-09') score += 8;

		if (score > bestScore) {
			bestScore = score;
			bestCmd = cmd;
		}
	}

	// Fallback to CAPABILITIES (GEN-01) if no strong match
	const matched = bestScore >= 2 && bestCmd ? bestCmd : commands[0];
	const requiresApproval = matched.operation === 'approval';
	const needsAuthGate = matched.intent === 'ACCESS_CHECK';
	const needsConnector = /crm|finance|calendar|social_analytics/.test(matched.required_capability);

	const status: OrchestratorResponse['status'] = needsAuthGate
		? 'authorization_gate'
		: requiresApproval
			? 'awaiting_approval'
			: needsConnector
				? 'missing_integration'
				: 'ready';

	const categoryCls = CATEGORY_TO_CARD_CLS[matched.category] ?? 'research';
	const route = CATEGORY_TO_ROUTE[matched.category] ?? 'orchestrator';

	let spokenReply = matched.sample_ai_response;
	let displayReply = matched.sample_ai_response;

	if (language !== 'en') {
		const bn = buildBanglaResponseForDataset(matched, language);
		spokenReply = bn.spoken;
		displayReply = bn.display;
	} else {
		// Keep spoken reply concise (1-2 sentences per Addendum §3)
		const sentences = matched.sample_ai_response.match(/[^.!?]+[.!?]+/g);
		if (sentences && sentences.length > 2) {
			spokenReply = sentences.slice(0, 2).join(' ').trim();
		}
	}

	return {
		request_id: requestId,
		input: { modality: options.modality, transcript },
		language,
		intent: matched.intent,
		module: matched.category,
		categoryCls,
		route,
		status,
		status_detail: needsAuthGate
			? 'Verified owner session required'
			: requiresApproval
				? 'Awaiting explicit user approval before write/send'
				: needsConnector
					? `Requires connector: ${matched.required_capability}`
					: 'Ready',
		spoken_reply: spokenReply,
		display_reply: displayReply,
		card_type: matched.recommended_ui,
		suggested_followups:
			language === 'en'
				? ['Make it shorter in Bangla', 'Draft a 30-day action plan']
				: ['এটা আরও ছোট করে দাও', 'এটার ৩০ দিনের অ্যাকশন প্ল্যান বানাও'],
		sources: ['Ismail_AI_Command_Center_Examples.json', 'Ismail_AI_Command_Orchestrator_Addendum.md'],
		requires_approval: requiresApproval,
		pending_action: requiresApproval ? matched.example_command : null
	};
}
