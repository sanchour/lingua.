// Builds the themed starter word lists for all ten languages from English Wiktionary's
// translation tables (one pass over the English Kaikki dump). build.ts puts them into each pack.
//   node scripts/lang-data/themes.ts   → scripts/.cache/themes.json
//
// Each concept is "word", "word|pos" or "word|pos|sense hint"; "shown=looked-up|pos" looks up a
// different headword (Wiktionary keeps the translations of "doctor" under "physician"). For every
// concept the translation table of its main meaning is used (the one covering the most languages, or
// the one whose sense matches the hint). Per language the translations keep Wiktionary's order (the
// usual word first), minus archaic/rare/slang ones, with regional words last (Brazilian first for
// Portuguese). build.ts then takes the first candidate its dictionary knows.
import { createReadStream, writeFileSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { STARTER_THEMES } from '../../src/core/lang/starter.ts';
import { CACHE_DIR, kaikkiFile, PACK_SOURCES } from './sources.ts';

/** [candidates as [word, gender tag, 0 · 1 regional · -1 hand-picked], meaning, part of speech] */
export type ThemeCandidates = [Array<[string, string, number]>, string, string];

const CONCEPTS: Record<string, string[]> = {
  basics: [
    'hello', 'goodbye', 'please', 'thank you', 'yes', 'no|particle', 'sorry|intj', 'excuse me', 'good morning', 'good evening',
    'good night', 'welcome|intj', 'how are you', 'what|pron', 'who|pron', 'where|adv', 'when|adv', 'why|adv', 'how|adv', 'which|det',
    'I|pron', 'you|pron', 'he|pron', 'she|pron', 'we|pron', 'they|pron', 'this|pron', 'that|pron', 'here|adv', 'there|adv',
    'now|adv', 'today|adv', 'tomorrow|adv', 'yesterday|adv', 'very|adv', 'not|adv', 'name|noun', 'friend|noun', 'everything|pron', 'nothing|pron',
  ],
  verbs: [
    'be|verb', 'have|verb', 'do|verb', 'go|verb', 'come|verb', 'say|verb', 'speak|verb', 'see|verb', 'look|verb', 'hear|verb',
    'listen|verb', 'know|verb', 'think|verb', 'want|verb', 'make|verb', 'give|verb', 'take|verb', 'eat|verb', 'drink|verb', 'sleep|verb',
    'live|verb', 'love|verb', 'like|verb', 'need|verb', 'work|verb', 'read|verb', 'write|verb', 'learn|verb', 'understand|verb', 'play|verb',
    'buy|verb', 'sell|verb', 'pay|verb', 'open|verb', 'close|verb', 'begin|verb', 'finish|verb', 'wait|verb', 'help|verb', 'find|verb',
    'lose|verb', 'put|verb', 'bring|verb', 'sit|verb', 'stand|verb', 'walk|verb', 'run|verb', 'swim|verb', 'drive|verb', 'travel|verb',
    'call|verb', 'ask|verb', 'answer|verb', 'remember|verb', 'forget|verb', 'try|verb', 'use|verb', 'leave|verb', 'arrive|verb', 'cook|verb',
  ],
  connectors: [
    'and|conj', 'or|conj', 'but|conj', 'because|conj', 'so|conj', 'if|conj', 'then|adv', 'also|adv', 'although|conj', 'however|adv',
    'while|conj', 'when|conj', 'before|prep', 'after|prep', 'until|prep', 'since|prep', 'therefore|adv', 'besides|adv', 'instead|adv', 'unless|conj',
    'maybe|adv', 'really|adv', 'still|adv', 'already|adv', 'only|adv', 'even|adv', 'almost|adv', 'again|adv', 'especially|adv', 'actually|adv',
    'finally|adv', 'of course', 'for example', 'at least', 'with|prep', 'without|prep', 'about|prep', 'between|prep', 'during|prep', 'against|prep',
  ],
  animals: [
    'animal|noun', 'dog|noun', 'cat|noun', 'bird|noun', 'fish|noun', 'horse|noun', 'cow|noun', 'pig|noun', 'sheep|noun', 'goat|noun',
    'chicken|noun', 'duck|noun', 'mouse|noun', 'rabbit|noun', 'bear|noun', 'wolf|noun', 'fox|noun', 'lion|noun', 'tiger|noun', 'elephant|noun',
    'monkey|noun', 'snake|noun', 'frog|noun', 'turtle|noun', 'bee|noun', 'butterfly|noun', 'ant|noun', 'spider|noun', 'owl|noun', 'eagle|noun',
    'whale|noun', 'dolphin|noun', 'shark|noun', 'deer|noun', 'squirrel|noun', 'insect|noun', 'donkey|noun', 'camel|noun', 'giraffe|noun', 'hedgehog|noun',
  ],
  food: [
    'food|noun', 'water|noun', 'bread|noun', 'milk|noun', 'coffee|noun', 'tea|noun', 'wine|noun', 'beer|noun', 'juice|noun', 'egg|noun',
    'cheese|noun', 'butter|noun', 'meat|noun', 'rice|noun', 'soup|noun', 'salt|noun', 'sugar|noun', 'apple|noun', 'orange|noun|fruit', 'banana|noun',
    'strawberry|noun', 'grape|noun', 'lemon|noun', 'potato|noun', 'tomato|noun', 'onion|noun', 'carrot|noun', 'vegetable|noun', 'fruit|noun', 'cake|noun',
    'chocolate|noun', 'ice cream|noun', 'breakfast|noun', 'lunch|noun', 'dinner|noun', 'restaurant|noun', 'knife|noun', 'fork|noun', 'spoon|noun', 'plate|noun',
    'cup|noun', 'bottle|noun', 'hungry|adj', 'thirsty|adj', 'delicious|adj', 'sweet|adj', 'salad|noun', 'oil|noun', 'honey|noun', 'pepper|noun',
  ],
  people: [
    'family|noun', 'mother|noun', 'father|noun', 'parent|noun', 'son|noun', 'daughter|noun', 'brother|noun', 'sister|noun', 'grandmother|noun', 'grandfather|noun',
    'child|noun', 'baby|noun', 'husband|noun', 'wife|noun', 'uncle|noun', 'aunt|noun', 'cousin|noun', 'man|noun', 'woman|noun', 'boy|noun',
    'girl|noun', 'person|noun', 'people|noun', 'neighbor=neighbour|noun', 'guest|noun', 'boyfriend|noun', 'girlfriend|noun', 'grandson|noun', 'granddaughter|noun', 'wedding|noun',
    'birthday|noun', 'age|noun', 'adult|noun', 'twin|noun', 'stranger|noun',
  ],
  home: [
    'house|noun', 'home|noun', 'room|noun', 'kitchen|noun', 'bedroom|noun', 'bathroom|noun', 'door|noun', 'window|noun', 'wall|noun', 'floor|noun',
    'stairs|noun', 'table|noun', 'chair|noun', 'bed|noun', 'sofa|noun', 'lamp|noun', 'key|noun', 'clock|noun', 'mirror|noun', 'television|noun',
    'telephone|noun', 'computer|noun', 'book|noun', 'pen|noun', 'paper|noun', 'bag|noun', 'box|noun', 'towel|noun', 'soap|noun', 'umbrella|noun',
    'wallet|noun', 'money|noun', 'shower|noun', 'garden|noun', 'refrigerator|noun', 'blanket|noun', 'pillow|noun', 'clothes|noun', 'shirt|noun', 'trousers',
    'shoe|noun', 'dress|noun', 'coat|noun', 'hat|noun', 'sock|noun', 'glasses', 'toothbrush|noun', 'roof|noun', 'picture|noun', 'candle|noun',
  ],
  time: [
    'zero|num', 'one|num', 'two|num', 'three|num', 'four|num', 'five|num', 'six|num', 'seven|num', 'eight|num', 'nine|num',
    'ten|num', 'eleven|num', 'twelve|num', 'fifteen|num', 'twenty|num', 'thirty|num', 'fifty|num', 'hundred|num', 'thousand|num', 'million|num',
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'January', 'February', 'March|name',
    'April', 'May|name', 'June', 'July', 'August|name', 'September', 'October', 'November', 'December', 'day|noun',
    'week|noun', 'month|noun', 'year|noun', 'hour|noun', 'minute|noun', 'second|noun|unit', 'morning|noun', 'afternoon|noun', 'evening|noun', 'night|noun',
    'time|noun', 'weekend|noun', 'spring|noun|season', 'summer|noun', 'autumn|noun', 'winter|noun', 'early|adv', 'late|adv', 'always|adv', 'never|adv',
  ],
  describe: [
    'red|adj', 'blue|adj', 'green|adj', 'yellow|adj', 'black|adj', 'white|adj', 'grey=gray|adj', 'brown|adj', 'pink|adj', 'purple|adj',
    'orange|noun|colour', 'big|adj', 'small|adj', 'long|adj', 'short|adj', 'tall|adj', 'new|adj', 'old|adj', 'young|adj', 'good|adj',
    'bad|adj', 'beautiful|adj', 'ugly|adj', 'hot|adj', 'cold|adj', 'warm|adj', 'easy|adj', 'difficult|adj', 'cheap|adj', 'expensive|adj',
    'fast|adj', 'slow|adj', 'rich|adj', 'poor|adj', 'clean|adj', 'dirty|adj', 'full|adj', 'empty|adj', 'heavy|adj', 'strong|adj',
    'weak|adj', 'high|adj', 'low|adj', 'wrong|adj', 'important|adj', 'interesting|adj', 'quiet|adj', 'loud|adj', 'dark|adj', 'bright|adj',
  ],
  body: [
    'body|noun', 'head|noun', 'face|noun', 'eye|noun', 'ear|noun', 'nose|noun', 'mouth|noun', 'tooth|noun', 'hair|noun', 'neck|noun',
    'shoulder|noun', 'arm|noun', 'hand|noun', 'finger|noun', 'leg|noun', 'knee|noun', 'foot|noun', 'back|noun', 'stomach|noun', 'heart|noun',
    'blood|noun', 'skin|noun', 'bone|noun', 'doctor=physician|noun', 'hospital|noun', 'medicine|noun', 'pain|noun', 'ill|adj', 'healthy|adj', 'fever|noun',
    'headache|noun', 'pharmacy|noun', 'nurse|noun', 'health|noun', 'tired|adj', 'hurt|verb', 'breathe|verb', 'tongue|noun', 'lip|noun', 'brain|noun',
  ],
  travel: [
    'city|noun', 'town|noun', 'village|noun', 'country|noun', 'street|noun', 'road|noun', 'bridge|noun', 'station|noun', 'airport|noun', 'train|noun',
    'bus|noun', 'car|noun', 'airplane|noun', 'bicycle|noun', 'boat|noun', 'ship|noun', 'ticket|noun', 'passport|noun', 'hotel|noun', 'map|noun',
    'left|adj', 'right|adj|direction', 'north|noun', 'south|noun', 'east|noun', 'west|noun', 'beach|noun', 'mountain|noun', 'river|noun', 'sea|noun',
    'lake|noun', 'island|noun', 'shop|noun', 'market|noun', 'church|noun', 'museum|noun', 'park|noun', 'police|noun', 'suitcase|noun', 'trip|noun',
    'vacation|noun', 'border|noun', 'tourist|noun', 'square|noun|open space', 'corner|noun',
  ],
  nature: [
    'weather|noun', 'sun|noun', 'moon|noun', 'star|noun', 'sky|noun', 'cloud|noun', 'rain|noun', 'snow|noun', 'wind|noun', 'storm|noun',
    'fog|noun', 'ice|noun', 'fire|noun', 'air|noun', 'tree|noun', 'flower|noun', 'grass|noun', 'leaf|noun', 'forest|noun', 'stone|noun',
    'sand|noun', 'temperature|noun', 'rainbow|noun', 'thunder|noun', 'lightning|noun', 'nature|noun', 'plant|noun', 'season|noun', 'field|noun', 'hill|noun',
    'desert|noun', 'earth|noun', 'sunset|noun', 'wave|noun', 'shadow|noun', 'heat|noun', 'world|noun', 'ocean|noun', 'valley|noun', 'mud|noun',
  ],
  feelings: [
    'happy|adj', 'sad|adj', 'angry|adj', 'afraid|adj', 'bored|adj', 'surprised|adj', 'worried|adj', 'calm|adj', 'nervous|adj', 'proud|adj',
    'jealous|adj', 'lonely|adj', 'love|noun', 'hope|noun', 'fear|noun', 'joy|noun', 'anger|noun', 'sadness|noun', 'laugh|verb', 'cry|verb',
    'smile|noun', 'kiss|noun', 'hug|noun', 'feeling|noun', 'mood|noun', 'shame|noun', 'trust|noun', 'miss|verb', 'hate|verb', 'enjoy|verb',
    'grateful|adj', 'excited|adj', 'embarrassed|adj', 'curious|adj', 'shy|adj',
  ],
  work: [
    'school|noun', 'university|noun', 'student|noun', 'teacher|noun', 'lesson|noun', 'homework|noun', 'exam=examination|noun', 'question|noun', 'answer|noun', 'word|noun',
    'sentence|noun', 'language|noun', 'dictionary|noun', 'notebook|noun', 'pencil|noun', 'desk|noun', 'work|noun', 'job|noun', 'office|noun', 'company|noun',
    'boss|noun', 'colleague|noun', 'meeting|noun', 'salary|noun', 'email|noun', 'project|noun', 'idea|noun', 'problem|noun', 'example|noun', 'study|verb',
    'teach|verb', 'mistake|noun', 'library|noun', 'class|noun', 'grammar|noun', 'subject|noun', 'knowledge|noun', 'skill|noun', 'interview|noun', 'customer|noun',
  ],
  // The larger Discover (5.1-3b): more everyday themes, some fun ones and two for grammar.
  clothes: [
    'clothes|noun', 'shirt|noun', 'T-shirt|noun', 'jeans', 'skirt|noun', 'dress|noun', 'jacket|noun', 'coat|noun', 'sweater|noun',
    'suit|noun|clothes', 'shoe|noun', 'boot|noun', 'sandal|noun', 'sock|noun', 'hat|noun', 'cap|noun', 'scarf|noun', 'glove|noun', 'belt|noun',
    'tie=necktie|noun', 'pocket|noun', 'button|noun', 'underwear|noun', 'pyjamas=pajamas|noun', 'raincoat|noun', 'swimsuit|noun', 'uniform|noun', 'size|noun',
    'cotton|noun', 'wool|noun', 'leather|noun', 'silk|noun', 'fashion|noun', 'necklace|noun', 'earring|noun', 'handbag|noun', 'wear|verb', 'put on|verb|to don',
  ],
  city: [
    'building|noun', 'apartment|noun', 'neighborhood|noun|area near', 'traffic|noun', 'traffic light|noun', 'crossroads|noun', 'bank|noun|institution', 'post office|noun', 'bakery|noun', 'supermarket|noun',
    'cinema|noun', 'theatre=theater|noun', 'tower|noun', 'cathedral|noun', 'town hall|noun', 'fountain|noun', 'statue|noun', 'avenue|noun', 'district|noun', 'metro=subway|noun|underground railway',
    'tram|noun', 'taxi|noun', 'bus stop|noun', 'police station|noun', 'factory|noun', 'skyscraper|noun', 'crowd|noun', 'noise|noun', 'pedestrian|noun', 'citizen|noun',
    'mayor|noun', 'zoo|noun', 'playground|noun', 'bench|noun', 'pavement|noun', 'garage|noun', 'street|noun', 'square|noun|open space', 'park|noun', 'city|noun',
  ],
  shopping: [
    'shopping|noun', 'shop|noun', 'price|noun', 'cash|noun', 'credit card|noun', 'coin|noun', 'receipt|noun', 'discount|noun', 'sale|noun', 'cashier|noun',
    'basket|noun', 'shelf|noun', 'queue|noun', 'gift|noun', 'spend|verb', 'cost|verb', 'choose|verb', 'closed|adj', 'free|adv|pay', 'bargain|noun',
    'brand|noun', 'quality|noun', 'product|noun', 'butcher|noun', 'bookshop|noun', 'mall|noun', 'department store|noun', 'kilogram|noun', 'litre|noun', 'piece|noun',
    'packet|noun', 'jar|noun', 'euro|noun', 'dollar|noun', 'how much', 'buy|verb', 'pay|verb', 'cheap|adj', 'expensive|adj', 'market|noun',
  ],
  health: [
    'health|noun', 'doctor=physician|noun', 'dentist|noun', 'ambulance|noun', 'patient|noun', 'appointment|noun', 'prescription|noun', 'pill|noun', 'injection|noun', 'vaccine|noun',
    'illness|noun', 'disease|noun', 'flu=influenza|noun', 'cold|noun|illness', 'cough|noun', 'wound|noun', 'allergy|noun', 'diet|noun', 'exercise|noun', 'rest|noun|relief',
    'stress|noun', 'heart attack|noun', 'cancer|noun|disease', 'emergency|noun', 'bandage|noun', 'thermometer|noun', 'symptom|noun', 'treatment|noun', 'recover|verb', 'sneeze|verb',
    'vomit|verb', 'pregnant|adj', 'sick|adj', 'dizzy|adj', 'injury|noun', 'clinic|noun', 'virus|noun', 'weight|noun', 'smoke|verb', 'sleep|noun',
  ],
  sport: [
    'sport|noun', 'game|noun', 'team|noun', 'player|noun', 'ball|noun', 'competition|noun', 'win|verb', 'tennis|noun', 'basketball|noun', 'volleyball|noun',
    'swimming|noun', 'cycling|noun', 'skiing|noun', 'golf|noun', 'boxing|noun', 'athletics|noun', 'gym|noun', 'race|noun|contest', 'medal|noun', 'champion|noun',
    'trophy|noun', 'jump|verb', 'throw|verb', 'catch|verb', 'climb|verb', 'ride|verb', 'skate|verb', 'hiking|noun', 'yoga|noun', 'victory|noun',
    'defeat|noun', 'tournament|noun', 'stadium|noun', 'run|verb', 'swim|verb', 'fast|adj', 'strong|adj', 'tired|adj',
  ],
  hobbies: [
    'hobby|noun', 'music|noun', 'song|noun', 'guitar|noun', 'piano|noun', 'drum|noun', 'violin|noun', 'sing|verb', 'dance|verb', 'paint|verb',
    'drawing|noun', 'painting|noun', 'photography|noun', 'camera|noun', 'photograph|noun', 'chess|noun', 'puzzle|noun', 'video game|noun', 'novel|noun', 'poem|noun',
    'gardening|noun', 'knit|verb', 'sew|verb', 'cooking|noun', 'fishing|noun', 'camping|noun', 'collect|verb', 'concert|noun', 'board game|noun', 'toy|noun',
    'relax|verb', 'favourite|adj', 'fun|noun', 'boring|adj', 'free time|noun', 'read|verb', 'play|verb', 'enjoy|verb',
  ],
  tech: [
    'technology|noun', 'computer|noun', 'laptop|noun', 'smartphone|noun', 'mobile phone|noun', 'screen|noun', 'keyboard|noun', 'mouse|noun|computing', 'Internet', 'website|noun',
    'app|noun', 'password|noun', 'email|noun', 'message|noun', 'printer|noun', 'battery|noun', 'charger|noun', 'cable|noun', 'robot|noun', 'software|noun',
    'download|verb', 'upload|verb', 'click|verb', 'delete|verb', 'search|verb', 'online|adj', 'digital|adj', 'electricity|noun', 'machine|noun', 'video|noun',
    'network|noun', 'data|noun', 'user|noun', 'radio|noun', 'headphones', 'microphone|noun', 'loudspeaker|noun', 'artificial intelligence|noun', 'television|noun', 'telephone|noun',
  ],
  kitchen: [
    'kitchen|noun', 'pan|noun', 'pot|noun', 'oven|noun', 'stove|noun', 'microwave|noun', 'refrigerator|noun', 'freezer|noun', 'sink|noun', 'tap=faucet|noun',
    'dishwasher|noun', 'kettle|noun', 'bowl|noun', 'glass|noun|vessel', 'jug|noun', 'teapot|noun', 'napkin|noun', 'recipe|noun', 'ingredient|noun', 'flour|noun',
    'garlic|noun', 'cook|verb', 'bake|verb', 'boil|verb', 'fry|verb', 'cut|verb', 'mix|verb', 'peel|verb', 'stir|verb', 'taste|verb',
    'pour|verb', 'wash|verb', 'raw|adj', 'fresh|adj', 'spicy|adj', 'sour|adj', 'bitter|adj', 'salty|adj', 'lid|noun', 'cupboard|noun',
  ],
  directions: [
    'straight|adv', 'turn|verb', 'cross|verb', 'follow|verb', 'stop|verb', 'continue|verb', 'near|prep', 'far|adv', 'next to', 'opposite|prep',
    'behind|prep', 'in front of', 'along|prep', 'through|prep', 'towards=toward|prep|direction', 'past|prep', 'up|adv', 'down|adv', 'above|prep', 'below|prep',
    'inside|adv', 'outside|adv', 'upstairs|adv', 'downstairs|adv', 'roundabout|noun', 'direction|noun', 'route|noun', 'address|noun', 'distance|noun', 'kilometre|noun',
    'entrance|noun', 'exit|noun', 'lost|adj', 'show|verb', 'map|noun', 'corner|noun', 'left|adj', 'right|adj|direction', 'here|adv', 'there|adv',
  ],
  restaurant: [
    'restaurant|noun', 'waiter|noun', 'menu|noun', 'bill|noun|invoice', 'tip|noun|appreciation', 'reservation|noun', 'book|verb|reserve', 'order|verb|request', 'dessert|noun',
    'main course|noun', 'dish|noun|type of food', 'drink|noun', 'steak|noun', 'pasta|noun', 'pizza|noun', 'sauce|noun', 'vegetarian|noun', 'chef|noun', 'portion|noun',
    'taste|noun', 'cheers|intj', 'toilet|noun', 'terrace|noun', 'seafood|noun', 'snack|noun', 'meal|noun', 'appetizer|noun', 'service|noun',
    'table|noun', 'wine|noun', 'water|noun', 'bread|noun', 'salad|noun', 'soup|noun', 'delicious|adj', 'hungry|adj',
  ],
  hotel: [
    'hotel|noun', 'reception|noun', 'receptionist|noun', 'lift|noun|vertically transporting', 'luggage|noun', 'suitcase|noun', 'stay|verb', 'booking|noun', 'balcony|noun', 'view|noun',
    'swimming pool|noun', 'air conditioning|noun', 'heating|noun', 'hostel|noun', 'campsite|noun', 'tent|noun', 'noisy|adj', 'comfortable|adj', 'available|adj', 'wake up|verb',
    'alarm clock|noun', 'bathtub|noun', 'shampoo|noun', 'lobby|noun', 'cancel|verb', 'arrival|noun', 'departure|noun', 'room service|noun', 'hairdryer|noun', 'staff|noun|employees',
    'complaint|noun', 'room|noun', 'key|noun', 'bed|noun', 'towel|noun', 'passport|noun', 'breakfast|noun', 'night|noun', 'guest|noun',
  ],
  space: [
    'space=outer space|noun', 'planet|noun', 'galaxy|noun', 'universe|noun', 'astronaut|noun', 'rocket|noun', 'spaceship|noun', 'satellite|noun', 'telescope|noun', 'comet|noun',
    'asteroid|noun', 'meteor|noun', 'orbit|noun', 'gravity|noun', 'alien|noun|non-Earth', 'black hole|noun', 'Mars', 'Venus', 'Jupiter', 'Saturn',
    'eclipse|noun', 'constellation|noun', 'astronomy|noun', 'launch|verb', 'land|verb', 'float|verb', 'cosmos|noun', 'space station|noun', 'crater|noun',
    'atmosphere|noun', 'oxygen|noun', 'Milky Way', 'sun|noun', 'moon|noun', 'star|noun', 'sky|noun', 'earth|noun',
  ],
  sea: [
    'sea|noun', 'coast|noun', 'shore|noun', 'harbor|noun', 'lighthouse|noun', 'sailor|noun', 'sail|noun', 'anchor|noun', 'seashell|noun', 'crab|noun',
    'octopus|noun', 'jellyfish|noun', 'seal|noun|pinniped', 'seagull=gull|noun', 'coral|noun', 'seaweed|noun', 'starfish|noun', 'tide|noun', 'dive|verb', 'sink|verb',
    'fisherman|noun', 'whale|noun', 'dolphin|noun', 'shark|noun', 'pirate|noun', 'treasure|noun', 'submarine|noun', 'deep|adj', 'shallow|adj', 'cliff|noun',
    'bay|noun|water', 'sunscreen|noun', 'lifeguard|noun', 'sandcastle|noun', 'sunbathe|verb', 'wave|noun', 'beach|noun', 'island|noun', 'boat|noun', 'sand|noun',
  ],
  fantasy: [
    'fairy tale|noun', 'once upon a time', 'king|noun', 'queen|noun', 'prince|noun', 'princess|noun', 'castle|noun', 'dragon|noun', 'witch|noun', 'wizard|noun',
    'fairy|noun', 'giant|noun', 'dwarf|noun', 'elf|noun', 'ghost|noun', 'monster|noun', 'magic|noun', 'spell|noun|magic', 'magic wand|noun', 'sword|noun',
    'knight|noun', 'crown|noun', 'mermaid|noun', 'unicorn|noun', 'goblin|noun', 'vampire|noun', 'curse|noun', 'kingdom|noun', 'hero', 'villain|noun',
    'adventure|noun', 'legend|noun', 'myth|noun', 'brave|adj', 'evil|adj', 'throne|noun', 'cave|noun', 'potion|noun', 'forest|noun', 'fly|verb',
  ],
  love: [
    'love|noun', 'romance|noun', 'couple|noun', 'partner|noun', 'date|noun|pre-arranged social meeting', 'fall in love|verb', 'flirt|verb', 'marry|verb', 'engaged|adj', 'divorce|noun',
    'darling|noun', 'sweetheart|noun', 'lover|noun', 'crush|noun|infatuation', 'single|adj|married', 'married|adj', 'relationship|noun', 'anniversary|noun', 'romantic|adj', 'together|adv',
    'I love you', 'break up|verb', 'faithful|adj', 'kiss|verb', 'honeymoon|noun', 'bride|noun', 'groom=bridegroom|noun', 'charming|adj', 'attractive|adj', 'handsome|adj',
    'heartbreak|noun', 'soulmate|noun', 'passion|noun', 'desire|noun', 'rose|noun|flower', 'hug|noun', 'jealous|adj', 'boyfriend|noun', 'girlfriend|noun', 'wedding|noun',
  ],
  compliments: [
    'compliment|noun', 'pretty|adj', 'cute|adj', 'clever|adj', 'intelligent|adj', 'kind|adj', 'funny|adj', 'wonderful|adj', 'amazing|adj', 'excellent|adj',
    'perfect|adj', 'nice|adj', 'lovely|adj', 'elegant|adj', 'talented|adj', 'generous|adj', 'patient|adj', 'polite|adj', 'gorgeous|adj', 'well done',
    'congratulations', 'bravo', 'impressive|adj', 'creative|adj', 'friendly|adj', 'honest|adj', 'helpful|adj', 'brilliant|adj', 'fantastic|adj', 'magnificent|adj',
    'stylish|adj', 'admire|verb', 'praise|verb', 'beautiful|adj', 'brave|adj', 'strong|adj',
  ],
  film: [
    'film=movie|noun', 'actor|noun', 'actress|noun', 'film director|noun', 'popcorn|noun', 'seat|noun', 'scene|noun', 'story|noun', 'ending|noun', 'subtitle|noun',
    'trailer|noun|film', 'comedy|noun', 'drama|noun', 'horror|noun', 'thriller|noun', 'cartoon|noun', 'documentary|noun', 'episode|noun', 'star|noun|celebrity', 'sequel|noun',
    'premiere|noun', 'review|noun', 'watch|verb', 'scary|adj', 'exciting|adj', 'remote control|noun', 'role|noun', 'soundtrack|noun', 'spoiler|noun', 'cinema|noun',
    'screen|noun', 'ticket|noun', 'sofa|noun', 'laugh|verb', 'cry|verb', 'boring|adj',
  ],
  football: [
    'football|noun|association', 'goal|noun|scored', 'goalkeeper|noun', 'referee|noun', 'penalty kick|noun', 'defender|noun', 'kick|verb', 'score|verb', 'shoot|verb', 'foul|noun',
    'yellow card|noun', 'red card|noun', 'offside|adj', 'half-time|noun', 'pitch|noun|soccer', 'fan|noun|admirer', 'supporter|noun', 'cup|noun|trophy', 'league|noun', 'championship|noun',
    'whistle|noun', 'coach|noun|trainer', 'captain|noun', 'substitute|noun', 'stadium|noun', 'team|noun', 'player|noun', 'ball|noun', 'match|noun|sporting event', 'win|verb',
    'lose|verb', 'dribble|verb', 'shirt|noun', 'victory|noun',
  ],
  cafe: [
    'café|noun', 'coffee|noun', 'espresso|noun', 'cappuccino|noun', 'hot chocolate|noun', 'tea|noun', 'mug|noun', 'saucer|noun', 'cream|noun', 'croissant|noun',
    'cookie|noun', 'pastry|noun', 'sandwich|noun', 'toast|noun|bread', 'jam|noun|fruit', 'barista|noun', 'cosy|adj', 'newspaper|noun', 'chat|verb', 'meet|verb',
    'cinnamon|noun', 'vanilla|noun', 'caramel|noun', 'pie|noun', 'waffle|noun', 'pancake|noun', 'lemonade|noun', 'cake|noun', 'milk|noun',
    'sugar|noun', 'cup|noun', 'breakfast|noun', 'menu|noun', 'muffin|noun', 'honey|noun',
  ],
  festivals: [
    'festival|noun', 'party|noun|social', 'celebration|noun', 'holiday|noun', 'Christmas', 'Easter', 'New Year', 'gift|noun', 'parade|noun', 'firework|noun',
    'carnival|noun', 'costume|noun', 'mask|noun', 'decoration|noun', 'balloon|noun', 'lantern|noun', 'feast|noun', 'tradition|noun', 'celebrate|verb', 'invite|verb',
    'happy birthday', 'merry Christmas', 'happy New Year', 'flag|noun', 'wish|noun', 'Christmas tree|noun', 'pumpkin|noun', 'bonfire|noun', 'confetti|noun', 'midnight|noun',
    'birthday|noun', 'music|noun', 'dance|verb', 'candle|noun', 'guest|noun', 'cake|noun',
  ],
  exclamations: [
    'wow', 'oh', 'oops', 'ouch', 'hooray', 'yuck', 'help|intj', 'come on', 'of course', 'no way',
    'oh my God', 'hey', 'bye', 'well|intj', 'OK', 'what a pity', 'never mind', 'good luck', 'bless you', 'cheers|intj',
    'watch out', 'phew', 'alas', 'ugh', 'yay', 'aha', 'thank God', "I don't know", "let's go", 'see you later',
    'no problem', "you're welcome", 'take care', 'have a nice day', 'excuse me', 'bon appétit',
  ],
  questions: [
    'what|pron', 'who|pron', 'whom|pron', 'whose|pron', 'which|det', 'where|adv', 'when|adv', 'why|adv', 'how|adv', 'how much',
    'how many', 'how long', 'how old', 'how often', 'what time', 'where from',
  ],
};

interface Concept {
  theme: string;
  /** Shown to the learner. */
  word: string;
  /** Looked up in Wiktionary. */
  lookup: string;
  pos?: string;
  hint?: string;
}
interface Translation {
  word?: string;
  sense?: string;
  tags?: string[];
  lang_code?: string;
  code?: string;
}
interface Entry {
  word: string;
  pos: string;
  translations?: Translation[];
  senses?: { glosses?: string[]; translations?: Translation[] }[];
}

const AVOID = new Set(['obsolete', 'archaic', 'dated', 'rare', 'poetic', 'dialectal', 'slang', 'vulgar', 'derogatory', 'offensive', 'literary', 'regional', 'Ancient', 'Katharevousa', 'historical', 'humorous', 'childish', 'euphemistic', 'figuratively']);
const AVOID_NOTE = /\((?:disused|archaic|obsolete|dated|rare|slang|dialectal)\)/i;
const TARGETS = PACK_SOURCES.map((s) => s.code).filter((c) => c !== 'en');
/** Translation-table codes that aren't the pack's own: Mandarin is "cmn", Norwegian Bokmål "nb" or "no". */
const TABLE_CODES: Record<string, string[]> = { zh: ['cmn', 'zh'], nb: ['nb', 'no'], yue: ['yue', 'cmn', 'zh'], sh: ['sh', 'hr', 'sr', 'bs'] };
const inLanguage = (t: Translation, lang: string) => (TABLE_CODES[lang] ?? [lang]).includes(t.lang_code ?? t.code ?? '');
/** Mandarin tables give each word in Traditional and in Simplified characters; packs use Simplified. */
const TRADITIONAL = /Traditional/;
const HAN_ONLY = /^[\p{Script=Han}\s·，]+$/u;
const MAX_CANDIDATES = 4;

const concepts: Concept[] = Object.entries(CONCEPTS).flatMap(([theme, list]) =>
  list.map((spec) => {
    const [names, pos, hint] = spec.split('|');
    const [word, lookup = word] = names.split('=');
    return { theme, word, lookup, pos, hint };
  }),
);
const byWord = new Map<string, Concept[]>();
for (const c of concepts) byWord.set(c.lookup, [...(byWord.get(c.lookup) ?? []), c]);
for (const theme of Object.keys(CONCEPTS)) if (!STARTER_THEMES.some((t) => t.id === theme)) throw new Error(`Unknown theme ${theme}`);

/** Hand-checked picks where Wiktionary's first translation is regional, rare or another sense. */
const OVERRIDES: Record<string, string> = {
  'es:banana': 'plátano', 'es:lunch': 'almuerzo', 'es:cake': 'pastel', 'es:poor': 'pobre', 'es:potato': 'patata', 'es:food': 'comida',
  'ru:goodbye': 'до свида́ния', 'ru:chicken': 'ку́рица', 'ru:fruit': 'фрукт',
  'el:bored': 'βαριεστημένος', 'el:food': 'φαγητό', 'el:fruit': 'φρούτο',
  'pt:thank you': 'obrigado', 'pt:lemon': 'limão', 'pt:butterfly': 'borboleta',
  'hu:fruit': 'gyümölcs',
  // The larger Discover (5.1-3b), checked for Spanish.
  'es:sock': 'calcetín', 'es:apartment': 'apartamento', 'es:bank': 'banco', 'es:playground': 'parque infantil', 'es:handbag': 'bolso', 'es:puzzle': 'rompecabezas',
  'es:collect': 'coleccionar', 'es:delete': 'borrar', 'es:search': 'buscar', 'es:microwave': 'microondas', 'es:refrigerator': 'nevera', 'es:kettle': 'hervidor',
  'es:pour': 'verter', 'es:taste|verb': 'probar', 'es:sink|noun': 'fregadero', 'es:next to': 'junto a', 'es:book|verb': 'reservar', 'es:order': 'pedir', 'es:dessert': 'postre',
  'es:stay': 'quedarse', 'es:rocket': 'cohete', 'es:jellyfish': 'medusa', 'es:wave': 'ola', 'es:mermaid': 'sirena', 'es:brave': 'valiente', 'es:popcorn': 'palomitas',
  'es:ending': 'final', 'es:cartoon': 'dibujos animados', 'es:remote control': 'mando a distancia', 'es:pancake': 'tortita', 'es:muffin': 'magdalena',
  'es:costume': 'disfraz', 'es:hey': 'oye', 'es:nice': 'agradable', 'es:cute': 'adorable', 'es:pretty': 'bonito', 'es:darling': 'cariño', 'es:attractive': 'atractivo',
  'es:comfortable': 'cómodo', 'es:shopping': 'compras', 'es:supporter': 'aficionado', 'es:catch': 'atrapar',
  'fr:I love you': 'je t’aime',
  'de:hostel': 'Jugendherberge', 'de:cancel': 'stornieren', 'de:complaint': 'Beschwerde', 'de:kettle': 'Wasserkocher', 'de:cut|verb': 'schneiden',
  'zh:key': '钥匙', 'zh:balcony': '阳台', 'zh:stay': '住', 'zh:hotel': '酒店', 'zh:air conditioning': '空调', 'zh:room': '房间',
};

/** "до свида́ния or до свида́нья" → first; "but see X" → X; "humor m ánimo" → humor; "(…)" dropped. */
const clean = (w: string) =>
  w
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/^but see\s+/i, '')
    .replace(/\s+or\s+.*$/, '')
    .replace(/^(\S+)\s[mfn]\s.*$/, '$1')
    .replace(/\s[mfn]$/, '')
    .replace(/\s+/g, ' ')
    .trim();
