/**
 * Crawler Codex — starter data, Books 1–4 only.
 *
 * Rules for this file:
 *  - Nothing from Book 5 or later.
 *  - chapter 0 means "somewhere in Book N". The app only shows a chapter-0 note
 *    once a reader has moved past that book, so these can never spoil mid-book.
 *  - When unsure which book something happens in, tag the LATER book.
 *  - Every seed note loads as unverified. Emily (past Book 4) can tap ✓ to confirm,
 *    or edit/delete anything that's wrong.
 *  - Written in our own words from public character guides; no text from the books.
 */
var SEED_ENTRIES = [
  // ---------- Main party ----------
  { name: 'Carl', type: 'character', notes: [
    { book: 1, text: 'Former Coast Guard mechanic. Was outside with his ex\'s cat when Earth\'s buildings vanished, so he entered the dungeon barely dressed. Favors traps and explosives.' },
    { book: 2, text: 'Picks the Primal race (keeps his human look) and the Compensated Anarchist class, which boosts his explosives work.' }
  ]},
  { name: 'Princess Donut', type: 'character', notes: [
    { book: 1, kind: 'alias', text: 'Donut' },
    { book: 1, text: 'Beatrice\'s prize-winning Persian show cat. Becomes a talking, intelligent crawler early on floor 1 and is Carl\'s partner. Vain, charismatic, loves her follower count; strong with magic.' }
  ]},
  { name: 'Mordecai', type: 'character', notes: [
    { book: 1, text: 'Carl and Donut\'s game guide / manager. A former crawler, originally a skyfowl who became a changeling. Bound by rules about what he can tell them.' },
    { book: 1, text: 'Odette was once his own guide when he was a crawler.' },
    { book: 3, text: 'Ends up in a toad-like Grulke body. Brews potions and gives the party key rules information.' }
  ]},
  { name: 'Katia Grim', type: 'character', notes: [
    { book: 2, kind: 'alias', text: 'Katia' },
    { book: 2, text: 'Doppelganger crawler who can\'t quite get faces right, so her look is unsettling. Originally part of Hekla\'s group; joins Carl and Donut\'s party.' },
    { book: 3, text: 'Becomes the party\'s tank. Breaks from Hekla. Sponsored by Princess Formidable.' },
    { book: 4, text: 'Also works as the party\'s scout and infiltrator.' }
  ]},
  { name: 'Mongo', type: 'character', notes: [
    { book: 1, text: 'Donut\'s pet velociraptor. Starts as a baby; Carl helps train him.' },
    { book: 3, text: 'Grown to pony size and used as a combat mount.' }
  ]},

  // ---------- Earth / crawlers ----------
  { name: 'Beatrice', type: 'character', notes: [
    { book: 1, kind: 'alias', text: 'Bea' },
    { book: 1, text: 'Carl\'s ex-girlfriend and Donut\'s original owner. Her cheating ended things with Carl. Not in the dungeon.' },
    { book: 4, kind: 'alias', text: 'Beatrice Varr' },
    { book: 4, text: 'Surviving up on the ruined surface with someone named Brad. Odette takes an interest in her.' }
  ]},
  { name: 'Brandon', type: 'character', notes: [
    { book: 1, text: 'Eldercare worker who leads the Meadow Lark group, protecting dozens of elderly residents. Fights alongside Carl.' },
    { book: 2, text: 'Dies on floor 3 sacrificing himself to save others.' }
  ]},
  { name: 'Chris', type: 'character', notes: [
    { book: 1, text: 'Meadow Lark staffer and fighter who helps defend the residents with Brandon.' },
    { book: 3, text: 'Brandon\'s brother.' },
    { book: 4, kind: 'alias', text: 'Chris Andrews' },
    { book: 4, text: 'Turning violent and isolated after Brandon\'s death.' }
  ]},
  { name: 'Imani', type: 'character', notes: [
    { book: 1, text: 'Pragmatic Meadow Lark staffer in Brandon\'s group. Made a brutal mercy decision for residents who couldn\'t escape a fire.' },
    { book: 3, text: 'Friend of Donut; coordinates crawlers through the chat and digs into how floor mechanics work.' }
  ]},
  { name: 'Elle McGibbons', type: 'character', notes: [
    { book: 1, kind: 'alias', text: 'Mrs. McGibbons' },
    { book: 1, text: '99-year-old Meadow Lark resident. Flirts with Carl after he saves her from a trap.' },
    { book: 3, text: 'Now a foul-mouthed, aggressive Frost Maiden. Teams with Imani and often works with Carl.' }
  ]},
  { name: 'Yolanda Martinez', type: 'character', notes: [
    { book: 1, text: 'Meadow Lark staff member in Brandon\'s group.' }
  ]},
  { name: 'Agatha', type: 'character', notes: [
    { book: 1, text: 'Odd old woman with a shopping cart and strange alien gear. Connected to the Meadow Lark folks; a mystery to Carl.' }
  ]},
  { name: 'Frank and Maggie', type: 'character', notes: [
    { book: 1, kind: 'alias', text: 'Frank Q' },
    { book: 1, kind: 'alias', text: 'Maggie My' },
    { book: 1, text: 'Heavily armed married couple who act friendly, then prey on weaker crawlers. Enemies of Carl.' },
    { book: 1, text: 'Their teenage daughter Yvette dies on floor 1.' },
    { book: 3, text: 'Frank is broken by what happened to his family and wants to unload cursed gear.' },
    { book: 4, text: 'Maggie, now a widow, wants revenge on the people she blames, using deadly artifacts.' }
  ]},
  { name: 'Yvette', type: 'character', notes: [
    { book: 1, text: 'Frank and Maggie\'s teenage daughter. Dies on floor 1.' }
  ]},
  { name: 'Li Jun and Zhang', type: 'character', notes: [
    { book: 1, kind: 'alias', text: 'Li Jun' },
    { book: 1, kind: 'alias', text: 'Zhang' },
    { book: 1, text: 'Crawlers forced onto The Maestro\'s Death Watch who refuse to gamble on their friends\' lives. Carl helps them.' }
  ]},
  { name: 'Hekla', type: 'character', notes: [
    { book: 2, text: 'Disciplined Icelandic leader of Brynhild\'s Daughters, an all-women party. Katia\'s original leader. Treats alliances as tactics.' },
    { book: 3, text: 'A former psychiatrist. Rival of Carl; sponsored by Odette.' }
  ]},
  { name: 'Eva Sigrid', type: 'character', notes: [
    { book: 3, kind: 'alias', text: 'Eva' },
    { book: 3, text: 'Member of Hekla\'s Brynhild\'s Daughters who clashes with Katia.' }
  ]},
  { name: 'Lucia Mar', type: 'character', notes: [
    { book: 2, text: 'Seen as the most powerful crawler left. Nocturnal, skull-faced, travels with vicious dogs. Threatens Donut.' }
  ]},
  { name: 'Daniel Bautista', type: 'character', notes: [
    { book: 2, kind: 'alias', text: 'Bautista' },
    { book: 2, text: 'Crawler who took a tiger-like form and regrets giving up his humanity. Last of his family group. Ally of Carl.' }
  ]},
  { name: 'Louis Santiago', type: 'character', notes: [
    { book: 4, kind: 'alias', text: 'Louis' },
    { book: 4, text: 'Crawler wasting his potential hiding in taverns. Best friends with Firas; falls for Juice Box. Reluctantly follows Carl.' }
  ]},
  { name: 'Firas', type: 'character', notes: [
    { book: 4, text: 'Low-level crawler and Louis\'s best friend. Has a teleport spell they use to run away. Reluctantly follows Carl.' }
  ]},
  { name: 'Gwendolyn Duet', type: 'character', notes: [
    { book: 4, kind: 'alias', text: 'Gwen' },
    { book: 4, text: 'Pragmatic human fighter who leads her own team on floor 5. Allied with Carl; works tactically with Katia.' }
  ]},

  // ---------- Show / corporate / galactic ----------
  { name: 'Zev', type: 'character', notes: [
    { book: 1, text: 'Tiny kua-tin who works PR/communications for the Borant Corporation. Carl and Donut\'s publicist; sympathetic to crawlers.' },
    { book: 4, text: 'Forced to toe the company line; answers to Loita.' }
  ]},
  { name: 'Mukta', type: 'character', notes: [
    { book: 1, text: 'Borant administrator who overrides Zev and pushes Carl onto a more dangerous show, with threats.' }
  ]},
  { name: 'Loita', type: 'character', notes: [
    { book: 3, text: 'Strict, hostile Borant handler who takes over control of the crawlers\' PR from Zev and censors them.' },
    { book: 4, text: 'An AI administrator for Borant who holds crawlers in contempt. Zev now answers to her.' }
  ]},
  { name: 'Odette', type: 'character', notes: [
    { book: 1, text: 'Hugely popular galactic talk show host. Former crawler who reached floor 12, wears mechanical armor, motivated by money. Was Mordecai\'s guide back in his crawl.' },
    { book: 2, text: 'Slips Carl tactical advice off camera.' },
    { book: 3, text: 'Sponsors Hekla.' }
  ]},
  { name: 'Lexis', type: 'character', notes: [
    { book: 1, text: 'Associate producer on Odette\'s show who preps crawlers for their interviews.' }
  ]},
  { name: 'The Maestro', type: 'character', notes: [
    { book: 1, kind: 'alias', text: 'Prince Maestro' },
    { book: 1, text: 'Cruel orc host of Death Watch, a show that revels in crawler deaths. A prince of the Skull Empire. Humiliated on air by Carl and Donut.' }
  ]},
  { name: 'Prince Stalwart', type: 'character', notes: [
    { book: 2, text: 'Crown Prince of the Skull Empire and The Maestro\'s brother. Treats the game as politics; targets Carl.' }
  ]},
  { name: 'King Rust', type: 'character', notes: [
    { book: 2, text: 'Ruler of the Skull Empire; father of Stalwart and The Maestro. His spending on the games stirs unrest.' }
  ]},
  { name: 'Ripper Wonton', type: 'character', notes: [
    { book: 2, text: 'Host of the talk show Danger Zone; tries to keep order when things turn violent on air.' }
  ]},
  { name: 'Princess Formidable', type: 'character', notes: [
    { book: 3, text: 'Katia\'s sponsor.' }
  ]},
  { name: "Princess D'nadia", type: 'character', notes: [
    { book: 3, text: 'Donut\'s sponsor.' }
  ]},
  { name: 'Chaco the Bard', type: 'character', notes: [
    { book: 3, text: 'Game host with a history with, and grudge against, Mordecai.' }
  ]},
  { name: 'Orren', type: 'character', notes: [
    { book: 4, text: 'Syndicate liaison investigating Carl; secretly a Valtay worm. Builds overly technical theories about events.' }
  ]},

  // ---------- Dungeon NPCs ----------
  { name: 'Rory and Lorelai', type: 'character', notes: [
    { book: 1, kind: 'alias', text: 'Rory' },
    { book: 1, kind: 'alias', text: 'Lorelai' },
    { book: 1, text: 'Goblin shamans charmed by Donut into building a coal-powered motorcycle for her and Carl. Lorelai is into Carl.' }
  ]},
  { name: 'Tally', type: 'character', notes: [
    { book: 1, text: 'Safe room caretaker on floor 1 who tells Carl Earth is effectively gone.' }
  ]},
  { name: 'Signet', type: 'character', notes: [
    { book: 2, text: 'Bioengineered NPC (half-naiad, half-high elf) starring in her own scripted revenge storyline on floor 3. Treats crawlers as disposable; captures/blackmails Carl.' }
  ]},
  { name: 'Grimaldi', type: 'character', notes: [
    { book: 2, text: 'Former circus ringleader turned parasitic vine creature that animates performers with mold. Tied up with Signet.' }
  ]},
  { name: 'Heather the Bear', type: 'character', notes: [
    { book: 2, text: 'Mind-controlled circus bear under Grimaldi who just wants her suffering to end.' }
  ]},
  { name: 'Quint', type: 'character', notes: [
    { book: 2, text: 'Former crawler working as a pharmacist at the Desperado Club; friend of Mordecai; trades in gossip.' }
  ]},
  { name: 'Fitz', type: 'character', notes: [
    { book: 2, text: 'Human innkeeper at the One-Eyed Narwhal pub. Likes charismatic crawlers and passes along rumors.' }
  ]},
  { name: 'Pustule', type: 'character', notes: [
    { book: 2, text: 'Hobgoblin merchant who sells Carl explosives and demolition supplies.' }
  ]},
  { name: 'GumGum', type: 'character', notes: [
    { book: 2, text: 'Orc NPC collecting the bodies of murdered workers; gives Carl a quest for justice.' }
  ]},
  { name: 'Miss Quill', type: 'character', notes: [
    { book: 2, text: 'Skyfowl secretary guarding the magistrate\'s chambers. Collects dungeon collectibles. Enemy of Carl.' }
  ]},
  { name: 'Magistrate Featherfall', type: 'character', notes: [
    { book: 2, text: 'Leader of the skyfowl settlement on floor 3; a necromancer.' }
  ]},
  { name: 'Juice Box', type: 'character', notes: [
    { book: 4, text: 'Changeling in Hump Town who shapeshifts fast and knows local secrets. Informant/ally to Carl; Henrik\'s sister; Louis\'s love interest.' }
  ]},
  { name: 'Henrik', type: 'character', notes: [
    { book: 4, text: 'Dromedarian official who secretly shelters changelings in Hump Town. Juice Box\'s brother. Holds Wynne hostage.' }
  ]},
  { name: 'Wynne', type: 'character', notes: [
    { book: 4, text: 'High-level Dirigible Gnome held hostage by the Dromedarians; someone Carl tries to rescue.' }
  ]},
  { name: 'Leon the Commissar', type: 'character', notes: [
    { book: 4, kind: 'alias', text: 'Leon' },
    { book: 4, text: 'Gnomish ambassador/enforcer who is eager to bomb settlements. Answers to Commandant Kane.' }
  ]},
  { name: 'Commandant Kane', type: 'character', notes: [
    { book: 4, text: 'Military leader of the Dirigible Gnomes; commands a floating fortress where he raises his daughter Bonnie. Rival of Ghazi.' }
  ]},
  { name: 'Bonnie', type: 'character', notes: [
    { book: 4, text: 'Commandant Kane\'s young daughter, grieving after an attack on her home. Carl comforts her.' }
  ]},
  { name: 'Ghazi', type: 'character', notes: [
    { book: 4, kind: 'alias', text: 'Mad Dune Mage' },
    { book: 4, text: 'Human mage in an isolated area who accidentally summoned a minor deity (and ended up married to it). Rival of Kane.' }
  ]},

  // ---------- Groups ----------
  { name: 'Borant Corporation', type: 'group', notes: [
    { book: 1, kind: 'alias', text: 'Borant' },
    { book: 1, text: 'The alien corporation running Dungeon Crawler World: Earth.' }
  ]},
  { name: 'Skull Empire', type: 'group', notes: [
    { book: 1, kind: 'alias', text: 'Skull Clan' },
    { book: 1, text: 'Orc royal house The Maestro belongs to. Retaliates against Carl after his broadcast appearances.' }
  ]},
  { name: "Brynhild's Daughters", type: 'group', notes: [
    { book: 2, text: 'Hekla\'s all-women crawler party; Katia started out with them.' }
  ]},
  { name: 'Dirigible Gnomes', type: 'group', notes: [
    { book: 4, text: 'Floor 5 faction with airships and a floating fortress, led by Commandant Kane.' }
  ]},
  { name: 'Dromedarians', type: 'group', notes: [
    { book: 4, text: 'Camel-like floor 5 faction running Hump Town.' }
  ]},

  // ---------- Places ----------
  { name: 'Meadow Lark', type: 'place', notes: [
    { book: 1, text: 'The assisted living facility Brandon\'s group (Chris, Imani, Yolanda, Mrs. McGibbons and others) came from.' }
  ]},
  { name: 'Safe rooms', type: 'place', notes: [
    { book: 1, kind: 'alias', text: 'safe room' },
    { book: 1, text: 'Rooms on each floor where monsters can\'t attack; often have a caretaker NPC and a place to rest.' }
  ]},
  { name: 'Desperado Club', type: 'place', notes: [
    { book: 2, text: 'Club where Quint works as a pharmacist.' }
  ]},
  { name: 'One-Eyed Narwhal', type: 'place', notes: [
    { book: 2, text: 'Pub run by Fitz.' }
  ]},
  { name: 'The Iron Tangle', type: 'place', notes: [
    { book: 3, kind: 'alias', text: 'Iron Tangle' },
    { book: 3, text: 'Floor 4: an absurdly complicated knot of trains and train lines.' }
  ]},
  { name: 'Hump Town', type: 'place', notes: [
    { book: 4, text: 'Dromedarian town on floor 5 where Henrik secretly hides changelings.' }
  ]},

  // ---------- Shows ----------
  { name: 'Dungeon Crawler World', type: 'show', notes: [
    { book: 1, text: 'The galaxy-wide reality show the dungeon is. This season is Dungeon Crawler World: Earth.' }
  ]},
  { name: 'Death Watch', type: 'show', notes: [
    { book: 1, text: 'The Maestro\'s show that celebrates crawler deaths.' }
  ]},
  { name: 'Danger Zone', type: 'show', notes: [
    { book: 2, text: 'Talk show hosted by Ripper Wonton.' }
  ]},

  // ---------- Mechanics ----------
  { name: 'Achievements and loot boxes', type: 'mechanic', notes: [
    { book: 1, kind: 'alias', text: 'loot box' },
    { book: 1, kind: 'alias', text: 'achievement' },
    { book: 1, text: 'The system announces achievements, which award boxes (bronze, silver, etc.) opened in safe rooms.' }
  ]},
  { name: 'Game guide', type: 'mechanic', notes: [
    { book: 1, kind: 'alias', text: 'manager' },
    { book: 1, text: 'NPC assigned to coach crawlers (Mordecai for Carl and Donut), limited in what they may reveal.' }
  ]},
  { name: 'Primal', type: 'mechanic', notes: [
    { book: 2, text: 'Carl\'s race. Keeps his human appearance; trade-off on stats but lets skills train beyond normal limits.' }
  ]},
  { name: 'Compensated Anarchist', type: 'mechanic', notes: [
    { book: 2, text: 'Carl\'s class, built around explosives.' }
  ]},
  { name: 'Top Ten list', type: 'mechanic', notes: [
    { book: 3, text: 'Ranking of the most popular/dangerous crawlers. Carl and Donut are on it, and it comes with bounties on their heads.' }
  ]},
  { name: 'Sponsors', type: 'mechanic', notes: [
    { book: 3, text: 'Wealthy galactic viewers who back individual crawlers (Princess D\'nadia for Donut, Princess Formidable for Katia, Odette for Hekla).' }
  ]}
];
