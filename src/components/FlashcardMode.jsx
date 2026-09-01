import { useState, useMemo } from 'react';
import flashcards from '../data/flashcards.js';
import { DOMAINS, DOMAIN_WEIGHTS } from '../data/questions.js';
import {
  getFlashcardWeights,
  updateFlashcardWeight,
} from '../utils/flashcardProgress.js';
import { getWrongIds, updateWrongAnswers } from '../utils/history.js';
import questions from '../data/questions.js';
import { getCustomQuestions } from '../utils/customQuestions.js';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Orders one domain's (or the whole bank's) cards by spaced-repetition
// priority: due-for-review first (worst first), then unseen, then mastered.
function orderByPriority(cards, weights, count) {
  const due = cards
    .filter((c) => (weights[c.id] || 0) > 0)
    .sort((a, b) => (weights[b.id] || 0) - (weights[a.id] || 0));
  const unseen = shuffle(cards.filter((c) => !(c.id in weights)));
  const mastered = shuffle(
    cards.filter((c) => c.id in weights && weights[c.id] === 0),
  );
  const ordered = [...due, ...unseen, ...mastered];
  return count === 0 ? ordered : ordered.slice(0, count);
}

function buildTermsDeck(domain, count, weights) {
  if (domain > 0) {
    return orderByPriority(
      flashcards.filter((c) => c.domain === domain),
      weights,
      count,
    );
  }
  if (count === 0) {
    return orderByPriority(flashcards, weights, 0);
  }

  // "All Domains" with a capped count: allocate proportionally to real CISSP
  // domain weights (same idea as the question bank's CAT engine) instead of
  // pulling a flat/random mix that could over- or under-represent a domain
  // purely by chance.
  const domainNums = Object.keys(DOMAIN_WEIGHTS).map(Number);
  const totalWeight = domainNums.reduce((sum, d) => sum + DOMAIN_WEIGHTS[d], 0);
  const allocation = {};
  domainNums.forEach((d) => {
    allocation[d] = Math.floor((DOMAIN_WEIGHTS[d] / totalWeight) * count);
  });
  let remainder = count - Object.values(allocation).reduce((s, n) => s + n, 0);
  const byWeightDesc = [...domainNums].sort(
    (a, b) => DOMAIN_WEIGHTS[b] - DOMAIN_WEIGHTS[a],
  );
  for (let i = 0; remainder > 0; i++) {
    allocation[byWeightDesc[i % byWeightDesc.length]] += 1;
    remainder--;
  }

  const deck = domainNums.flatMap((d) =>
    orderByPriority(
      flashcards.filter((c) => c.domain === d),
      weights,
      allocation[d],
    ),
  );
  return shuffle(deck);
}

function buildQuestionsDeck(count) {
  const wrongIds = getWrongIds();
  if (wrongIds.size === 0) return [];
  const all = [...questions, ...getCustomQuestions()];
  const wrongQ = shuffle(all.filter((q) => wrongIds.has(q.id)));
  return count === 0 ? wrongQ : wrongQ.slice(0, count);
}

function questionToCard(q) {
  return {
    id: q.id,
    domain: q.domain,
    front: q.question,
    back: `Correct answer: ${OPTION_LABELS[q.answer]}. ${q.options[q.answer]}\n\n${q.explanation}`,
    isQuestion: true,
  };
}

