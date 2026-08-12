/**
 * Quiz card. (1d1)
 *
 * Chapter 2 is item decisions and Chapter 4 is spotting boost pads; both are the same shape of
 * thing — here is a situation, what do you do — so both get this component.
 *
 * Three rules decide everything below, and the gate (1d2) asks about all three:
 *
 * 1. **It must feel like a quiz moment, not a test.** No timer, no streak to protect, no red
 *    cross. A wrong answer is the most useful thing that can happen on a teaching site, so it
 *    is answered with a reason rather than a buzzer.
 * 2. **Every answer gets its own reply.** A single "wrong, the answer was B" teaches nothing to
 *    the person who picked C, because it never engages with why C looked right. Each option
 *    carries its own response, so the card can say *why that one loses* — which is the actual
 *    lesson.
 * 3. **Authored as plain JSON.** Chapter 2 wants eight to twelve of these. Writing them has to
 *    be typing sentences into a list, or they will not get written.
 *
 * The one thing worth knowing about the code: JSON has no compiler, so {@link parseQuiz} checks
 * the file at load and throws with the question index and the missing field. A typo in a data
 * file should say what is wrong, not render a blank card.
 */

import { renderDiagram, type DiagramSpec, type MarkerKind, type RoadShape } from './quiz-diagram';

export interface QuizAnswer {
  id: string;
  /** What the button says. Short enough to read at a glance. */
  label: string;
  correct?: boolean;
  /** Said back when this one is chosen — warm whether it is right or wrong. */
  response: string;
}

export interface QuizQuestion {
  id: string;
  /** Where you are and what you are holding. One line, set before the question. */
  situation: string;
  prompt: string;
  diagram?: DiagramSpec;
  answers: QuizAnswer[];
  /** The line to remember, shown whichever answer was picked. */
  takeaway: string;
}

export interface QuizResult {
  questionId: string;
  answerId: string;
  correct: boolean;
  /** Which card it was, from 0. */
  index: number;
}

export interface QuizSummary {
  correct: number;
  total: number;
}

// --- authoring ------------------------------------------------------------

const ROAD_SHAPES: ReadonlySet<string> = new Set<RoadShape>([
  'straight',
  'bend-left',
  'bend-right',
]);

const MARKER_KINDS: ReadonlySet<string> = new Set<MarkerKind>([
  'you',
  'rival',
  'pack',
  'banana',
  'shell',
  'shell-green',
  'bomb',
  'coin',
  'pad',
  'box',
]);

function fail(where: string, problem: string): never {
  throw new Error(`Quiz data: ${where} ${problem}.`);
}

function str(value: unknown, where: string, field: string): string {
  const found = (value as Record<string, unknown>)[field];
  if (typeof found !== 'string' || found.length === 0) fail(where, `is missing "${field}"`);
  return found;
}

function parseDiagram(raw: unknown, where: string): DiagramSpec {
  if (typeof raw !== 'object' || raw === null) fail(where, 'has a diagram that is not an object');
  const source = raw as Record<string, unknown>;

  const road = source['road'];
  if (typeof road !== 'string' || !ROAD_SHAPES.has(road)) {
    fail(where, `has diagram.road "${String(road)}", which is not straight/bend-left/bend-right`);
  }

  const markers = source['markers'];
  if (!Array.isArray(markers)) fail(where, 'has a diagram with no markers array');

  const parsed = markers.map((entry, i) => {
    const place = `${where} marker ${i}`;
    if (typeof entry !== 'object' || entry === null) fail(place, 'is not an object');
    const item = entry as Record<string, unknown>;

    const kind = item['kind'];
    if (typeof kind !== 'string' || !MARKER_KINDS.has(kind)) {
      fail(place, `has kind "${String(kind)}", which is not a marker this diagram can draw`);
    }
    const at = item['at'];
    if (typeof at !== 'number') fail(place, 'is missing a numeric "at"');

    const marker: DiagramSpec['markers'][number] = { kind: kind as MarkerKind, at };
    if (typeof item['lane'] === 'number') marker.lane = item['lane'];
    if (typeof item['label'] === 'string') marker.label = item['label'];
    return marker;
  });

  const spec: DiagramSpec = { road: road as RoadShape, markers: parsed };
  if (typeof source['caption'] === 'string') spec.caption = source['caption'];
  return spec;
}

/**
 * Turn an imported JSON file into questions, or throw saying exactly what is wrong with it.
 *
 * Worth the fifty lines: this is the only file in the project a non-programmer might edit, and
 * the difference between "Quiz data: question 2 answer 1 is missing "response"" and a silently
 * blank card is the difference between a five-second fix and an afternoon.
 */
