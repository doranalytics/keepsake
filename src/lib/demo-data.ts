import type { Message, Thread } from "./types";

// [minutesAgo, sender ("" = me), text]
type Line = [number, string, string];

const MIN = 60_000;
const H = 60;
const D = 24 * H;

function build(
  id: string,
  name: string,
  participants: string[],
  isGroup: boolean,
  lines: Line[],
  startId: number
): { thread: Thread; messages: Message[] } {
  const now = Date.now();
  const messages: Message[] = lines.map((l, i) => ({
    id: startId + i,
    threadId: id,
    sender: l[1],
    isFromMe: l[1] === "",
    date: now - l[0] * MIN,
    text: l[2],
  }));
  messages.sort((a, b) => a.date - b.date);
  const last = messages[messages.length - 1];
  return {
    thread: {
      id,
      name,
      participants,
      isGroup,
      lastDate: last.date,
      lastText: last.text,
      messageCount: messages.length,
    },
    messages,
  };
}

const maya: Line[] = [
  [12 * D + 40, "Maya", "hey! it was really nice meeting you last night :)"],
  [12 * D + 32, "", "likewise! I still can't believe you've also read all of the Murderbot books"],
  [12 * D + 28, "Maya", "ALL of them. twice. no shame"],
  [12 * D + 20, "", "ok that settles it, we have to compare rankings sometime"],
  [12 * D + 12, "Maya", "is that your way of asking me out again 👀"],
  [12 * D + 8, "", "it might be. coffee saturday?"],
  [12 * D + 2, "Maya", "yes!! there's a place on Chapel St called Fuel that does amazing cortados"],
  [11 * D, "", "Fuel, saturday, 10am. it's a plan"],
  [9 * D + 30, "Maya", "random but I just walked past a dog that looked EXACTLY like a loaf of sourdough"],
  [9 * D + 26, "Maya", "no photo, you'll have to trust me"],
  [9 * D + 20, "", "the audacity of not documenting the bread dog"],
  [9 * D + 15, "Maya", "next time. also I looked it up and Fuel opens at 8 on saturdays so we could go earlier and beat the line"],
  [9 * D + 10, "", "9am? I am not a functional human before 8:30"],
  [9 * D + 8, "Maya", "9 works. noted: not a morning person 📝"],
  [8 * D + 5, "", "what's your week looking like?"],
  [8 * D, "Maya", "work is insane, we're shipping the spring collection thursday. after that I'm freeeee"],
  [7 * D + 50, "", "wait what do you do exactly? you dodged this question at the party"],
  [7 * D + 45, "Maya", "textile designer at a small studio in East Rock! I do mostly jacquard patterns"],
  [7 * D + 40, "Maya", "I dodged it because people either say 'oh cool' and change the subject or ask me to fix their curtains"],
  [7 * D + 35, "", "I would never. my curtains are beyond saving anyway"],
  [7 * D + 30, "Maya", "lol. what about you, how did you end up doing data stuff?"],
  [7 * D + 22, "", "long story involving a failed band and a spreadsheet that got out of hand. I'll tell you saturday"],
  [7 * D + 20, "Maya", "a FAILED BAND. saturday can't come soon enough"],
  [5 * D + 30, "Maya", "ok important question. cortado or cappuccino"],
  [5 * D + 26, "", "cortado, obviously. cappuccino foam is a scam"],
  [5 * D + 24, "Maya", "correct answer. we can proceed"],
  [4 * D + 10, "", "how did the spring collection launch go??"],
  [4 * D + 2, "Maya", "WE SHIPPED IT. the indigo wave pattern I designed made the cover of the lookbook 😭"],
  [4 * D, "", "that's amazing!! congratulations. saturday we're celebrating, coffee's on me"],
  [3 * D + 55, "Maya", "deal. I'll bring a picture of the pattern so you can pretend to understand weaving"],
  [3 * D + 50, "", "I will nod thoughtfully and say 'great warp'"],
  [3 * D + 48, "Maya", "it's weft you absolute muffin"],
  [2 * D + 20, "Maya", "btw my sister is visiting sunday so I can't do a long morning, is 9-11 ok?"],
  [2 * D + 15, "", "perfect. also fun fact I found the bread dog on the East Rock dogs instagram"],
  [2 * D + 13, "Maya", "NO. send it immediately"],
  [2 * D + 10, "", "his name is Baguette. I am not making this up"],
  [2 * D + 8, "Maya", "BAGUETTE. this is the best day of my life"],
  [1 * D + 30, "Maya", "reminder that you owe me a failed band story tomorrow"],
  [1 * D + 25, "", "setlist screenshots and everything. prepare yourself"],
  [1 * D + 22, "Maya", "I've never been more ready for anything"],
  [3 * H, "Maya", "see you at 9! I'll be the one in the scarf I designed (shameless I know)"],
  [2 * H + 50, "", "can't wait 😊 I'll be the one pretending to know about textiles"],
];

