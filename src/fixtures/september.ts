// The 20 anonymised phone enquiries from Aangan_Sep 2026_Enquiries (Section 1), replayed through the
// pipeline as if the AI agent had taken them. `expected` is the outcome Nikhil's rubric gives
// (qualified.md), kept as the reference set for checking the system's judgement.
import type { LeadStatus, Turn } from "@/lib/types";

export interface Fixture {
  ref: string;
  start: string; // ISO, IST
  durationSec: number;
  phone: string;
  expected: LeadStatus;
  /** Borderline under the rubric: either outcome is defensible. */
  alsoAcceptable?: LeadStatus[];
  why: string;
  turns: Turn[];
}

const A = (text: string): Turn => ({ speaker: "agent", text });
const C = (text: string): Turn => ({ speaker: "caller", text });
const phone = (n: number) => `+9190000${String(n).padStart(5, "0")}`;

export const SEPTEMBER: Fixture[] = [
  {
    ref: "T01", start: "2026-09-02T10:23:00+05:30", durationSec: 252, phone: phone(101), expected: "QUALIFIED",
    why: "Full 3BHK redesign in Kothrud, done by March, owner with spouse on board.",
    turns: [
      A("Good morning, Aangan Studio."),
      C("Hi, I'm Priya. I got your number from a friend — Shruti Joshi. She had her flat done by you in Aundh."),
      A("Of course — thank you for calling. What are you looking to do?"),
      C("We have a 3BHK in Kothrud — Dahanukar Colony. We bought it two years ago and it still looks like the builder flat. We want to redo the whole thing — kitchen, living room, both bedrooms."),
      A("That sounds like a complete redesign. How big is the apartment?"),
      C("About 1,400 sq ft carpet."),
      A("And your timeline?"),
      C("We'd like to be done by March. We're in no rush."),
      A("Perfect. Are you the owner?"),
      C("Yes — myself and my husband. He knows we're calling and is happy to go ahead."),
      A("Lovely. Can I take your number and schedule a consultation?"),
      C("Sure."),
    ],
  },
  {
    ref: "T02", start: "2026-09-03T14:41:00+05:30", durationSec: 308, phone: phone(102), expected: "QUALIFIED",
    why: "Full 2BHK in Wakad (PCMC), moving in November. Pricing asked twice and deflected: not a disqualifier.",
    turns: [
      A("Good afternoon, Aangan Studio."),
      C("Hi. I was looking at your work on Instagram. I have a 2BHK in Wakad — can you tell me roughly how much something like that would cost?"),
      A("Our pricing depends on the materials and the scope — the best way to get a clear picture is a consultation with one of our designers, who can walk you through everything. What are you planning to do?"),
      C("Full redesign — modular kitchen, wardrobes, living room, both bedrooms. About 950 sq ft."),
      A("Good scope. What's your timeline?"),
      C("We move in November — so maybe starting design from October?"),
      A("That works well. Shall I set up a consultation?"),
      C("Yes, but can you give me a rough ballpark first? Even a range?"),
      A("I genuinely can't — it varies quite a bit based on materials. Giving you a number without seeing the site would be misleading. The designer will go through all of that with you — the consultation is free and there's no obligation."),
      C("Okay, fair enough. Let's book it."),
    ],
  },
  {
    ref: "T03", start: "2026-09-03T16:15:00+05:30", durationSec: 160, phone: phone(103), expected: "DISQUALIFIED",
    why: "Site is in Nashik: outside Pune / PCMC.",
    turns: [
      A("Good afternoon, Aangan Studio."),
      C("Hello, I saw your work on LinkedIn. My name is Suresh Patil. I'm in Nashik — would you be able to take on a project here? I want to redo my home office and study."),
      A("Thank you for calling. We only work in Pune and PCMC at the moment — we don't have the vendor network to take on projects outside Pune."),
      C("Not even for a smaller project?"),
      A("Even for a smaller project, our execution depends on our contractors being on-site. I'm sorry we can't help."),
      C("Alright, understood. Thanks."),
    ],
  },
  {
    ref: "T04", start: "2026-09-04T11:07:00+05:30", durationSec: 202, phone: phone(104), expected: "DISQUALIFIED",
    why: "Wants ideas and advice only, no execution.",
    turns: [
      A("Good morning, Aangan Studio."),
      C("Hi — can someone come and give us some ideas for our living room? We're not planning to do the full thing right now. Just want suggestions on colours, furniture arrangement, what to change."),
      A("We're a full-service studio — our projects include design and execution together. We don't do advisory or consultation-only visits. If you're planning a full redesign with execution, we'd be a great fit."),
      C("Oh I see. No, we're just exploring for now. Maybe later."),
      A("Of course — feel free to call back when you're ready to go ahead with a full project."),
    ],
  },
  {
    ref: "T05", start: "2026-09-05T10:52:00+05:30", durationSec: 404, phone: phone(105), expected: "QUALIFIED",
    why: "4BHK, 2,400 sq ft in Koregaon Park, back by February, already moved out. Referral via a friend of Nikhil.",
    turns: [
      A("Good morning, Aangan Studio."),
      C("Hi, this is Aarti Mehta. Vikram Agarwal asked me to call — he's a close friend of Nikhil's."),
      A("Of course, thank you. What are you looking for?"),
      C("We have a 4BHK in Koregaon Park — about 2,400 sq ft carpet. Complete redesign. New flooring, kitchen, all four bedrooms. We've already moved out temporarily."),
      A("That's a significant project. Do you have a timeline?"),
      C("We want to move back in by February. About 4 months."),
      A("That should work well. Would you prefer a site visit for the consultation?"),
      C("Yes please — Vikram said your team does that."),
      A("Absolutely. Can I check your availability for early next week?"),
    ],
  },
  {
    ref: "T06", start: "2026-09-05T15:28:00+05:30", durationSec: 301, phone: phone(106), expected: "QUALIFIED",
    why: "800 sq ft bare-shell office in Baner, operational by December, founder on the call.",
    turns: [
      A("Good afternoon, Aangan Studio."),
      C("Hi, I'm calling about a commercial project. We're a startup — just got our first proper office space in Baner. About 800 sq ft. We need workstations for 20 people, a small cabin, a meeting room, and a break area."),
      A("We do commercial fitouts up to about 3,000 sq ft. What's the state of the space right now?"),
      C("Bare shell — just columns and floor. Nothing else."),
      A("Full fitout from scratch. And the timeline?"),
      C("We want to be operational by December. Our team is working from home currently."),
      A("December is doable. Are you the decision-maker for this?"),
      C("Yes, I'm the founder."),
      A("Perfect. Let's set up a consultation."),
    ],
  },
  {
    ref: "T07", start: "2026-09-08T09:44:00+05:30", durationSec: 195, phone: phone(107), expected: "DISQUALIFIED",
    why: "Needs it done before Diwali, about three weeks away: under the six-week minimum.",
    turns: [
      A("Good morning, Aangan Studio."),
      C("Hello — I want to redo my living room and kitchen before Diwali. Can you take it up?"),
      A("Diwali is about three weeks away. Our design phase alone takes 3–4 weeks, and execution follows. We couldn't do justice to a project in that time."),
      C("Even just the living room?"),
      A("Even so — a room redesign with execution takes at least 8–10 weeks from start to finish. We wouldn't want to rush it."),
      C("What if I start after Diwali?"),
      A("A November start would work well. Shall I note your details for that?"),
      C("Let me think and call back."),
    ],
  },
  {
    ref: "T08", start: "2026-09-09T22:47:00+05:30", durationSec: 0, phone: phone(108), expected: "NEEDS_INFO",
    why: "Missed call at 10:47pm, no voicemail. With the AI agent this is answered; as a record it is a call-back.",
    turns: [],
  },
  {
    ref: "T09", start: "2026-09-10T11:32:00+05:30", durationSec: 352, phone: phone(109), expected: "ESCALATED",
    why: "Existing client: project running three months, designer silent for five days.",
    turns: [
      A("Good morning, Aangan Studio."),
      C("I need to speak to someone right now. My project has been going for three months and my designer hasn't replied in five days. This is not acceptable."),
      A("I'm very sorry. Can I take your name and project details?"),
      C("Sheetal Deshpande. My designer is Aryan. Flat in Viman Nagar — 2BHK. I've sent three messages and called twice."),
      A("Sheetal, I'm getting this to our project team right now. Would you prefer to hold for two minutes, or should I have someone senior call you back within 15 minutes?"),
      C("Callback. And I want it from Nikhil or a senior person — not just whoever picks up."),
      A("Noted. I'll make sure of that."),
    ],
  },
  {
    ref: "T10", start: "2026-09-11T14:04:00+05:30", durationSec: 220, phone: phone(110), expected: "DISQUALIFIED",
    why: "Volunteered ₹1–1.5 lakh for a kitchen plus a bedroom: clearly below any project of that scope.",
    turns: [
      A("Good afternoon, Aangan Studio."),
      C("Hi. I have a 1BHK in Kharadi — about 550 sq ft. I want to do the kitchen and one bedroom. My budget is 1 to 1.5 lakh maximum for everything. Is that possible with you?"),
      A("I appreciate you sharing that. For a kitchen redesign and a bedroom with full execution — materials, furniture, and contractor work — 1 to 1.5 lakh would be significantly below what a project of that scope would cost with us."),
      C("Even for one bedroom?"),
      A("Even for one room. I wouldn't want to bring you to a consultation if the numbers don't align. I'd suggest checking with local contractors who work at that price point."),
      C("Okay, thank you for being straight."),
    ],
  },
  {
    ref: "T11", start: "2026-09-12T10:18:00+05:30", durationSec: 382, phone: phone(111), expected: "QUALIFIED",
    why: "Rented 2BHK in Baner, 3-year lease, landlord fine, no structural work: rented is not a disqualifier.",
    turns: [
      A("Good morning, Aangan Studio."),
      C("Hi — I have a question. I'm in a rented apartment. Can you still take up a project?"),
      A("It depends on the scope. What are you looking to do?"),
      C("It's a 2BHK in Baner. I've been here a year, I have a 3-year lease, and the place is quite bare. I want to properly design the living room, bedroom, and kitchen — no structural changes, just design and fittings."),
      A("That's fine — we've done rented apartments before. For the kitchen we'd do a modular unit that can come out cleanly. The rest is largely flooring, lighting, and furniture — all reversible. Have you checked with your landlord?"),
      C("Yes — they're fine with it as long as we don't break walls."),
      A("Perfect. No wall-breaking from us. Shall we set up a consultation?"),
      C("Yes please."),
    ],
  },
  {
    ref: "T12", start: "2026-09-15T10:05:00+05:30", durationSec: 450, phone: phone(112), expected: "QUALIFIED",
    why: "5,500 sq ft new villa in Kalyani Nagar, empty, move in March.",
    turns: [
      A("Good morning, Aangan Studio."),
      C("I'm calling about a villa project in Kalyani Nagar. My name is Anand Sharma. The property is about 5,500 sq ft — ground plus two floors. Full end-to-end design."),
      A("That's a significant project. Is this a new property or an existing home?"),
      C("New construction. Possession was last month. Completely empty."),
      A("And your timeline?"),
      C("March next year to move in. No rush."),
      A("Good time to start. Would you like our principal designer to come to site for the first consultation?"),
      C("Yes — this week or next if possible."),
      A("Let me check the calendar and revert by end of day."),
    ],
  },
  {
    ref: "T13", start: "2026-09-16T12:19:00+05:30", durationSec: 368, phone: phone(113), expected: "QUALIFIED", alsoAcceptable: ["NEEDS_INFO"],
    why: "3BHK in Aundh they live in (no deadline, so timeline passes; asking one timeline question is also defensible); kitchen, wardrobes, living room. Pushed hard for a price; deflected.",
    turns: [
      A("Good afternoon, Aangan Studio."),
      C("Hi — I want to redo my flat in Aundh. 3BHK, about 1,100 sq ft. What might it cost?"),
      A("Our pricing depends on the materials and scope — the designers go through that at the consultation. What are you planning?"),
      C("Kitchen, wardrobes in both bedrooms, living room. But seriously — can't you give me even a rough range? I just want to know if we're in the same ballpark."),
      A("I really can't give a number that would mean anything without seeing the site and the spec. The difference between a standard and a premium kitchen alone can be 3× the cost. The consultation is free — the designer will give you a proper number by the end of it."),
      C("Fine. Let's book then."),
      A("Perfect. What days work for you?"),
    ],
  },
  {
    ref: "T14", start: "2026-09-17T11:41:00+05:30", durationSec: 295, phone: phone(114), expected: "QUALIFIED",
    why: "Son calling for parents (new 3BHK in Hadapsar). Parents decide and will attend: unclear on criterion 5 → qualified with a note.",
    turns: [
      A("Good morning, Aangan Studio."),
      C("Hi — I wanted to inquire about an interior project for my parents. They have a 3BHK in Hadapsar — new possession. They want a proper design."),
      A("That sounds good. Will your parents be involved in the decision?"),
      C("Yes — I'm doing the initial checking. They don't really use phones much. I'll tell them about the consultation and they'll decide."),
      A("Sure — just so we know: your parents would be at the consultation, right? Our designers like to understand the brief directly from the people who'll live in the space."),
      C("Yes, they would come. I'm just calling to see if it's worth pursuing."),
      A("Absolutely. Should I note your details and explain what the consultation involves?"),
      C("Please."),
    ],
  },
  {
    ref: "T15", start: "2026-09-18T15:12:00+05:30", durationSec: 344, phone: phone(115), expected: "QUALIFIED",
    why: "2BHK in Undri, possession in six weeks, full home, owner with husband's go-ahead.",
    turns: [
      A("Good afternoon, Aangan Studio."),
      C("Hi, I'm Smita. I'm getting possession of my flat in Undri in about six weeks. 2BHK, 875 sq ft. I want to start the design right away."),
      A("Six weeks is just enough lead time to get the design finalised before execution begins. What are you planning?"),
      C("Full home — kitchen, wardrobes, living room. The full package."),
      A("Good scope. Are you the owner?"),
      C("Yes — my husband and I. He said to go ahead and book the consultation."),
      A("Can we see the site in its current state, or do you need to wait for possession?"),
      C("We can go now — the builder will let us in."),
      A("Even better. Let me get a designer's availability."),
    ],
  },
  {
    ref: "T16", start: "2026-09-19T10:38:00+05:30", durationSec: 318, phone: phone(116), expected: "QUALIFIED", alsoAcceptable: ["NEEDS_INFO"],
    why: "3BHK in Viman Nagar; earlier enquiry was dropped, so priority. Scope never stated on this call: asking one scope question is also correct.",
    turns: [
      A("Good morning, Aangan Studio."),
      C("Hi — I'd called on Monday about a project. Someone said they'd get back to me. It's been two days."),
      A("I'm very sorry. Can I get your name?"),
      C("Girish Nair. I called Monday afternoon. I told someone about my 3BHK in Viman Nagar and gave my number."),
      A("I apologise — I don't see a note. Can you give me your details again? I'll book the consultation directly now so it doesn't slip again."),
      C("This is not a good sign if you forget before you even start."),
      A("You're absolutely right, and I'm sorry. Let me make this right now."),
    ],
  },
  {
    ref: "T17a", start: "2026-09-22T14:14:00+05:30", durationSec: 72, phone: phone(117), expected: "NEEDS_INFO",
    why: "Line dropped before any details. Linked to T17b, the call-back two minutes later.",
    turns: [A("Good afternoon, Aangan Studio."), C("Hi, I wanted to inquire about —")],
  },
  {
    ref: "T17b", start: "2026-09-22T14:16:00+05:30", durationSec: 270, phone: phone(117), expected: "QUALIFIED",
    why: "3BHK in Pimple Saudagar (PCMC), kitchen + wardrobes + living room, done by March.",
    turns: [
      A("Good afternoon, Aangan Studio."),
      C("Hi — I called just now and got cut off. I'm Ritu Kapoor from Pimple Saudagar. 3BHK, about 1,050 sq ft. We've been here two years but never properly did the interiors. We want to start now."),
      A("Thanks for calling back. Pimple Saudagar is in our service area. What are you looking to do?"),
      C("Kitchen, wardrobes, living room. We moved in with builder furniture and it's very basic."),
      A("Standard full-home scope. Timeline?"),
      C("Ideally done by March. Plenty of time."),
      A("Perfect. Let me book a consultation."),
    ],
  },
  {
    ref: "T18", start: "2026-09-23T11:55:00+05:30", durationSec: 182, phone: phone(118), expected: "DISQUALIFIED",
    why: "180 sq ft coworking pod: below the commercial minimum.",
    turns: [
      A("Good morning, Aangan Studio."),
      C("Hi — I run a small coworking space. I have a 180 sq ft pod I want to make look really nice. Good lighting, a nice desk, some storage. Can you help?"),
      A("Our commercial projects are typically 500 sq ft or more. A 180 sq ft pod is below our minimum scope."),
      C("Not even for a smaller fee?"),
      A("It's not about the fee — it's that our design and execution team is set up for a certain scale. I'd suggest a local designer who specialises in smaller commercial spaces."),
      C("Fair enough. Thanks."),
    ],
  },
  {
    ref: "T19", start: "2026-09-24T16:02:00+05:30", durationSec: 170, phone: phone(119), expected: "DISQUALIFIED",
    why: "Restaurant: hospitality is out of scope.",
    turns: [
      A("Good afternoon, Aangan Studio."),
      C("Hi — I'm planning to open a restaurant in Koregaon Park. I've seen your work and I love it. Would you be able to design the interiors?"),
      A("We appreciate you reaching out. Restaurant and hospitality interiors are outside our current scope — we focus on residential and office spaces."),
      C("Do you know anyone you could refer?"),
      A("I don't have a specific referral I could make confidently, but searching for hospitality interior designers in Pune would give you more relevant options."),
      C("Alright, thanks."),
    ],
  },
  {
    ref: "T20", start: "2026-09-25T09:15:00+05:30", durationSec: 284, phone: phone(120), expected: "QUALIFIED",
    why: "2BHK in Magarpatta, 900 sq ft, January execution start, both owners attending. Called at 9:15am, before the desk opens.",
    turns: [
      A("Good morning, Aangan Studio."),
      C("Good morning. I'm Pooja. I have a 2BHK in Magarpatta — Cybercity area. We've been wanting to properly design the interiors for a while. Kitchen, both bedrooms, living room. About 900 sq ft."),
      A("Good scope for us. How soon are you looking to start?"),
      C("We're flexible — a January start for execution would be ideal."),
      A("That works well. Are you the owner?"),
      C("Yes — my husband and I. We both want to be at the consultation."),
      A("Excellent. Can I book that now?"),
      C("Please."),
    ],
  },
];
