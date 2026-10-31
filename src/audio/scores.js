export const TRACKS = Object.freeze([
  ['Twilight Serenity', '宁静的黄昏'], ['Bustling Afternoon in Mondstadt', '蒙德城繁忙的午后'],
  ['Moonlike Smile', '皎洁的笑颜'], ['Rex Incognito', '尘世闲游'],
  ['Termination of Desires', '斩雾破竹'], ['Rage Beneath the Mountains', '山峦的震怒'],
].map(([title, name], i) => Object.freeze({ id: i, title, name, url: `/audio/M-0${i + 1}.mp3` })));

// Compact fallback arrangements: melody, arpeggio, bass and sustained strings.
// MP3 is the reference recording; these reduced arrangements require listening QA.
export const SCORES = [
  { bpm: 76, root: 48, instrument: 'piano', melody: [76,79,81,0,79,76,74,72,74,76,79,76,74,71,72,0] },
  { bpm: 112, root: 48, instrument: 'harp', melody: [72,76,79,84,83,79,77,76,74,77,81,79,76,74,72,0] },
  { bpm: 68, root: 50, instrument: 'piano', melody: [78,81,85,83,81,78,76,0,74,78,81,78,76,73,74,0] },
  { bpm: 104, root: 45, instrument: 'guzheng', melody: [69,72,74,76,79,76,74,72,69,67,69,72,74,72,69,0] },
  { bpm: 136, root: 45, instrument: 'strings', melody: [81,80,76,74,72,74,76,80,81,88,86,84,83,80,81,0] },
  { bpm: 128, root: 38, instrument: 'guzheng', melody: [62,65,67,69,72,69,67,65,62,60,62,65,67,69,62,0] },
];