const mom: Line[] = [
  [30 * D, "Mom", "Did you see the photos from Aunt Carol's retirement party? You were missed!"],
  [30 * D - 20, "", "Saw them! Tell Aunt Carol congrats from me"],
  [14 * D, "Mom", "Your father is learning to make sourdough. Pray for us."],
  [14 * D - 10, "", "Week 1: enthusiasm. Week 3: the kitchen is a flour crime scene. Calling it now"],
  [14 * D - 8, "Mom", "It's already a crime scene and it's day 2"],
  [6 * D, "Mom", "Are you coming home for Labor Day weekend? Grandma is asking"],
  [6 * D - 30, "", "Planning on it! Driving up Saturday morning"],
  [6 * D - 25, "Mom", "Wonderful. Bring that nice coffee you got last time"],
  [1 * D, "Mom", "Dad's bread actually turned out edible. Photo evidence to follow"],
  [1 * D - 5, "", "I demand the photo AND a slice saved for me"],
];

const hoops: Line[] = [
  [10 * D, "Marcus", "we on for sunday? forecast says clear"],
  [10 * D - 10, "Jake", "in. bringing my cousin, he's 6'4\" so he's on my team"],
  [10 * D - 8, "", "that's not how teams work jake"],
  [10 * D - 6, "Marcus", "that's EXACTLY how jake thinks teams work"],
  [10 * D - 2, "Tony", "in, but I'm not guarding the cousin"],
  [3 * D, "Marcus", "sunday 10am, Edgewood courts. don't be late tony"],
  [3 * D - 15, "Tony", "ONE time"],
  [3 * D - 12, "Jake", "four times"],
  [3 * D - 10, "", "it was definitely four times"],
  [3 * D - 8, "Tony", "the betrayal in this chat is unreal"],
  [20 * H, "Marcus", "who's got a pump? my ball is flat"],
  [19 * H, "", "I got one, I'll bring it"],
];

const jake: Line[] = [
  [45 * D, "Jake", "bro the new Dune game is unreal, you need to get it"],
  [45 * D - 30, "", "my backlog is already 40 games deep man"],
  [45 * D - 25, "Jake", "41 is a rounder number"],
  [21 * D, "Jake", "yo you free thursday? Twisted Vine has a trivia night, need your useless geography knowledge"],
  [21 * D - 40, "", "\"useless\" — we won LAST TIME because I knew the capital of Kyrgyzstan"],
  [21 * D - 35, "Jake", "bishkek being your personality trait aside, you in?"],
  [21 * D - 30, "", "in. 7pm?"],
  [21 * D - 28, "Jake", "7. I'll grab the good corner table"],
  [2 * D + 40, "Jake", "heard you got a date saturday 👀 marcus talks"],
  [2 * D + 30, "", "marcus is a menace. yes. coffee. it's very chill"],
  [2 * D + 28, "Jake", "'very chill' he says, having already planned his outfit"],
  [2 * D + 26, "", "I hate that you know me this well"],
];

const sarah: Line[] = [
  [60 * D, "Sarah", "ok WHICH of these couches for the new apartment"],
  [60 * D - 10, "Sarah", "the green velvet one or the boring beige one"],
  [60 * D - 5, "", "green velvet. beige is for people who've given up"],
  [60 * D - 2, "Sarah", "THANK you, exactly what I told Tom"],
  [15 * D, "Sarah", "couch update: green velvet has arrived and it is MAGNIFICENT"],
  [15 * D - 10, "", "the correct choice was made. how's the new place otherwise?"],
  [15 * D - 5, "Sarah", "boxes everywhere but it's home. you have to visit soon"],
  [15 * D - 2, "", "once you have a functional guest situation I'm there"],
  [4 * D, "Sarah", "mom says you're coming for labor day! carpool from the city?"],
  [4 * D - 20, "", "yes! I'll drive, pick you up saturday 9ish"],
  [4 * D - 15, "Sarah", "perfect. I'm making a playlist and there will be no skips allowed"],
  [4 * D - 12, "", "we'll see about that"],
];

