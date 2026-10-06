export type AvailableVoice = { identifier: string; language: string; name: string; quality: string };

export function choosePortugueseVoices(voices: AvailableVoice[]) {
  const brazilian = voices.filter(voice => /^pt[-_]BR$/i.test(voice.language));
  const score = (voice: AvailableVoice) => {
    const label = `${voice.identifier} ${voice.name}`.toLowerCase();
    return (voice.quality === "Enhanced" ? 10 : 0)
      + (/neural|natural|wavenet/.test(label) ? 8 : 0)
      + (/network|online/.test(label) ? 4 : 0);
  };
  const preferred = [...brazilian].sort((a, b) => score(b) - score(a))[0];
  const fallback = brazilian.find(voice => !/network|online/i.test(`${voice.identifier} ${voice.name}`));
  return { preferred: preferred?.identifier, fallback: fallback?.identifier };
}
