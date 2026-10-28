# Agentic AI — 2-Minute Video Script

**Duration:** 2 minutes  
**Narration:** Roman Urdu  
**Format:** Screen recording with short labels and simple flow arrows

## 0:00–0:15 — Project ka maqsad

**Visual:** Planning chat khol kar mascot aur requirement box dikhayein.

**Voiceover:**  
“Yeh Agentic AI ek software planning assistant hai. Aap apna idea aam zubaan mein likhte hain, aur yeh usay Features, User Stories aur Tasks ke blueprint mein badalta hai. Yeh code khud nahi likhta—plan banata hai jise aap review karte hain.”

## 0:15–0:35 — Request ka safar

**Visual:** `Browser → Next.js → Express API → MongoDB / AI` diagram dikhayein.

**Voiceover:**  
“Browser mein bani Next.js chat JSON request Express API ko bhejti hai. API request validate karke planning service tak pohanchati hai. Agar wahi requirement pehle save ho, system database se plan la sakta hai. Warna naya generation run shuru hota hai aur chat uska status dikhati rehti hai.”

## 0:35–1:10 — AI pipeline

**Visual:** One complete-plan generation card → deterministic validation gate.

**Voiceover:**  
“Central orchestrator requirement ko ek hi LLM request mein complete plan banane ke liye bhejta hai: brief, Features, Stories aur Tasks. Phir deterministic validator structure, requirement coverage, links, dependencies aur feature limit check karta hai. Validation pass na ho to plan database mein successful version ke taur par save nahi hota; automatic extra LLM request nahi hoti.”

## 1:10–1:35 — Saving aur review

**Visual:** Saved Plans khol kar project, versions aur ek version ka preview dikhayein.

**Voiceover:**  
“Successful plan MongoDB mein project version ke taur par save hota hai. Versions preserve rehte hain, isliye nayi chat shuru karne par purani chat dikhana zaroori nahi—saved plans wahan milte hain. Aap version khol kar Features, Stories aur Tasks dekh sakte hain, phir plan accept kar sakte hain.”

## 1:35–2:00 — Boundaries aur wrap-up

**Visual:** `Requirement → Features → Stories → Tasks`; end-card par current single-user scope.

**Voiceover:**  
“Groq ya Gemini API aur MongoDB credentials server par rehte hain; browser ko secrets nahi milte. Abhi yeh local ya demo single-user system hai—authentication aur multi-user access baad ka kaam hai. Mukhtasar flow: idea do, validated blueprint lo, review karo, aur versions Saved Plans mein sambhalo.”

## Recording reminders

- Recording mein `.env`, API keys, ya database credentials na dikhayein.
- Demo ke liye ek real software requirement use karein.
- Har visual ko voiceover ke saath dikhayein; terminal/code par zyada der na rukhein.

## Source references

- `architecture/02-system-architecture.md`
- `architecture/03-generation-workflow.md`
- `architecture/10-frontend-backend-system-flow.md`
- `servers/api/features/planning/API.md`