export default function FlashcardMode({ onHome }) {
  const [phase, setPhase] = useState('setup');
  const [deckType, setDeckType] = useState('terms');
  const [domain, setDomain] = useState(0);
  const [count, setCount] = useState(25);

  // Study state
  const [deck, setDeck] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [missedIds, setMissedIds] = useState([]);

  // Summary state
  const [knewCount, setKnewCount] = useState(0);
  const [missedCount, setMissedCount] = useState(0);

  const wrongCount = useMemo(() => getWrongIds().size, []);

  const availableTerms =
    domain > 0
      ? flashcards.filter((c) => c.domain === domain).length
      : flashcards.length;
  const maxCount = deckType === 'terms' ? availableTerms : wrongCount;

  function startStudy(deckOverride = null) {
    let cards;
    if (deckOverride) {
      cards = deckOverride;
    } else if (deckType === 'terms') {
      cards = buildTermsDeck(
        domain,
        count === 0 ? 0 : count,
        getFlashcardWeights(),
      );
    } else {
      cards = buildQuestionsDeck(count === 0 ? 0 : count).map(questionToCard);
    }
    if (cards.length === 0) return;
    setDeck(cards);
    setIndex(0);
    setFlipped(false);
    setMissedIds([]);
    setKnewCount(0);
    setMissedCount(0);
    setPhase('study');
  }

  function handleRate(didKnow) {
    const card = deck[index];

    if (card.isQuestion) {
      updateWrongAnswers([
        {
          questionId: card.id,
          domain: card.domain,
          difficulty: 2,
          correct: didKnow,
        },
      ]);
    } else {
      updateFlashcardWeight(card.id, didKnow);
    }

    const newKnew = knewCount + (didKnow ? 1 : 0);
    const newMissed = missedCount + (didKnow ? 0 : 1);
    const newMissedIds = didKnow ? missedIds : [...missedIds, card.id];
    setKnewCount(newKnew);
    setMissedCount(newMissed);
    setMissedIds(newMissedIds);

    if (index + 1 < deck.length) {
      setIndex(index + 1);
      setFlipped(false);
    } else {
      setPhase('summary');
    }
  }

  // ── Setup ──
  if (phase === 'setup') {
    return (
      <div className="setup-card fc-setup">
        <div className="fc-setup__header">
          <button className="btn btn--ghost" onClick={onHome}>
            ← Home
          </button>
          <h2>Flashcards</h2>
        </div>

        <div className="form-group">
          <label>Deck</label>
          <div className="fc-deck-selector">
            <button
              className={`fc-deck-btn ${deckType === 'terms' ? 'fc-deck-btn--active' : ''}`}
              onClick={() => setDeckType('terms')}
            >
              <strong>CISSP Terms</strong>
              <small>{flashcards.length} concept cards</small>
            </button>
            <button
              className={`fc-deck-btn ${deckType === 'questions' ? 'fc-deck-btn--active' : ''}`}
              onClick={() => setDeckType('questions')}
              disabled={wrongCount === 0}
            >
              <strong>Wrong Questions</strong>
              <small>
                {wrongCount > 0
                  ? `${wrongCount} to review`
                  : 'No wrong answers yet'}
              </small>
            </button>
          </div>
        </div>

        {deckType === 'terms' && (
          <div className="form-group">
            <label>Domain</label>
            <select
              value={domain}
              onChange={(e) => setDomain(Number(e.target.value))}
            >
              <option value={0}>All Domains</option>
              {Object.entries(DOMAINS).map(([num, name]) => (
                <option key={num} value={Number(num)}>
                  Domain {num} – {name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label>
            Cards:{' '}
            <strong style={{ color: 'var(--heading)' }}>
              {count === 0 ? 'All' : count}
            </strong>
            {maxCount > 0 && (
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                {' '}
                of {maxCount}
              </span>
            )}
          </label>
          <input
            type="range"
            min={0}
            max={Math.max(50, maxCount)}
            step={5}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </div>

        <button
          className="btn btn--primary btn--full"
          onClick={() => startStudy()}
          disabled={maxCount === 0}
        >
          Start Flashcards →
        </button>
        <button className="btn btn--ghost btn--full" onClick={onHome}>
          ← Back
        </button>
      </div>
    );
  }

  // ── Summary ──
  if (phase === 'summary') {
    const total = knewCount + missedCount;
    const pct = total > 0 ? Math.round((knewCount / total) * 100) : 0;
    return (
      <div className="setup-card fc-summary">
        <h2>Session Complete</h2>
        <div className="fc-summary__score">{pct}%</div>
        <div className="fc-summary__detail">
          <span className="fc-summary__knew">✓ {knewCount} knew it</span>
          <span className="fc-summary__missed">
            ✗ {missedCount} still learning
          </span>
        </div>
        <div className="fc-summary__actions">
          {missedCount > 0 && (
            <button
              className="btn btn--secondary"
              onClick={() => {
                const missed = deck.filter((c) => missedIds.includes(c.id));
                startStudy(shuffle(missed));
              }}
            >
              Review {missedCount} Missed →
            </button>
          )}
          <button className="btn btn--secondary" onClick={() => startStudy()}>
            Study Again
          </button>
          <button className="btn btn--primary" onClick={onHome}>
            Home
          </button>
        </div>
      </div>
    );
  }

  // ── Study ──
  const card = deck[index];
  const progress = `${index + 1} / ${deck.length}`;

  return (
    <div className="fc-layout">
      <header className="fc-header">
        <button className="btn btn--ghost" onClick={onHome}>
          ← Home
        </button>
        <div className="fc-header__title">Flashcards</div>
        <div className="fc-header__progress">{progress}</div>
      </header>

      <main className="fc-main">
        <div className="fc-domain-badge">{DOMAINS[card.domain]}</div>

        <div className="fc-scene" onClick={() => !flipped && setFlipped(true)}>
          <div className={`fc-card ${flipped ? 'fc-card--flipped' : ''}`}>
            <div className="fc-card__face fc-card__front">
              <div className="fc-card__content">
                <p className="fc-card__text">{card.front}</p>
                {!flipped && (
                  <span className="fc-card__hint">Tap to reveal →</span>
                )}
              </div>
            </div>
            <div className="fc-card__face fc-card__back">
              <div className="fc-card__content">
                <p className="fc-card__text fc-card__text--back">{card.back}</p>
              </div>
            </div>
          </div>
        </div>

        {flipped && (
          <div className="fc-rating">
            <button
              className="btn fc-btn-miss"
              onClick={() => handleRate(false)}
            >
              ✗ Still Learning
            </button>
            <button
              className="btn fc-btn-know"
              onClick={() => handleRate(true)}
            >
              ✓ Know It
            </button>
          </div>
        )}

        <div className="fc-progress-bar">
          <div
            className="fc-progress-bar__fill"
            style={{ width: `${(index / deck.length) * 100}%` }}
          />
        </div>
      </main>
    </div>
  );
}
