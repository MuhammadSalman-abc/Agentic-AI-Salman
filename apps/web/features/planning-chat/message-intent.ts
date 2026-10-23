const smallTalkFillers = new Set(["han", "haan", "acha", "accha", "yar", "yaar", "yrr", "bhai", "bro", "dost", "ji", "suno", "aray", "arey", "arre", "toh", "tho"]);
const romanUrduSpellings = new Map([["hall", "haal"], ["he", "hai"], ["hy", "hai"], ["kaisay", "kaise"], ["kese", "kaise"], ["kesy", "kaise"], ["ksy", "kaise"]]);

const smallTalkPattern = /^(?:(?:hi|hello|hey|salam|assalamu alaikum|assalam o alaikum|as-salamu alaykum)(?: (?:there|friend|bro))?|(?:hi|hello|hey|salam) (?:how are you(?: doing)?(?: today)?|kya haal(?: hai)?|kia haal(?: hai)?|kaise ho)|how are you(?: doing)?(?: today)?|how(?:'s| is) it going|what's up|(?:kya|kia) haal(?: hai)?(?: (?:aur )?(?:(?:tum|tm|aap|ap) )?kaise (?:ho|hain|hai))?(?: (?:tere|tera|tumhara|aapka|tum|aap))?|(?:(?:tum|tm|aap|ap) )?kaise (?:ho|hain|hai)(?: (?:tum|tm|aap|ap))?|kaisi ho|kaise hain|aap kaise hain|ap kaise hain|aap kaise ho|tum sunao|aap sunao|tu sunao|what is up|good morning|good afternoon|good evening|thanks|thank you|shukriya)$/i;

export const isSmallTalk = (message: string): boolean => {
  const words = message.toLowerCase().replace(/[!?.,،۔]/g, " ").trim().split(/\s+/).filter(Boolean).map((word) => romanUrduSpellings.get(word) ?? word);
  while (words.length > 0 && smallTalkFillers.has(words[0] ?? "")) words.shift();
  while (words.length > 0 && smallTalkFillers.has(words.at(-1) ?? "")) words.pop();
  return smallTalkPattern.test(words.join(" "));
};
