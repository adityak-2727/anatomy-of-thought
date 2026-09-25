// The chart of meaning's words, by constellation (BRIEF §10). The tokeniser keeps these
// words whole; Phase 4 adds each star's place, magnitude and constellation lines.
//
// Every piece of both specimens and both replies is here: suit in The Wardrobe, case in
// The Chest, the small words and the punctuation in The Crowded Centre. “The” and “the”
// are different pieces with different IDs, so they are different stars. “Suitcase” is
// not on this chart: the machine builds it from suit and case. Each word appears once.

export interface Constellation {
  id: string;
  name: string;
  words: readonly string[];
}

export const CONSTELLATIONS: readonly Constellation[] = [
  {
    id: 'laurel',
    name: 'The Laurel',
    words: [
      'trophy', 'medal', 'cup', 'prize', 'award', 'crown', 'wreath', 'ribbon', 'badge', 'shield',
      'plaque', 'honour', 'glory', 'victory', 'winner', 'champion', 'title', 'reward', 'gold', 'silver',
      'bronze', 'star', 'laurel', 'first', 'best', 'win', 'won', 'race', 'contest', 'match',
      'game', 'team', 'cheer', 'fame',
    ],
  },
  {
    id: 'chest',
    name: 'The Chest',
    words: [
      'case', 'box', 'bag', 'trunk', 'chest', 'crate', 'basket', 'jar', 'bottle', 'can',
      'tin', 'pot', 'bowl', 'cupboard', 'drawer', 'shelf', 'pocket', 'purse', 'wallet', 'sack',
      'barrel', 'bucket', 'tray', 'envelope', 'parcel', 'package', 'carton', 'pack', 'hold', 'lid',
      'handle', 'lock', 'key',
    ],
  },
  {
    id: 'wardrobe',
    name: 'The Wardrobe',
    words: [
      'suit', 'coat', 'shirt', 'dress', 'skirt', 'jacket', 'hat', 'cap', 'scarf', 'glove',
      'shoe', 'boot', 'sock', 'trousers', 'jumper', 'vest', 'tie', 'belt', 'button', 'collar',
      'sleeve', 'wool', 'cotton', 'silk', 'linen', 'thread', 'needle', 'wear', 'worn', 'fold',
      'iron', 'tailor', 'cloak', 'gown', 'apron',
    ],
  },
  {
    id: 'rule',
    name: 'The Rule',
    words: [
      'big', 'small', 'large', 'little', 'tall', 'short', 'long', 'wide', 'narrow', 'thick',
      'thin', 'heavy', 'light', 'huge', 'tiny', 'fit', 'size', 'inch', 'foot', 'mile',
      'metre', 'weight', 'measure', 'half', 'whole', 'full', 'empty', 'deep', 'shallow', 'high',
      'low', 'more', 'less', 'most', 'least', 'enough', 'very', 'up', 'down',
    ],
  },
  {
    id: 'menagerie',
    name: 'The Menagerie',
    words: [
      'cat', 'dog', 'horse', 'cow', 'sheep', 'pig', 'goat', 'hen', 'duck', 'goose',
      'mouse', 'rat', 'rabbit', 'fox', 'wolf', 'bear', 'deer', 'lion', 'tiger', 'elephant',
      'monkey', 'bird', 'owl', 'crow', 'fish', 'frog', 'snake', 'bee', 'ant', 'spider',
      'whale', 'seal', 'bat', 'moth',
    ],
  },
  {
    id: 'hearth',
    name: 'The Hearth',
    words: [
      'home', 'house', 'room', 'door', 'window', 'wall', 'roof', 'floor', 'stair', 'garden',
      'kitchen', 'bed', 'chair', 'table', 'lamp', 'fire', 'mother', 'father', 'sister', 'brother',
      'child', 'baby', 'family', 'friend', 'aunt', 'uncle', 'son', 'daughter', 'wife', 'husband',
      'neighbour', 'guest',
    ],
  },
  {
    id: 'heart',
    name: 'The Heart',
    words: [
      'love', 'hate', 'joy', 'fear', 'anger', 'hope', 'grief', 'pride', 'shame', 'calm',
      'happy', 'sad', 'angry', 'afraid', 'glad', 'proud', 'kind', 'cruel', 'brave', 'shy',
      'lonely', 'jealous', 'tired', 'bored', 'surprise', 'worry', 'trust', 'doubt', 'wish', 'miss',
      'laugh', 'cry', 'smile', 'feel',
    ],
  },
  {
    id: 'sky',
    name: 'The Sky',
    words: [
      'rain', 'snow', 'wind', 'storm', 'cloud', 'sun', 'moon', 'fog', 'mist', 'frost',
      'ice', 'hail', 'thunder', 'lightning', 'rainbow', 'breeze', 'gale', 'shower', 'sunshine', 'weather',
      'hot', 'cold', 'warm', 'cool', 'wet', 'dry', 'damp', 'bright', 'dark', 'sky',
      'air',
    ],
  },
  {
    id: 'clock',
    name: 'The Clock',
    words: [
      'time', 'hour', 'minute', 'second', 'day', 'night', 'morning', 'evening', 'noon', 'midnight',
      'week', 'month', 'year', 'today', 'tomorrow', 'yesterday', 'now', 'then', 'soon', 'late',
      'early', 'always', 'never', 'often', 'before', 'after', 'while', 'until', 'since', 'ago',
      'spring', 'summer', 'autumn', 'winter', 'clock',
    ],
  },
  {
    id: 'road',
    name: 'The Road',
    words: [
      'road', 'street', 'path', 'bridge', 'trip', 'travel', 'walk', 'run', 'ride', 'drive',
      'fly', 'sail', 'swim', 'go', 'come', 'leave', 'arrive', 'return', 'car', 'bus',
      'train', 'ship', 'boat', 'plane', 'bicycle', 'ticket', 'map', 'station', 'harbour', 'north',
      'south', 'east', 'west', 'far', 'near',
    ],
  },
  {
    id: 'table',
    name: 'The Table',
    words: [
      'bread', 'butter', 'cheese', 'milk', 'egg', 'meat', 'apple', 'pear', 'plum', 'orange',
      'lemon', 'cake', 'pie', 'soup', 'salt', 'sugar', 'honey', 'tea', 'coffee', 'water',
      'wine', 'rice', 'potato', 'onion', 'bean', 'pea', 'jam', 'biscuit', 'breakfast', 'dinner',
      'supper', 'eat', 'drink', 'cook', 'plate',
    ],
  },
  {
    id: 'palette',
    name: 'The Palette',
    words: [
      'red', 'blue', 'green', 'yellow', 'purple', 'pink', 'brown', 'white', 'black', 'grey',
      'crimson', 'scarlet', 'indigo', 'violet', 'amber', 'ivory', 'cream', 'umber', 'ochre', 'olive',
      'navy', 'teal', 'rust', 'rose', 'lilac', 'colour', 'paint', 'ink', 'dye', 'shade',
      'tint', 'pale', 'vivid', 'dull',
    ],
  },
  {
    id: 'tally',
    name: 'The Tally',
    words: [
      'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
      'eleven', 'twelve', 'twenty', 'hundred', 'thousand', 'million', 'zero', 'dozen', 'third', 'fourth',
      'number', 'count', 'sum', 'add', 'total', 'pair', 'double', 'single', 'once', 'twice',
      'many', 'few', 'several', 'every',
    ],
  },
  {
    id: 'workshop',
    name: 'The Workshop',
    words: [
      'hammer', 'nail', 'saw', 'drill', 'screw', 'wrench', 'chisel', 'file', 'tool', 'wheel',
      'gear', 'lever', 'engine', 'machine', 'motor', 'pump', 'valve', 'pipe', 'wire', 'rope',
      'chain', 'hook', 'bolt', 'nut', 'plank', 'glue', 'brush', 'ladder', 'bench', 'build',
      'mend', 'make', 'press',
    ],
  },
  {
    id: 'centre',
    name: 'The Crowded Centre',
    words: [
      'the', 'The', 'a', 'an', 'it', 'is', 'was', 'be', 'are', 'in',
      'on', 'at', 'of', 'to', 'by', 'for', 'with', 'from', 'and', 'or',
      'but', 'not', 'no', 'so', 'if', 'as', 'that', 'this', 'what', 'which',
      'who', 'because', 'does', 'doesn', 'do', 'did', 'too', "'s", "'t", "'re",
      '.', ',', '?', '!',
    ],
  },
];

/** Every word on the chart, lower-cased, for quick lookup (the tokeniser keeps these whole). */
export const VOCAB_WORDS: ReadonlySet<string> = new Set(
  CONSTELLATIONS.flatMap((c) => c.words.map((w) => w.toLowerCase())),
);
