export const requirementClarification = "Tell me what you’d like to build. Describe an app, website, or feature, and I’ll turn your requirement into features, user stories, and tasks.\n\nFor example: “Build a task manager where users can create, complete, and delete tasks.”";

/** Conservative, local admission check; no additional provider call or token usage. */
export const isActionableRequirement = (input: string): boolean => {
  const text = input.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
  const subject = /\b(app|application|website|site|system|platform|tool|bot|chatbot|api|service|database|project|product|plan|feature|user|customer|task|todo|to-do|cart|order|restaurant|menu|booking|calendar|workspace|profile|password|login|account|notification|payment|file|report|dashboard|student|inventory|item|items|data|software)\b|ایپ|ویب|صارف|پاس ورڈ/iu;
  const capability = /\b(build|create|develop|implement|add|edit|update|delete|remove|save|persist|retrieve|view|browse|search|filter|manage|track|generate|upload|download|reset|log ?in|sign ?up|register|book|order|cancel|complete|send|receive|allow|enable|need|want|bana\w*|bna\w*|chahiye|karn\w*|kar\w*|kr\w*)\b|بنا|چاہیے|کر/iu;
  // A question about the assistant/product is not a request to implement functionality.
  if (/^(?:what (?:is|are|can)|who (?:are|is)|how (?:are|is|does)|tell me (?:a joke|about yourself)|tum (?:kya|kia)|aap (?:kya|kia))/u.test(text)) return false;
  if (/^(?:(?:i|we) (?:want|need)(?: to (?:build|create|develop))?|build|create|develop) (?:a |an |the )?(?:simple |new )?(?:app|application|website|system|software|project|feature)(?: please)?$/u.test(text)) return false;
  return subject.test(text) && capability.test(text);
};