const lake: Line[] = [
  [25 * D, "Marcus", "ok lake house is BOOKED. sept 18-21, Winnipesaukee 🎉"],
  [25 * D - 10, "Priya", "yesss. sending the deposit split now, $85 each"],
  [25 * D - 5, "", "paid. does the place have a grill?"],
  [25 * D - 2, "Marcus", "two grills AND a pizza oven"],
  [25 * D - 1, "Jake", "a pizza oven?? this changes everything"],
  [12 * D, "Priya", "starting a shared doc for food planning, everyone claim a dinner"],
  [12 * D - 20, "", "claiming friday. doing my smash burgers"],
  [12 * D - 15, "Jake", "the smash burgers 🙌 ok saturday is pizza night obviously, I claim it"],
  [12 * D - 10, "Priya", "sunday's mine, making my mom's biryani recipe"],
  [12 * D - 5, "Marcus", "this is the best group chat of all time"],
  [5 * D, "Jake", "does anyone have a kayak rack? asking for two kayaks"],
  [5 * D - 30, "Priya", "I do! it fits two, problem solved"],
  [5 * D - 20, "", "so it's settled, we're all quitting our jobs to live at the lake"],
  [5 * D - 18, "Marcus", "motion seconded"],
];

const dave: Line[] = [
  [90 * D, "Dave", "Hi, this is Dave from the building. The water will be shut off Tuesday 9am-noon for pipe work."],
  [90 * D - 30, "", "Thanks for the heads up Dave"],
  [40 * D, "", "Hey Dave, the kitchen faucet has a slow drip — not urgent but wanted to flag it"],
  [40 * D - 60, "Dave", "Thanks, I'll have Rick take a look Thursday morning if that works"],
  [40 * D - 50, "", "Thursday works, I'll be on calls but he can come in"],
  [39 * D, "Dave", "Rick fixed the faucet, also replaced the aerator. Let me know if any issues"],
  [39 * D - 20, "", "All good, thanks for the quick turnaround!"],
  [8 * D, "Dave", "Reminder rent portal is down this weekend for maintenance, checks are fine if needed"],
  [8 * D - 15, "", "Noted, thanks Dave"],
];

const priya: Line[] = [
  [50 * D, "Priya", "your talk proposal got in!! just saw the speaker list 🎉"],
  [50 * D - 10, "", "WAIT really?? they haven't even emailed me yet"],
  [50 * D - 8, "Priya", "I have my sources. congrats!!"],
  [18 * D, "Priya", "how's the deck coming for the talk?"],
  [18 * D - 30, "", "12 slides in, currently fighting a chart that refuses to be legible"],
  [18 * D - 25, "Priya", "the eternal struggle. want me to review it this week?"],
  [18 * D - 20, "", "that would be amazing, I'll send it friday"],
  [7 * D, "", "deck sent! be brutal"],
  [7 * D - 120, "Priya", "reviewed. it's good!! left comments, mostly: less text, bigger charts, keep the joke on slide 9"],
  [7 * D - 100, "", "the slide 9 joke stays forever. thank you 🙏"],
];

// A last sent message that's been seen gets a read receipt, like real life.
function markRead<T extends { messages: Message[] }>(b: T, minutesAfter: number): T {
  const last = b.messages[b.messages.length - 1];
  if (last.isFromMe) last.dateRead = last.date + minutesAfter * MIN;
  return b;
}

const built = [
  markRead(build("demo-maya", "Maya Chen", ["Maya Chen"], false, maya, 1000), 3),
  build("demo-mom", "Mom", ["Mom"], false, mom, 2000),
  build("demo-hoops", "Sunday Hoops 🏀", ["Marcus Webb", "Jake Morrison", "Tony Russo"], true, hoops, 3000),
  markRead(build("demo-jake", "Jake Morrison", ["Jake Morrison"], false, jake, 4000), 12),
  markRead(build("demo-sarah", "Sarah Doran", ["Sarah Doran"], false, sarah, 5000), 25),
  build("demo-lake", "Lake House 2026", ["Marcus Webb", "Jake Morrison", "Priya Sharma"], true, lake, 6000),
  build("demo-dave", "Dave (Landlord)", ["Dave (Landlord)"], false, dave, 7000),
  build("demo-priya", "Priya Sharma", ["Priya Sharma"], false, priya, 8000),
];

export const demoThreads: Thread[] = built
  .map((b) => b.thread)
  .sort((a, b) => b.lastDate - a.lastDate);

export const demoMessages: Map<string, Message[]> = new Map(
  built.map((b) => [b.thread.id, b.messages])
);
