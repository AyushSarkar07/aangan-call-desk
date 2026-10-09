// Test scripts for the live demo. Each one exercises a different branch of the rubric.
export const SAMPLES = [
  {
    name: "Qualified, 11pm, asks for price",
    text: `Agent: Namaste, Aangan Studio. I'm the studio's assistant. How can I help with your home?
Caller: Hi, sorry it's so late. We just got possession of a 3BHK in Baner, about 1,250 square feet carpet.
Agent: Congratulations! What are you hoping to do with it?
Caller: Everything. Modular kitchen, wardrobes in all three bedrooms, living and dining. We want it properly designed and executed.
Agent: That's exactly what we do. When would you need it complete?
Caller: We'd like to move in by end of February.
Agent: That works well. Are you the owner, or deciding together with someone?
Caller: My wife and I own it together, she's on board. Roughly how much per square foot do you charge?
Agent: Pricing depends on the site, the materials you choose, and the scope — your designer will walk you through it in detail at the consultation. I can book that for you right now if you'd like.
Caller: Okay, sure. Saturday morning would be best, at the flat if possible.
Agent: Perfect, I'll book a site visit for Saturday morning. May I have your name?
Caller: Rohan Kulkarni.`,
  },
  {
    name: "Out of area + rushed (decline)",
    text: `Agent: Hello, Aangan Studio, how can I help?
Caller: Hi, I have a bungalow in Lonavala and I want the living room and two bedrooms redone.
Agent: Thanks for calling. When would you need it complete?
Caller: We have a family wedding in four weeks, so it has to be done by then.
Agent: I'm sorry, we only work in Pune city and PCMC, and four weeks wouldn't let us do it justice. This sounds like it may not be the right fit for us right now — but feel free to reach out if your timeline or scope changes.
Caller: Okay, understood.`,
  },
  {
    name: "Existing client complaint (escalate)",
    text: `Agent: Aangan Studio, good evening.
Caller: This is Meera Joshi. Our kitchen installation in Wakad was supposed to finish last week and nobody from your team has turned up for four days.
Agent: I'm very sorry, Meera. I'm alerting a senior member of the team right now. Someone will call you back within 15 minutes.
Caller: Please make sure it's someone senior.`,
  },
  {
    name: "Hinglish, unclear location (call back)",
    text: `Agent: Namaste, Aangan Studio.
Caller: Namaste. Mujhe apne 2BHK ka poora interior karwana hai, kitchen, wardrobes, sab kuch. Design aur execution dono.
Agent: Zaroor. Flat kis area mein hai?
Caller: Abhi main bahar hoon, details baad mein bhejta hoon. Main hi owner hoon.
Agent: Koi baat nahi. Aapko kab tak complete chahiye?
Caller: Koi jaldi nahi hai, flat ready hai.`,
  },
  {
    name: "Advice only (decline)",
    text: `Agent: Aangan Studio, how may I help?
Caller: I just want someone to come over and suggest paint colours and how to rearrange our furniture. We'll do the work ourselves.
Agent: Thanks for explaining. We're a full design-and-execution studio, so advice-only visits aren't something we offer. Feel free to reach out when you're planning a full redesign.
Caller: Alright, thanks.`,
  },
];