export function parseQuiz(raw: unknown): QuizQuestion[] {
  if (!Array.isArray(raw))
    throw new Error('Quiz data: the file must be a JSON array of questions.');

  return raw.map((entry, index) => {
    const where = `question ${index}`;
    if (typeof entry !== 'object' || entry === null) fail(where, 'is not an object');
    const source = entry as Record<string, unknown>;

    const answersRaw = source['answers'];
    if (!Array.isArray(answersRaw)) fail(where, 'has no answers array');
    if (answersRaw.length < 2 || answersRaw.length > 4) {
      fail(where, `has ${answersRaw.length} answers; a card takes 2 to 4`);
    }

    const answers = answersRaw.map((answerRaw, i) => {
      const place = `${where} answer ${i}`;
      if (typeof answerRaw !== 'object' || answerRaw === null) fail(place, 'is not an object');
      const answer: QuizAnswer = {
        id: str(answerRaw, place, 'id'),
        label: str(answerRaw, place, 'label'),
        response: str(answerRaw, place, 'response'),
      };
      if ((answerRaw as Record<string, unknown>)['correct'] === true) answer.correct = true;
      return answer;
    });

    const rightOnes = answers.filter((a) => a.correct);
    if (rightOnes.length !== 1) {
      fail(where, `marks ${rightOnes.length} answers "correct": true; it needs exactly one`);
    }

    const question: QuizQuestion = {
      id: str(source, where, 'id'),
      situation: str(source, where, 'situation'),
      prompt: str(source, where, 'prompt'),
      takeaway: str(source, where, 'takeaway'),
      answers,
    };
    if (source['diagram'] !== undefined) question.diagram = parseDiagram(source['diagram'], where);
    return question;
  });
}

// --- templating ------------------------------------------------------------

/**
 * Route every authored string in a card through `{name}`/`{rival}` templating.
 *
 * The decks write `{rival}` rather than a literal name (4e1), which means *nothing* may render a
 * card string without passing it through here first — and that is exactly the sort of rule that
 * gets obeyed in one place and forgotten in another. It was: this lived inside Chapter 2, so the
 * testbed's quiz page, loading the same JSON, printed a literal "{rival}" on screen.
 *
 * It belongs next to the component that renders the cards, so every caller has it to hand.
 */
export function fillQuiz(questions: QuizQuestion[], t: (text: string) => string): QuizQuestion[] {
  const fillDiagram = (diagram: DiagramSpec): DiagramSpec => {
    const next: DiagramSpec = {
      ...diagram,
      markers: diagram.markers.map((marker) =>
        marker.label === undefined ? marker : { ...marker, label: t(marker.label) },
      ),
    };
    if (next.caption !== undefined) next.caption = t(next.caption);
    return next;
  };

  return questions.map((question) => {
    const next: QuizQuestion = {
      ...question,
      situation: t(question.situation),
      prompt: t(question.prompt),
      takeaway: t(question.takeaway),
      answers: question.answers.map((answer) => ({
        ...answer,
        label: t(answer.label),
        response: t(answer.response),
      })),
    };
    if (next.diagram) next.diagram = fillDiagram(next.diagram);
    return next;
  });
}

// --- the card -------------------------------------------------------------

/**
 * Openers for the reply. Picked by card number rather than at random, so the same question
 * always reads the same way — and so a run of cards does not say "Yes." four times.
 */
const WELL_DONE = ['Yes.', "That's the one.", 'Exactly right.', 'Got it.'];
const NOT_QUITE = ['Not this time.', 'Close.', 'Nearly.', 'Tempting, but no.'];

export interface QuizOptions {
  mount: HTMLElement;
  questions: QuizQuestion[];
  onAnswer?: ((result: QuizResult) => void) | undefined;
  onComplete?: ((summary: QuizSummary) => void) | undefined;
}

export class Quiz {
  private readonly questions: QuizQuestion[];
  private readonly onAnswer: ((result: QuizResult) => void) | undefined;
  private readonly onComplete: ((summary: QuizSummary) => void) | undefined;

  private readonly root: HTMLDivElement;
  private readonly dots: HTMLDivElement;
  private readonly figure: HTMLElement;
  private readonly situation: HTMLParagraphElement;
  private readonly prompt: HTMLHeadingElement;
  private readonly options: HTMLDivElement;
  private readonly reply: HTMLDivElement;
  private readonly verdict: HTMLParagraphElement;
  private readonly detail: HTMLParagraphElement;
  private readonly takeaway: HTMLParagraphElement;
  private readonly next: HTMLButtonElement;

  private index = 0;
  private answered = false;
  private correct = 0;
  private buttons: HTMLButtonElement[] = [];
  private disposed = false;

