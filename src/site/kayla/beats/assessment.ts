/**
 * Beat 5 — the assessment. (4e4)
 *
 * The turn, and the best idea in the whole experience: **to get into a course about being bad at
 * Mario Kart, Kayla has to be bad at Mario Kart.**
 *
 * Three questions, straight out of Jodi's chapters. Kayla knows all three answers — she has known
 * them since she was small, which is the entire reason this website exists. So she answers
 * correctly, and the terminal rejects her, because correct answers are evidence that she does not
 * need the thing she is applying for. To be admitted she has to look at each question and pick the
 * answer *her mum would have given*, which means the puzzle is not "what is right" but "what does
 * somebody who has not been told this yet think is right" — and that is the exact act of imagination
 * the whole site is asking Jodi to be on the other end of.
 *
 * It also lets the last question do something no other beat can. Jodi drives a heavy kart because
 * Kayla told her heavier is better. It *is* better, at 150cc, for somebody who is rarely hit; they
 * play 100cc with items on, where it is not. So the beginner answer there is Kayla's own advice,
 * quoted back to her, and the terminal accepts it. Nobody is told off. It is simply put on the
 * record, deadpan, and moved past — which is the only register in which that joke is funny rather
 * than pointed.
 *
 * **The rejection has to teach.** A wrong answer that only says "no" is a guessing game, so the
 * three rejections are written as a ladder: the first is bureaucratic, the second explains the rule
 * in the abstract, the third states it outright. By the third she cannot fail to know what is being
 * asked of her, and she is likely to have worked it out at the first.
 *
 * **Three questions, not four.** The fourth (a ramp, and whether to hop off it) was cut on the third
 * pass. The joke is fully made by the second question and the third is the one with her name on it;
 * a fourth was the beat asking her to keep proving a point she had already taken.
 */

import { el } from '../../dom';
import { deferred, type Beat, type Stage } from '../stage';

/**
 * One option.
 *
 * **`pass` is present on every answer except the right one.** (Riggs, 2026-08-13: "there is
 * technically two wrong answers... only one of the wrong answers is actually correct.")
 *
 * He caught a real contradiction. The beat teaches one rule — *get them wrong* — and the first
 * version only accepted a single nominated wrong answer, so picking the other wrong answer was
 * refused and the rule she had just been taught was, visibly, a lie. That is the worst kind of
 * puzzle bug: it does not look like a bug, it looks like the game being arbitrary.
 *
 * So the rule is now literally true. Exactly one option per question is the answer Jodi's course
 * teaches, and it is the only one that fails. Every other option is a way of not knowing, and each
 * gets its own reply — which makes the terminal funnier rather than lazier, because it now has to
 * say something specific about each flavour of wrong.
 */
interface Option {
  text: string;
  /** The terminal's reply when this one is chosen. Absent on the expert answer, which is refused. */
  pass?: string;
}

interface Question {
  /** The situation, in the terminal's flat civil-service voice. */
  ask: string;
  options: Option[];
}

const QUESTIONS: Question[] = [
  {
    ask: 'You are holding a green shell. Another kart is close behind you.',
    options: [
      { text: 'Hold it where it is' },
      {
        text: 'Fire it forwards straight away',
        pass: 'Accepted. Green shells travel in straight lines. So do very few racetracks.',
      },
      {
        text: 'Fire it backwards straight away',
        pass: 'Accepted. You have thrown away a shield in order to maybe hit one person once.',
      },
    ],
  },
  {
    ask: 'A coin is on the racing line. You already have ten.',
    options: [
      { text: 'Take it anyway' },
      {
        text: 'Steer around it — ten is the cap',
        pass: 'Accepted. Ten is the cap. You lose three every time you are hit. Do go on.',
      },
      {
        text: 'Ignore coins, they are decoration',
        pass: 'Accepted. Coins are top speed. This is the single most common thing nobody knows.',
      },
    ],
  },
  {
    ask: 'You are choosing a kart. Races are 100cc, items on, against one very fast opponent.',
    options: [
      { text: 'A light build, for acceleration' },
      {
        text: 'The heaviest one available',
        pass: 'Accepted. Heavier is better at 150cc for somebody who is rarely hit. She is hit constantly.',
      },
      {
        text: 'Whichever one looks best',
        pass: 'Accepted, and honestly the second best answer on this form.',
      },
    ],
  },
];

