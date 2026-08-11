import '../../ui/testbed.css';
import '../../ui/proto.css';
import '../../ui/quiz.css';
import { installErrorBanner } from '../../ui/error-banner';
import { Quiz, parseQuiz, type QuizResult, type QuizSummary } from '../../ui/quiz';
import itemSmarts from '../../data/quiz/item-smarts.json';

installErrorBanner();

/**
 * Quiz harness. (1d1)
 *
 * No tuning panel: there is no feel constant here. What gate 1d2 is judging is the writing and
 * the pacing, so the harness stays out of the way and shows the card at the width it will have
 * in the real chapter.
 */

const questions = parseQuiz(itemSmarts);

const mount = document.querySelector<HTMLElement>('#quiz');
const score = document.querySelector<HTMLElement>('#score');
const log = document.querySelector<HTMLOListElement>('#log');
const again = document.querySelector<HTMLButtonElement>('#again');

const quiz = mount ? new Quiz({ mount, questions, onAnswer: record, onComplete: finish }) : null;

function record(result: QuizResult): void {
  if (log) {
    const li = document.createElement('li');
    li.className = result.correct ? 'down' : '';
    li.textContent = `${result.index + 1}. ${result.questionId} → ${result.answerId} ${result.correct ? '✓' : '✗'}`;
    log.append(li);
  }
  show(quiz?.summary());
}

function finish(summary: QuizSummary): void {
  show(summary);
  if (again) {
    again.hidden = false;
    again.focus();
  }
}

function show(summary: QuizSummary | undefined): void {
  if (!score || !summary) return;
  score.textContent = `${summary.correct} of ${summary.total}`;
}

again?.addEventListener('click', () => {
  again.hidden = true;
  log?.replaceChildren();
  if (score) score.textContent = '';
  quiz?.restart();
});