  constructor(options: QuizOptions) {
    this.questions = options.questions;
    this.onAnswer = options.onAnswer;
    this.onComplete = options.onComplete;

    this.root = document.createElement('div');
    this.root.className = 'quiz';

    this.dots = document.createElement('div');
    this.dots.className = 'quiz-dots';

    this.figure = document.createElement('figure');
    this.figure.className = 'quiz-figure';

    this.situation = document.createElement('p');
    this.situation.className = 'quiz-situation';

    this.prompt = document.createElement('h3');
    this.prompt.className = 'quiz-prompt';

    this.options = document.createElement('div');
    this.options.className = 'quiz-answers';

    this.verdict = document.createElement('p');
    this.verdict.className = 'quiz-verdict';

    this.detail = document.createElement('p');
    this.detail.className = 'quiz-detail';

    this.takeaway = document.createElement('p');
    this.takeaway.className = 'quiz-takeaway';

    this.next = document.createElement('button');
    this.next.className = 'quiz-next';
    this.next.type = 'button';
    this.next.addEventListener('click', () => this.advance());

    this.reply = document.createElement('div');
    this.reply.className = 'quiz-reply';
    this.reply.hidden = true;
    // Announced rather than merely drawn: the reply is the teaching, and it appears far from
    // where the eye is (on the button that was just clicked).
    this.reply.setAttribute('role', 'status');
    this.reply.append(this.verdict, this.detail, this.takeaway, this.next);

    this.root.append(this.dots, this.figure, this.situation, this.prompt, this.options, this.reply);
    options.mount.append(this.root);

    window.addEventListener('keydown', this.onKeyDown);
    this.show();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener('keydown', this.onKeyDown);
    this.root.remove();
  }

  restart(): void {
    this.index = 0;
    this.correct = 0;
    this.answered = false;
    this.show();
  }

  summary(): QuizSummary {
    return { correct: this.correct, total: this.questions.length };
  }

  /** Number keys pick an answer. Enter is left to the browser — the Next button holds focus. */
  private onKeyDown = (event: KeyboardEvent): void => {
    if (this.answered || event.defaultPrevented || event.metaKey || event.ctrlKey) return;
    const match = /^Digit([1-9])$/.exec(event.code);
    if (!match?.[1]) return;
    const button = this.buttons[Number(match[1]) - 1];
    if (!button) return;
    event.preventDefault();
    button.click();
  };

  private show(): void {
    const question = this.questions[this.index];
    if (!question) return;

    this.answered = false;
    this.reply.hidden = true;
    this.figure.replaceChildren();
    this.options.replaceChildren();
    this.buttons = [];

    this.dots.replaceChildren();
    for (let i = 0; i < this.questions.length; i++) {
      const dot = document.createElement('span');
      dot.className = 'quiz-dot';
      dot.dataset.state = i < this.index ? 'done' : i === this.index ? 'here' : 'ahead';
      this.dots.append(dot);
    }

    if (question.diagram) {
      this.figure.append(renderDiagram(question.diagram, question.situation));
      if (question.diagram.caption) {
        const caption = document.createElement('figcaption');
        caption.textContent = question.diagram.caption;
        this.figure.append(caption);
      }
    }

    this.situation.textContent = question.situation;
    this.prompt.textContent = question.prompt;

    question.answers.forEach((answer, i) => {
      const button = document.createElement('button');
      button.className = 'quiz-answer';
      button.type = 'button';

      const key = document.createElement('span');
      key.className = 'quiz-key';
      key.textContent = String(i + 1);

      const text = document.createElement('span');
      text.textContent = answer.label;

      button.append(key, text);
      button.addEventListener('click', () => this.choose(answer));
      this.options.append(button);
      this.buttons.push(button);
    });
  }

  private choose(answer: QuizAnswer): void {
    if (this.answered) return;
    const question = this.questions[this.index];
    if (!question) return;

    this.answered = true;
    const right = answer.correct === true;
    if (right) this.correct++;

    // Every button gets marked, not just the one that was pressed: seeing which one was right
    // beside the one you picked is the comparison that does the teaching.
    question.answers.forEach((option, i) => {
      const button = this.buttons[i];
      if (!button) return;
      button.disabled = true;
      button.dataset.state = option.correct
        ? 'right'
        : option.id === answer.id
          ? 'picked'
          : 'other';
    });

    const pool = right ? WELL_DONE : NOT_QUITE;
    this.verdict.textContent = pool[this.index % pool.length] ?? '';
    this.verdict.dataset.right = String(right);
    this.detail.textContent = answer.response;
    this.takeaway.textContent = question.takeaway;

    const last = this.index === this.questions.length - 1;
    this.next.textContent = last ? 'Finish' : 'Next situation';
    this.reply.hidden = false;
    // Move focus so Enter carries on. Someone answering by keyboard should never have to reach
    // for the mouse to see the next card.
    this.next.focus();

    this.onAnswer?.({
      questionId: question.id,
      answerId: answer.id,
      correct: right,
      index: this.index,
    });
  }

  private advance(): void {
    if (this.index >= this.questions.length - 1) {
      this.onComplete?.(this.summary());
      return;
    }
    this.index++;
    this.show();
  }
}
