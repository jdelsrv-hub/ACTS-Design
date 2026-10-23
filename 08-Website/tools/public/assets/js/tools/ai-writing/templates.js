// AI writing templates, shared by the browser and the server.
// writer.js builds each tool's form from `fields`; functions/api/ai.js checks the values with
// checkFields() and builds the prompt from `task`. The browser never sends a prompt, only values.
// To add a tool: add a template here and a registry entry with preset { template: '<id>' } in index.js.
//
//   task:   what the AI should do. Each value reaches it in a tag named after its field, e.g. <topic>.
//   fields: type text | textarea | select | segmented | pdf (text read from a PDF in the browser).
//           max = character limit (default 200 for text, 1,500 for textarea). For choices, the value
//           is what the AI sees and the label is what the creator sees.
//   size:   output cap, S | M | L | XL (MAX_TOKENS in functions/api/ai.js).
//   action: button label. note: a short line shown under the form.

const TONES = ['Friendly', 'Professional', 'Casual', 'Confident', 'Playful', 'Inspiring', 'Formal'];
const LANGUAGES = ['Arabic', 'Bengali', 'Chinese (Simplified)', 'Chinese (Traditional)', 'Croatian', 'Czech', 'Danish', 'Dutch', 'Filipino (Tagalog)', 'Finnish', 'French', 'German', 'Greek', 'Hebrew', 'Hindi', 'Hungarian', 'Indonesian', 'Italian', 'Japanese', 'Korean', 'Malay', 'Nepali', 'Norwegian', 'Persian (Farsi)', 'Polish', 'Portuguese (Brazil)', 'Portuguese (Portugal)', 'Punjabi', 'Romanian', 'Russian', 'Samoan', 'Serbian', 'Sinhala', 'Spanish', 'Swahili', 'Swedish', 'Tamil', 'Thai', 'Tongan', 'Turkish', 'Ukrainian', 'Urdu', 'Vietnamese'];

// Choices are plain strings or [label, value] pairs. `def` picks the default by label (else the first).
const choose = (type) => (id, label, pairs, def) => {
  const choices = pairs.map((p) => (Array.isArray(p) ? { label: p[0], value: p[1] } : { label: p, value: p }));
  return { id, type, label, choices, default: (choices.find((c) => c.label === def) || choices[0]).value };
};
const seg = choose('segmented');
const select = choose('select');

const text = (label, placeholder, max = 6000, rows = 10) => ({ id: 'text', type: 'textarea', label, placeholder, max, rows, required: true });
const topic = (label, placeholder, max = 600) => ({ id: 'topic', type: 'textarea', label, placeholder, max, rows: 3, required: true });
const details = (label, placeholder) => ({ id: 'details', type: 'textarea', label, placeholder, max: 1500, rows: 3 });
const pdf = (max) => ({ id: 'text', type: 'pdf', label: 'Your PDF', max, required: true });
const tone = (def = 'Friendly', label = 'Tone', extra = []) => select('tone', label, [...extra, ...TONES], def);
const sameTone = tone('Same as the original', 'Tone', ['Same as the original']);
const words = (label, [s, m, l], def = 'Medium') => seg('length', label, [['Short', `about ${s} words`], ['Medium', `about ${m} words`], ['Long', `about ${l} words`]], def);
const count = (nums = ['5', '10', '20'], def = '10') => seg('count', 'How many', nums, def);
const audience = { id: 'audience', type: 'text', label: 'Audience (optional)', placeholder: 'e.g. new streamers, local families', max: 150 };
const keywords = { id: 'keywords', type: 'text', label: 'Keywords (optional)', placeholder: 'Separate them with commas', max: 200 };
const mainKeyword = { id: 'keywords', type: 'text', label: 'Main keyword (optional)', placeholder: 'e.g. streaming microphone', max: 100 };
const hashtags = seg('hashtags', 'Hashtags', [['None', 'no hashtags'], ['A few', '3 to 5 relevant hashtags at the end'], ['Lots', '10 to 15 relevant hashtags at the end']], 'A few');
const summaryStyle = seg('format', 'Summary style', [['Key points', 'a short list of key points'], ['Paragraph', 'one short paragraph'], ['One sentence', 'a single sentence']]);
const language = select('language', 'Translate to', [['English', 'English (with Australian spelling)'], ...LANGUAGES]);
const OWN_WORK = 'Only rewrite writing that you own or have permission to reuse.';
const SCANS = "Scanned PDFs (photos of pages) won't work, because they have no text for us to read.";