const isRegional = (lang: string, tags: string[] = []) => {
  const regions = tags.filter((t) => /^[A-Z]/.test(t));
  return regions.length > 0 && !(lang === 'pt' && regions.includes('Brazil'));
};

/** All translation groups of the matching entries: sense → translations. */
const found = new Map<Concept, Map<string, Translation[]>>();
const englishSense = new Map<Concept, string>();

async function* lines(): AsyncGenerator<string> {
  const stream = createReadStream(kaikkiFile(PACK_SOURCES[0])).pipe(createGunzip());
  stream.setEncoding('utf8');
  let buffer = '';
  for await (const chunk of stream as AsyncIterable<string>) {
    buffer += chunk;
    let at: number;
    while ((at = buffer.indexOf('\n')) >= 0) {
      yield buffer.slice(0, at);
      buffer = buffer.slice(at + 1);
    }
  }
}

const started = Date.now();
let count = 0;
const quick = new RegExp(`"word": "(${[...byWord.keys()].map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})"`);
for await (const line of lines()) {
  if (++count % 250_000 === 0) console.log(`  en: ${count.toLocaleString()} entries…`);
  if (!quick.test(line)) continue;
  let entry: Entry;
  try {
    entry = JSON.parse(line) as Entry;
  } catch {
    continue;
  }
  for (const concept of byWord.get(entry.word) ?? []) {
    if (concept.pos && concept.pos !== entry.pos) continue;
    const groups = found.get(concept) ?? new Map<string, Translation[]>();
    for (const t of [...(entry.translations ?? []), ...(entry.senses ?? []).flatMap((s) => s.translations ?? [])]) {
      const sense = t.sense ?? '';
      groups.set(sense, [...(groups.get(sense) ?? []), t]);
    }
    found.set(concept, groups);
    if (!englishSense.has(concept) && entry.senses?.[0]?.glosses?.[0]) englishSense.set(concept, entry.senses[0].glosses[0]);
  }
}

