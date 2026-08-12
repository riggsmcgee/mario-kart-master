/**
 * The doorman. (4e2)
 *
 * "Who's training?" — asked once, before Chapter 0, and it decides who the site thinks it is
 * talking to. Built almost last, on purpose: it templates over finished copy rather than shaping
 * it, so nothing above it had to be designed around four audiences.
 *
 * The joke is Kayla's. She will find this site on her mum's laptop, she will click her own name
 * to see what happens, and the site will lock. That has to land as *funny*, which puts two
 * constraints on it that are easy to miss:
 *
 *  - **It has to be deadpan.** Not a taunt, not a gloating animation. The comedy is the site
 *    being flatly bureaucratic at her. A site that trash-talks her is a site that is mean to a
 *    kid, and the plan's first design principle is that this makes people smile.
 *  - **The way out is always visible.** "Change user" is the only live control, and it is
 *    obviously live. A lockout with no exit stops being a joke about thirty seconds in.
 *
 * Nothing is stored for her, which is also the honest engineering answer: her role never reaches
 * the server, so there is no row anywhere recording that Kayla was locked out.
 */

import type { PlayerRole } from '../backend/schema';
import type { ProgressStore } from '../backend/progress';
import type { Sfx } from '../ui/sfx';
import { turboJodi } from '../ui/mascot';
import { el, rich } from './dom';
import { RIVAL } from './player';
import type { Mounted } from './types';

const STORAGE_KEY = 'mkm.doorman.v1';

export interface DoormanChoice {
  role: PlayerRole;
  /** Only set for "someone else". */
  name?: string;
}

/** Has the doorman been answered on this machine? */
export function doormanAnswered(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'done';
  } catch {
    return false;
  }
}

export function markDoormanAnswered(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'done');
  } catch {
    // Private browsing. She gets asked again next time, which is a small cost.
  }
}

export function forgetDoorman(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to forget.
  }
}

export interface DoormanDeps {
  progress: ProgressStore;
  sfx: Sfx;
  onChosen: (choice: DoormanChoice) => void;
}

const OPTIONS: Array<{ role: PlayerRole; label: string; blurb: string }> = [
  { role: 'jodi', label: 'Jodi', blurb: 'The whole point of this' },
  { role: 'bill', label: 'Bill', blurb: 'Same course, your name on it' },
  { role: 'kayla', label: RIVAL, blurb: 'Hmm' },
  { role: 'other', label: 'Someone else', blurb: "We'll take all comers" },
];

export function renderDoorman(mount: HTMLElement, deps: DoormanDeps): Mounted {
  const { progress, sfx, onChosen } = deps;

  const root = el('div', { class: 'doorman wrap' });

  const options = el('div', { class: 'doorman-options' });

  function choose(role: PlayerRole, name?: string): void {
    markDoormanAnswered();
    progress.setRole(role);
    if (name) progress.setDisplayName(name);
    sfx.play('page');
    onChosen(name === undefined ? { role } : { role, name });
  }

  /** The gag. Deadpan, and with the exit in plain sight from the first frame. */
  function lockOut(): void {
    markDoormanAnswered();
    progress.setRole('kayla');

    const back = el('button', { class: 'btn btn-go', type: 'button' }, 'Change user');
    back.addEventListener('click', () => {
      forgetDoorman();
      render();
    });

    root.replaceChildren(
      el('p', { class: 'eyebrow' }, 'Access review'),
      el('h1', null, `Why are you here, ${RIVAL}?`),
      el(
        'p',
        { class: 'hero-lede', style: { marginInline: 'auto' } },
        rich(
          'This site was built for someone else, and you already know all of it. That is rather the problem.',
        ),
      ),
      el(
        'p',
        { style: { marginInline: 'auto', color: 'var(--ink-soft)' } },
        'Every chapter is right there. All of them are locked. Nothing you do here is saved.',
      ),
      back,
      el(
        'p',
        { class: 'eyebrow', style: { marginTop: '2rem' } },
        'This message is affectionate. Mostly.',
      ),
    );
  }

  function askName(): void {
    const input = el('input', {
      type: 'text',
      placeholder: 'Your name',
      style: {
        font: 'inherit',
        fontSize: '1.2rem',
        padding: '0.7em 1em',
        borderRadius: '14px',
        border: '2px solid var(--rule)',
        minWidth: '14rem',
      },
    });
    input.setAttribute('aria-label', 'Your name');

    const done = el('button', { class: 'btn btn-go', type: 'button' }, 'Start the course');
    const submit = (): void => {
      const value = input.value.trim();
      if (!value) {
        input.focus();
        return;
      }
      choose('other', value);
    };
    done.addEventListener('click', submit);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') submit();
    });

    root.replaceChildren(
      el('p', { class: 'eyebrow' }, 'Right then'),
      el('h1', null, 'What do we call you?'),
      el(
        'p',
        { class: 'hero-lede', style: { marginInline: 'auto' } },
        'The whole course will use it. You also get the full kart-parts browser at the end, which Jodi does not.',
      ),
      el(
        'div',
        { style: { display: 'flex', gap: '0.7rem', flexWrap: 'wrap', justifyContent: 'center' } },
        input,
        done,
      ),
    );
    input.focus();
  }

  function render(): void {
    options.replaceChildren();
    for (const option of OPTIONS) {
      const button = el(
        'button',
        { class: 'doorman-option', type: 'button' },
        el('span', null, option.label),
        el(
          'span',
          {
            style: {
              display: 'block',
              fontFamily: 'var(--body)',
              fontSize: '0.95rem',
              fontWeight: '400',
              color: 'var(--ink-soft)',
              marginTop: '0.4rem',
            },
          },
          option.blurb,
        ),
      );
      button.addEventListener('click', () => {
        if (option.role === 'kayla') lockOut();
        else if (option.role === 'other') askName();
        else choose(option.role);
      });
      options.append(button);
    }

    root.replaceChildren(
      turboJodi({ size: 84, motion: true, title: 'Turbo Jodi' }),
      el('p', { class: 'eyebrow' }, 'Before we start'),
      el('h1', null, "Who's training?"),
      options,
    );
  }

  render();
  mount.replaceChildren(root);

  return {
    dispose() {
      root.remove();
    },
  };
}