export const TEMPLATES = {
  'content-improver': {
    fields: [text('Your text', 'Paste the writing you want to improve'), seg('goal', 'Make it', [['Clearer', 'clearer and easier to read'], ['More engaging', 'more engaging and lively'], ['More persuasive', 'more persuasive']])],
    task: 'Improve the writing in <text> so it is <goal>. Keep the meaning, facts, point of view, names, links and numbers, and keep it about the same length. Fix grammar and awkward phrasing, and cut repetition and filler. Return only the improved version.',
    size: 'L', action: 'Improve it',
  },
  'essay-writer': {
    fields: [topic('Essay topic', 'e.g. How live streaming changed the way we watch sport'), select('kind', 'Type of essay', ['Explanatory', 'Argumentative', 'Persuasive', 'Compare and contrast', 'Personal reflection']), words('Length', [400, 800, 1500])],
    task: 'Write an essay of the type in <kind> on the topic in <topic>, at the length in <length>. Put a title on the first line. Then write an introduction that states the main point, body paragraphs that each develop one idea with reasons or examples, and a short conclusion. Use plain paragraphs with no other headings.',
    size: 'L', action: 'Write my essay',
  },
  'paragraph-writer': {
    fields: [topic("What's the paragraph about?", 'e.g. Why good lighting matters on a stream'), tone(), words('Length', [60, 120, 200])],
    task: 'Write one paragraph about <topic>, at the length in <length>. Open with a clear topic sentence, support it with detail or an example, and close with a sentence that rounds it off. Return the paragraph only.',
    size: 'S', action: 'Write my paragraph',
  },
  'paragraph-completer': {
    fields: [text('Your paragraph so far', 'Paste the start of your paragraph', 3000, 6), seg('amount', 'How much to add', [['A sentence or two', 'one or two sentences'], ['A few sentences', 'three to five sentences'], ['A lot', 'about 150 words']], 'A few sentences')],
    task: "Continue the unfinished paragraph in <text>, adding <amount>. Match its voice, tense, point of view and style, and bring the idea to a natural finish. Return the whole paragraph: the creator's words exactly as written, followed by your continuation.",
    size: 'M', action: 'Finish my paragraph',
  },
  'story-generator': {
    fields: [topic('Story idea', 'e.g. A shy gamer becomes a hit streamer overnight'), select('genre', 'Genre', ['Any', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Mystery', 'Romance', 'Science fiction', 'Spooky', "Children's story"]), words('Length', [300, 700, 1200])],
    task: 'Write an original short story based on <topic>, in the genre in <genre> (your choice if it says Any), at the length in <length>. Put a title on the first line. Give it a clear beginning, middle and end, vivid but plain language, and dialogue where it helps. Keep it suitable for a general audience.',
    size: 'L', action: 'Write my story',
  },
  'grammar-fixer': {
    fields: [text('Your text', 'Paste the text you want to check')],
    task: "Correct the spelling, grammar and punctuation in <text>. Change as little as possible: keep the creator's words, voice, meaning, formatting and line breaks, and keep their spelling variety (such as US or Australian English). Leave sentences that are already correct as they are. Return only the corrected text.",
    size: 'L', action: 'Fix my text',
  },
  'article-writer': {
    fields: [topic('Article topic', "e.g. A beginner's guide to starting a podcast"), keywords, audience, tone(), words('Length', [500, 900, 1500])],
    task: 'Write an article about <topic>, at the length in <length>. Put a title on the first line, then a short introduction. Break the body into sections with short headings on their own lines, and finish with a brief conclusion. Be practical and specific.',
    size: 'L', action: 'Write my article',
  },
  'sentence-rewriter': {
    fields: [text('Your sentence', 'Type or paste a sentence', 500, 3), seg('style', 'Make it', [['Clearer', 'clearer'], ['Shorter', 'shorter'], ['More formal', 'more formal'], ['More casual', 'more casual'], ['More vivid', 'more vivid']])],
    task: 'Rewrite the sentence in <text> five different ways, making each one <style> than the original while keeping its meaning. Put each version on its own line, numbered 1 to 5, with nothing else.',
    size: 'S', action: 'Rewrite it',
  },
  'content-summarizer': {
    fields: [text('Text to summarise', 'Paste an article, notes or a transcript', 20000, 12), summaryStyle],
    task: "Summarise the text in <text> as <format>. Keep the main ideas and any important names, numbers and dates, leave out minor details, and add nothing that isn't in the text. Write the summary in the language of the text.",
    size: 'M', action: 'Summarise it',
  },
  'tone-of-voice': {
    fields: [text('Your text', 'Paste the text you want in a new tone'), tone('Friendly', 'New tone')],
    task: 'Rewrite the text in <text> in the tone in <tone>. Keep the meaning, facts, names and links, and keep it about the same length. Return only the rewritten text.',
    size: 'L', action: 'Change the tone',
  },
  'youtube-script-writer': {
    fields: [topic('Video topic', 'e.g. 5 budget upgrades that make your stream look pro'), audience, tone(), seg('length', 'Video length', [['2 minutes', 'about 2 minutes (around 300 spoken words)'], ['5 minutes', 'about 5 minutes (around 750 spoken words)'], ['10 minutes', 'about 10 minutes (around 1,500 spoken words)']], '5 minutes')],
    task: 'Write a YouTube video script about <topic> for a video of <length>. Open with a hook for the first 10 seconds, then a quick intro, then the main sections, each with a short heading on its own line, then a wrap-up with a call to action (such as subscribing or commenting). Write the spoken words in a natural, conversational way, and add brief visual or B-roll ideas in square brackets where they help.',
    size: 'L', action: 'Write my script',
  },
  'paragraph-rewriter': {
    fields: [text('Your paragraph', 'Paste the paragraph you want to rewrite', 3000, 6), sameTone],
    task: 'Rewrite the paragraph in <text> with fresh wording and sentence structure, in the tone in <tone>. Keep the meaning and facts, and keep it about the same length. Return one paragraph only.',
    size: 'M', action: 'Rewrite it',
  },
  'instagram-caption-generator': {
    fields: [topic("What's the post about?", 'e.g. Behind the scenes of setting up my new streaming desk'), tone(), hashtags, seg('emoji', 'Emoji', [['None', 'no emoji'], ['A few', 'a few fitting emoji']], 'A few')],
    task: 'Write three different Instagram captions for the post described in <topic>, in the tone in <tone>. Give each a strong first line, keep it under 150 words, and end with a question or a gentle call to action. Use <hashtags> and <emoji>. Number the captions 1 to 3, with a blank line between them.',
    size: 'M', action: 'Write my captions',
  },
  'explain-like-five': {
    fields: [topic('What should we explain?', 'e.g. How does the internet work?')],
    task: 'Explain <topic> so a five-year-old could understand it. Use short sentences, everyday words and a comparison to something a young child knows, and keep it accurate. Keep it under 200 words.',
    size: 'S', action: 'Explain it',
  },
  'content-shortener': {
    fields: [text('Your text', 'Paste the text you want to shorten'), seg('amount', 'How much shorter', [['A little', 'about 25% shorter'], ['Half', 'about half the length'], ['A lot', 'about a quarter of the length']], 'Half')],
    task: "Shorten the text in <text> to <amount>. Keep the key points, facts, names, links and the creator's voice. Cut repetition, filler and less important detail. Return only the shortened text.",
    size: 'L', action: 'Shorten it',
  },
  'translate-text': {
    fields: [text('Text to translate', 'Paste the text you want to translate', 5000), language],
    task: 'Translate the text in <text> into the language in <language>. Keep the meaning, tone and formatting (line breaks, lists, emoji and links). Keep names, brands and hashtags as they are unless they have a well-known translation. Return only the translation.',
    size: 'XL', action: 'Translate it',
    note: 'AI translation can miss nuance. For anything important, like contracts or health information, ask a professional translator.',
  },
  'title-rewriter': {
    fields: [{ id: 'text', type: 'text', label: 'Your title', placeholder: 'e.g. My thoughts on budget microphones', max: 200, required: true }, select('purpose', "It's a title for", [['A YouTube video', 'a YouTube video'], ['A blog post', 'a blog post'], ['An article', 'an article'], ['A podcast episode', 'a podcast episode'], ['An email', 'an email subject line'], ['A social post', 'a social media post']])],
    task: 'Rewrite the title in <text> ten different ways for <purpose>. Make each one clear, specific and appealing without being clickbait, keep the topic and any key terms, and keep each under 70 characters. Put each on its own line, numbered 1 to 10, with nothing else.',
    size: 'S', action: 'Rewrite my title',
  },
  'linkedin-post-generator': {
    fields: [topic('What do you want to post about?', 'e.g. What I learned from my first year running a small studio'), tone('Professional'), seg('hashtags', 'Hashtags', [['None', 'no hashtags'], ['A few', '3 to 5 relevant hashtags at the end']], 'A few')],
    task: 'Write a LinkedIn post about <topic>, in the tone in <tone>. Open with a short first line that makes people want to read on, use short paragraphs with a blank line between them, share one clear takeaway, and end with a question that invites comments. Keep it under 250 words. Use <hashtags>.',
    size: 'M', action: 'Write my post',
  },
  'blog-post-generator': {
    fields: [topic('Blog post topic', 'e.g. How to set up a home studio on a budget'), keywords, audience, tone(), words('Length', [600, 1000, 1600])],
    task: 'Write a blog post about <topic>, at the length in <length>. Put the title on the first line, then an engaging introduction, then sections with short headings on their own lines, and finish with a conclusion that gives the reader a next step. Use short paragraphs, and lists where they help. Be practical and specific.',
    size: 'L', action: 'Write my blog post',
  },
  'business-name-generator': {
    fields: [topic('What does the business do?', 'e.g. A mobile coffee van for weekend markets in Brisbane'), seg('style', 'Style', ['Any', 'Simple', 'Playful', 'Premium', 'Modern']), count(['10', '20'], '10')],
    task: 'Suggest <count> names for the business described in <topic>, in the style in <style> (your choice if it says Any). Make them short, easy to say and spell, and memorable, and mix kinds of names (descriptive, invented, compound). Put each on its own line as "Name: a short reason it works". Never say a name is available.',
    size: 'S', action: 'Suggest names',
    note: 'Check a name is free to use (business names, domains and trademarks) before you commit to it.',
  },
  'paraphrasing-tool': {
    fields: [text('Text to paraphrase', 'Paste the text you want to reword'), seg('mode', 'Style', [['Standard', 'natural, everyday wording'], ['Fluent', 'smooth, flowing wording'], ['Formal', 'formal wording'], ['Simple', 'simple, easy words'], ['Creative', 'fresh, creative wording']])],
    task: 'Paraphrase the text in <text> using <mode>. Keep the full meaning, facts and names, but change the wording and sentence structure. Keep about the same length and the same paragraphs. Return only the paraphrased text.',
    size: 'L', action: 'Paraphrase it',
  },
  'blog-post-ideas': {
    fields: [topic('Your niche or topic', 'e.g. Budget tech for new content creators'), audience, count()],
    task: 'Suggest <count> blog post ideas about <topic>. Mix formats such as how-to guides, lists, comparisons, opinion pieces and beginner guides. For each idea, give a working title on one line and one sentence on what the post would cover on the next. Number them.',
    size: 'M', action: 'Get ideas',
  },
  'business-plan-generator': {
    fields: [topic('Describe your business idea', 'e.g. A video editing service for small YouTube channels, run from home', 1000), details('Anything else we should know (optional)', 'e.g. Starting budget, location, who your customers are, how you will charge')],
    task: "Draft a simple, practical business plan for the business in <topic>, using <details> if given. Use these sections, each with its heading on its own line: Summary, Problem and solution, Customers, Competitors, Marketing, Operations, Money (costs, pricing and income), Risks, First 90 days. Keep it realistic and plain-spoken. Don't make up market sizes or financial figures: where a number is needed, use a placeholder like [your monthly costs].",
    size: 'L', action: 'Draft my plan',
    note: "It's a starting draft, not financial or legal advice. Check the numbers and get advice before you rely on it.",
  },
  'cold-email-writer': {
    fields: [topic('Who are you emailing, and why?', 'e.g. A local café owner, to offer short videos for their socials'), details('About you or your offer (optional)', 'e.g. Your name, what you do, a result you got for someone'), tone()],
    task: 'Write a cold email for the situation in <topic>, using <details> if given, in the tone in <tone>. Put the subject line first, as "Subject: ...". Keep the email under 150 words, focus on the reader rather than the sender, make one clear, low-pressure ask, and sign off with placeholders such as [Your name] for anything not given.',
    size: 'S', action: 'Write my email',
  },
  'article-rewriter': {
    fields: [text('Your article', 'Paste the article you want to rewrite', 10000, 12), sameTone],
    task: 'Rewrite the article in <text> in fresh wording, in the tone in <tone>. Keep its structure and headings, keep every fact, name, figure and quote accurate, and keep it about the same length. Return only the rewritten article.',
    size: 'XL', action: 'Rewrite it', note: OWN_WORK,
  },
  'meta-description-generator': {
    fields: [topic("What's the page about?", 'e.g. Our guide to choosing a first microphone for streaming'), mainKeyword],
    task: 'Write five meta descriptions for the web page described in <topic>. Make each one 120 to 155 characters long, in plain, active language, with the keyword in <keywords> worked in naturally if given, and give people a reason to click. Put each on its own line, numbered 1 to 5, with nothing else.',
    size: 'S', action: 'Write descriptions',
  },
  'real-estate-description': {
    fields: [topic('Property details', 'e.g. 3 bed, 2 bath house in Newtown, renovated kitchen, north-facing courtyard, 5 minutes to the station', 1500), tone('Professional'), words('Length', [80, 150, 250])],
    task: 'Write a property listing from the details in <topic>, in the tone in <tone>, at the length in <length>. Put a short headline on the first line, lead with the best features, and describe the lifestyle the property offers. Use only the details given: never add features, sizes, prices or distances. Avoid clichés like "stunning" and "nestled".',
    size: 'S', action: 'Write my listing',
    note: 'Check every detail before you publish. Property ads must be accurate.',
  },
  'blog-outline-generator': {
    fields: [topic('Blog post topic', 'e.g. How to grow a YouTube channel from zero'), keywords, audience],
    task: 'Create a detailed outline for a blog post about <topic>. Give a working title on the first line, then an introduction, five to eight main sections and a conclusion. Write each section heading on its own line, followed by two to four bullet points on what it should cover.',
    size: 'M', action: 'Create my outline',
  },
  'content-planner': {
    fields: [topic('Your niche or brand', 'e.g. A gaming channel about cosy indie games'), select('platform', 'Platform', ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'LinkedIn', 'X (Twitter)', ['A mix of platforms', 'a mix of platforms']]), seg('frequency', 'How often', [['2 a week', 'two posts a week'], ['3 a week', 'three posts a week'], ['Daily', 'one post a day']], '3 a week')],
    task: 'Create a four-week content plan for <topic> on <platform>, with <frequency>. Group it by week, with "Week 1" and so on on their own lines and a short theme for each week. For each post, give the day, the format (such as a reel, carousel, short, live or story) and the idea in one sentence. Mix posts that teach, entertain, build community and promote.',
    size: 'L', action: 'Plan my content',
  },
  'twitter-post-generator': {
    fields: [topic('What do you want to post about?', 'e.g. My top tip for staying consistent with uploads'), tone(), seg('format', 'Format', [['Single posts', 'five separate single posts'], ['A thread', 'one thread of five to eight posts']])],
    task: 'Write <format> for X (Twitter) about <topic>, in the tone in <tone>. Keep every post under 280 characters, make the first line grab attention, and use at most two hashtags, only where they really fit. Number the posts, with a blank line between them.',
    size: 'M', action: 'Write my posts',
  },
  'tiktok-script-writer': {
    fields: [topic('Video idea', 'e.g. Three mistakes new streamers make with their audio'), tone('Casual'), seg('length', 'Video length', [['15 seconds', 'about 15 seconds (around 40 spoken words)'], ['30 seconds', 'about 30 seconds (around 80 spoken words)'], ['60 seconds', 'about 60 seconds (around 150 spoken words)']], '30 seconds')],
    task: 'Write a TikTok script about <topic> for a video of <length>, in the tone in <tone>. Start with a hook for the first two seconds, then the main points, then a quick call to action. Use short lines, and put on-screen text and visual ideas in square brackets. After the script, add a caption idea and three to five hashtags.',
    size: 'M', action: 'Write my script',
  },
  'content-brief-generator': {
    fields: [topic('Topic', 'e.g. Best budget webcams for streaming'), mainKeyword, audience],
    task: "Create a content brief for a piece about <topic>. Use these parts, each with its heading on its own line: Goal, Audience, Main keyword and related terms, Search intent, Suggested title, Outline (headings with notes on what to cover), Questions to answer, Tone and style, Suggested length, Call to action. Base it on the topic given, and don't make up search volumes or statistics.",
    size: 'L', action: 'Create my brief',
  },
  'slogan-generator': {
    fields: [topic('What is the brand or product?', 'e.g. A family-run bakery that only uses local flour'), tone(), count(['10', '20'], '10')],
    task: 'Write <count> slogans for the brand described in <topic>, in the tone in <tone>. Keep each under ten words, easy to remember and true to what the brand offers. Vary the approach: some direct, some playful, some with rhythm or rhyme. Put each on its own line, numbered, with nothing else.',
    size: 'S', action: 'Write slogans',
  },
  'instagram-story-ideas': {
    fields: [topic('Your niche or account', 'e.g. A small candle business'), seg('goal', 'Goal', [['Engagement', 'getting more replies, votes and shares'], ['Promotion', 'promoting a product or offer'], ['Behind the scenes', 'showing what happens behind the scenes'], ['New followers', 'attracting new followers']]), count(['5', '10'], '10')],
    task: 'Suggest <count> Instagram story ideas for <topic>, focused on <goal>. For each idea, give a short title, what to show, and which sticker or feature to use (such as a poll, quiz, question box, countdown or link). Number them, and keep each idea to two or three lines.',
    size: 'M', action: 'Get ideas',
  },
  'facebook-ad-headlines': {
    fields: [topic('What are you advertising?', 'e.g. A 4-week online guitar course for beginners'), audience, tone()],
    task: "Write ten Facebook ad headlines for the offer in <topic>, in the tone in <tone>. Keep each under 40 characters, lead with a clear benefit, and vary the angle (benefit, curiosity, urgency, question). Don't promise results or use numbers that weren't given. Put each on its own line, numbered 1 to 10, with nothing else.",
    size: 'S', action: 'Write headlines',
  },
  'trivia-generator': {
    fields: [topic('Trivia topic', 'e.g. 90s video games'), seg('difficulty', 'Difficulty', [['Easy', 'easy'], ['Medium', 'medium'], ['Hard', 'hard']], 'Medium'), seg('format', 'Format', [['Multiple choice', 'multiple choice, with four options labelled A to D'], ['Open answer', 'a short open answer']]), count()],
    task: 'Write <count> trivia questions about <topic> at <difficulty> difficulty, each in this format: <format>. Only use facts you are confident are true and unlikely to have changed. Number each question and give the correct answer on the line after it, starting with "Answer:".',
    size: 'L', action: 'Write questions',
  },
  'press-release-generator': {
    fields: [topic("What's the news?", 'e.g. Our studio is launching free tech clinics for local creators'), details('Key details (optional)', 'e.g. Dates, location, who is involved, a quote, contact details')],
    task: 'Write a press release about the news in <topic>, using <details> if given. Use the standard format: "FOR IMMEDIATE RELEASE" on the first line, then a headline, a one-line subheading, an opening paragraph that covers who, what, when, where and why, two or three paragraphs of supporting detail, a quote, an "About" section and media contact details, and end with "###". Use only the facts given: for anything missing, including quotes, names, dates and contacts, use a placeholder in square brackets.',
    size: 'L', action: 'Write my press release',
  },
  'podcast-script-writer': {
    fields: [topic('Episode topic', 'e.g. How we grew our channel without paid ads'), seg('format', 'Format', [['Solo', 'a solo host'], ['Two hosts', 'two co-hosts'], ['Interview', 'a host interviewing a guest']]), seg('length', 'Episode length', [['5 minutes', 'about 5 minutes (around 750 spoken words)'], ['10 minutes', 'about 10 minutes (around 1,500 spoken words)'], ['15 minutes', 'about 15 minutes (around 2,200 spoken words)']], '10 minutes'), tone()],
    task: "Write a podcast episode script about <topic> for <format>, for an episode of <length>, in the tone in <tone>. Include a hook, an intro, clear segments that each start with a short heading on its own line, natural transitions, and an outro with a call to action. Start each spoken line with the speaker, such as \"Host:\". Keep it conversational. For an interview, write the host's lines and questions, with short notes in square brackets on what the guest might cover, instead of inventing the guest's answers.",
    size: 'XL', action: 'Write my script',
  },
  'faq-generator': {
    fields: [topic('What are the FAQs for?', 'e.g. Our weekend video editing course for beginners'), details('Facts to use (optional)', 'e.g. Prices, times, refund policy, what is included'), count(['5', '10'], '5')],
    task: 'Write <count> frequently asked questions with answers about <topic>, using the facts in <details> if given. Pick the questions real customers would ask, and answer each in two to four plain sentences. Never make up policies, prices or promises: where a fact is missing, use a placeholder in square brackets. Start each question with "Q:" and each answer, on the next line, with "A:".',
    size: 'M', action: 'Write my FAQs',
  },
  'blog-post-rewriter': {
    fields: [text('Your blog post', 'Paste the blog post you want to rewrite', 10000, 12), seg('goal', 'Goal', [['Refresh', 'fresher, clearer wording'], ['Simplify', 'simpler, easier reading'], ['More engaging', 'a more engaging, personal style'], ['Better structure', 'a clearer structure with helpful headings']]), keywords],
    task: 'Rewrite the blog post in <text> with <goal>. Keep its main points, facts and links, keep it about the same length, and work in the keywords in <keywords> naturally if given. Return only the rewritten post, with headings on their own lines.',
    size: 'XL', action: 'Rewrite my post', note: OWN_WORK,
  },
  'poll-generator': {
    fields: [topic('Poll topic', 'e.g. What my next video should be about'), seg('platform', 'For', [['Instagram story', 'an Instagram story poll (2 options)'], ['X or LinkedIn', 'an X or LinkedIn poll (up to 4 options)'], ['YouTube or Twitch', 'a YouTube or Twitch poll (up to 4 options)']]), count(['5', '10'], '5')],
    task: "Write <count> poll questions about <topic> for <platform>. Keep each question short and easy to answer, with short, distinct options that fit the platform's limit. Number the questions and list each one's options underneath, starting with \"- \".",
    size: 'M', action: 'Write my polls',
  },
  'landing-page-copy': {
    fields: [topic('What are you offering?', 'e.g. A free 15-minute setup check for new streamers'), audience, details('Key benefits or details (optional)', 'e.g. What is included, the price, how to book'), tone()],
    task: 'Write landing page copy for the offer in <topic>, using <details> if given. Use these parts, each labelled on its own line: Headline, Subheading, Call to action button, The problem, The solution, Benefits (three to five, each with a short title and one sentence), How it works (three steps), Social proof (placeholders only, such as [Customer quote]), FAQs (three), Final call to action. Keep it clear and specific, and focus on the reader.',
    size: 'L', action: 'Write my copy',
  },
  'listicle-writer': {
    fields: [topic('Listicle topic', 'e.g. Ways to make a bedroom stream setup look pro'), seg('count', 'Number of points', ['5', '7', '10'], '7'), tone()],
    task: 'Write a list article with <count> points about <topic>, in the tone in <tone>. Put a title that includes the number on the first line, then a short introduction. Number each point, give it a short heading, and follow it with a paragraph of two to four sentences. End with a brief conclusion.',
    size: 'L', action: 'Write my listicle',
  },
  'summarize-pdf': {
    fields: [pdf(30000), summaryStyle],
    task: "The text in <text> was taken from a PDF, so ignore stray page numbers, headers and broken lines. Summarise it as <format>. Keep the main ideas and any important names, numbers and dates, leave out minor details, and add nothing that isn't in the text. Write the summary in the language of the text.",
    size: 'M', action: 'Summarise my PDF', note: SCANS,
  },
  'translate-pdf': {
    fields: [pdf(5000), language],
    task: 'The text in <text> was taken from a PDF. Translate it into the language in <language>. Join broken lines into proper sentences, leave out stray page numbers and repeated headers, and keep the meaning, tone and paragraph breaks. Return only the translation.',
    size: 'XL', action: 'Translate my PDF',
    note: `You get the translated text to copy or download, not a new PDF. ${SCANS}`,
  },
};

/** Check and tidy the values for a template. Returns { values } or { error } (a sentence a creator can act on). */
export function checkFields(id, input) {
  const tpl = typeof id === 'string' && Object.hasOwn(TEMPLATES, id) ? TEMPLATES[id] : null;
  if (!tpl) return { error: "We don't have that writing tool. Refresh the page and try again." };
  const given = input && typeof input === 'object' ? input : {};
  const values = {};
  for (const f of tpl.fields) {
    let v = given[f.id];
    if (f.choices) {
      if (v === undefined || v === '') v = f.default;
      if (!f.choices.some((c) => c.value === v)) return { error: `Pick one of the options for "${f.label}".` };
    } else {
      v = typeof v === 'string' ? v.trim() : '';
      const max = f.max || (f.type === 'text' ? 200 : 1500);
      if (f.required && !v) return { error: f.type === 'pdf' ? 'Choose a PDF first.' : `Fill in "${f.label}" first.` };
      if (v.length > max) {
        const n = (x) => x.toLocaleString('en-AU');
        return { error: f.type === 'pdf'
          ? `This PDF has more text than we can take at once. The limit is ${n(max)} characters (about ${n(Math.max(1, Math.round(max / 3000)))} pages). Split it into smaller parts with our Split PDF tool, then try each part.`
          : `"${f.label}" is too long: ${n(v.length)} characters, and the limit is ${n(max)}. Shorten it and try again.` };
      }
    }
    values[f.id] = v;
  }
  return { values };
}