const out: Record<string, Record<string, ThemeCandidates[]>> = { en: {} };
for (const lang of TARGETS) out[lang] = {};
const warnings: string[] = [];

for (const concept of concepts) {
  const groups = [...(found.get(concept) ?? new Map<string, Translation[]>()).entries()];
  const languagesIn = (list: Translation[]) => new Set(list.map((t) => t.lang_code ?? t.code)).size;
  let group = concept.hint ? groups.find(([sense]) => sense.toLowerCase().includes(concept.hint!.toLowerCase())) : undefined;
  if (concept.hint && !group) warnings.push(`hint "${concept.hint}" not found for ${concept.word} (${groups.map(([s]) => s).join(' / ')})`);
  group ??= groups.sort((a, b) => languagesIn(b[1]) - languagesIn(a[1]))[0];
  if (!group) {
    warnings.push(`no translations for ${concept.lookup}${concept.pos ? ` (${concept.pos})` : ''}`);
    continue;
  }
  const [sense, translations] = group;
  const pos = concept.pos ?? '';
  const meaning = pos === 'verb' ? `to ${concept.word}` : concept.word;

  // English learners get the word itself with the sense as its meaning.
  const englishMeaning = (sense || englishSense.get(concept) || concept.word).replace(/\s+—.*$/, '').replace(/\s*\(.*?\)\s*$/, '');
  (out.en[concept.theme] ??= []).push([[[concept.word, '', 0]], englishMeaning, pos]);

  for (const lang of TARGETS) {
    const gender = (tags: string[] = []) => (pos === 'noun' ? (tags.find((t) => ['masculine', 'feminine', 'neuter', 'common'].includes(t))?.[0] ?? '') : '');
    const candidates: Array<[string, string, number]> = translations
      .map((t, i) => ({ t, i, word: clean(t.word ?? ''), regional: isRegional(lang, t.tags) ? 1 : 0 }))
      // Cantonese is written in Traditional characters, Mandarin (here) in Simplified ones.
      .filter(({ t }) => (lang !== 'zh' || !t.tags?.some((tag) => TRADITIONAL.test(tag))) && (lang !== 'yue' || !t.tags?.some((tag) => /Simplified/.test(tag))))
      // Chinese tables also hold Dungan (Mandarin in Cyrillic) and romanized lines: characters only.
      .filter(({ word }) => (lang !== 'zh' && lang !== 'yue') || HAN_ONLY.test(word))
      .filter(({ t, word }) => inLanguage(t, lang) && word && /\p{L}/u.test(word) && !word.includes('/') && !AVOID_NOTE.test(t.word ?? '') && !t.tags?.some((tag) => AVOID.has(tag)))
      .sort((a, b) => a.regional - b.regional || a.i - b.i)
      .filter((c, i, list) => list.findIndex((o) => o.word === c.word) === i)
      .slice(0, MAX_CANDIDATES)
      .map((c) => [c.word, gender(c.t.tags), c.regional]);
    // "es:book|verb" holds for that part of speech only (the restaurant's booking, not the book).
    const override = OVERRIDES[`${lang}:${concept.word}|${pos}`] ?? OVERRIDES[`${lang}:${concept.word}`];
    if (override) candidates.unshift([override, candidates.find((c) => c[0] === override)?.[1] ?? '', -1]);
    if (!candidates.length) {
      warnings.push(`${lang}: nothing for ${concept.word}`);
      continue;
    }
    (out[lang][concept.theme] ??= []).push([candidates, meaning, pos]);
  }
}

writeFileSync(new URL('themes.json', CACHE_DIR), JSON.stringify(out));
for (const lang of Object.keys(out)) {
  const total = Object.values(out[lang]).reduce((n, list) => n + list.length, 0);
  console.log(`✓ ${lang}: ${total} themed words`);
}
// Notes about a concept itself first (no translations, a hint not found), then per language.
const own = warnings.filter((w) => !/^[a-z]{2,3}: /.test(w));
console.log(`${warnings.length} notes:\n  ${[...own, ...warnings.filter((w) => !own.includes(w))].slice(0, 160).join('\n  ')}`);
console.log(`Done in ${((Date.now() - started) / 1000).toFixed(0)} s`);