/** Escalating clarity. By the third one she has been told the rule in plain words. */
const REJECTIONS = [
  ['Assessment failed.', 'Your answer was correct.'],
  [
    'Assessment failed. Again.',
    'This is a course for people who do not know this. You keep proving you do.',
  ],
  [
    'Assessment failed.',
    'I will say it plainly and then we can both stop. **Get them wrong.**',
    'Answer the way somebody would answer who had never been told.',
  ],
];

export const assessment: Beat = {
  id: 'assessment',
  title: '5 — The assessment',

  async run(stage: Stage): Promise<void> {
    const { narrator, scene } = stage;

    scene.replaceChildren();

    const stageRoot = scene.closest<HTMLElement>('.k-stage');
    stageRoot?.setAttribute('data-layer', 'deep');
    narrator.mood('official');

    const number = el('p', { class: 'k-stencil' }, 'Form 9A · Confirmation of nothing');
    const ask = el('p', { class: 'k-ask' });
    const options = el('div', { class: 'k-options' });
    const verdict = el('p', {
      class: 'k-verdict',
      attrs: { role: 'status', 'aria-live': 'polite' },
    });

    const form = el('div', { class: 'k-panel k-form' }, number, ask, options, verdict);
    scene.append(form);

    const solved = deferred();
    let index = 0;
    let refused = 0;

    function paint(): void {
      const question = QUESTIONS[index];
      if (!question) return;

      number.textContent = `Form 9A · Question ${index + 1} of ${QUESTIONS.length}`;
      ask.textContent = question.ask;
      verdict.textContent = '';

      options.replaceChildren(
        ...question.options.map((option) => {
          const button = el('button', { class: 'k-option', type: 'button' }, option.text);
          button.addEventListener('click', () => choose(option));
          return button;
        }),
      );
    }

    function choose(option: Option): void {
      narrator.poke();

      if (option.pass === undefined) {
        const lines = REJECTIONS[Math.min(refused, REJECTIONS.length - 1)] ?? [
          'Assessment failed.',
        ];
        refused += 1;
        verdict.textContent = 'REJECTED';
        verdict.classList.add('k-rejected');
        stage.reed.note(146.83, { ms: 320, chalumeau: true });
        void narrator.cut(...lines);

        // The form resets to question one, which is the only bureaucratic thing it does that
        // actually costs her anything — and it costs about eight seconds.
        index = 0;
        stage.after(900, () => {
          verdict.classList.remove('k-rejected');
          paint();
        });
        return;
      }

      verdict.textContent = 'ACCEPTED';
      verdict.classList.remove('k-rejected');
      stage.reed.note(523.25, { ms: 220 });
      void narrator.cut(option.pass);

      index += 1;
      if (index >= QUESTIONS.length) {
        solved.resolve();
        return;
      }
      stage.after(1100, paint);
    }

    narrator.nudge(
      'You answered that correctly. That is what the problem is.',
      'Think about who this form is for. It is not for somebody who knows.',
      'Answer them wrong. Answer them the way she would have answered them a year ago.',
    );

    // Question one is on screen and answerable before the introduction has finished being read out.
    paint();
    void narrator.say(
      'A form. There is a form for this. I have just this moment invented it.',
      `${QUESTIONS.length} questions. Answer them correctly and I will let you through.`,
    );

    await solved.promise;
    narrator.hush();

    await narrator.solved(
      `${QUESTIONS.length} from ${QUESTIONS.length}. Comprehensively wrong.`,
      'You have qualified as a beginner. Congratulations, I suppose.',
    );
  },
};
