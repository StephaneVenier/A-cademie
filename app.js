let currentUser = null;
let currentUserData = {
  xp: 0,
  level: 1
};

function xpToLevel(xp) {
  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;
  const needed = 100;
  return { level, xpInLevel, needed };
}

function updateXpUI() {
  const levelLabelEls = document.querySelectorAll('#user-level-label');
  const xpLabelEls = document.querySelectorAll('#user-xp-label');
  const xpBarInner = document.querySelector('#xp-bar-inner');
  const xpNextLabel = document.querySelector('#xp-next-label');

  const { level, xpInLevel, needed } = xpToLevel(currentUserData.xp);

  levelLabelEls.forEach(el => el.textContent = `Niveau ${level}`);
  xpLabelEls.forEach(el => el.textContent = `${currentUserData.xp} XP`);

  if (xpBarInner) {
    const pct = Math.min(100, (xpInLevel / needed) * 100);
    xpBarInner.style.width = pct + '%';
  }
  if (xpNextLabel) {
    xpNextLabel.textContent = `${xpInLevel} / ${needed} XP vers le niveau suivant`;
  }

  // Badges
  const badgeCards = document.querySelectorAll('.badge-card');
  badgeCards.forEach(card => {
    const minXp = parseInt(card.getAttribute('data-min-xp') || '0', 10);
    const statusEl = card.querySelector('.badge-status span');
    if (!statusEl) return;
    if (currentUserData.xp >= minXp) {
      statusEl.textContent = 'Débloqué';
      statusEl.style.color = '#4ade80';
    } else {
      statusEl.textContent = 'Verrouillé';
      statusEl.style.color = '#f97373';
    }
  });
}

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

async function ensureUserDoc(user) {
  const ref = db.collection('users').doc(user.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      xp: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    currentUserData.xp = 0;
  } else {
    const data = snap.data();
    currentUserData.xp = data.xp || 0;
  }
  updateXpUI();
}

async function addXp(amount, reason) {
  if (!currentUser) return;
  const ref = db.collection('users').doc(currentUser.uid);
  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    let xp = 0;
    if (doc.exists) {
      xp = doc.data().xp || 0;
    }
    xp += amount;
    currentUserData.xp = xp;
    tx.set(ref, {
      xp,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });
  updateXpUI();
  showToast(`+${amount} XP ${reason ? '– ' + reason : ''}`);
}

function setupArticleXpHandlers() {
  const readBtn = document.querySelector('.article-xp-box [data-action="read"]');
  if (readBtn) {
    readBtn.addEventListener('click', async () => {
      await addXp(10, 'Lecture d’article');
    });
  }

  const quizForm = document.querySelector('.quiz-form');
  if (quizForm) {
    quizForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const feedback = quizForm.querySelector('.quiz-feedback');
      const selected = quizForm.querySelector('input[type="radio"]:checked');
      if (!selected) {
        if (feedback) feedback.textContent = 'Choisis une réponse.';
        return;
      }

      const quizKey = quizForm.getAttribute('data-quiz-key') || '';
      let correct = false;

      if (quizKey === 'quiz_endurance_fondamentale') {
        correct = selected.value === 'facile';
      } else if (quizKey === 'quiz_vma') {
        correct = selected.value === 'allures';
      } else if (quizKey === 'quiz_echauffement') {
        correct = selected.value === '5';
      }

      if (!feedback) return;

      if (correct) {
        feedback.textContent = 'Bonne réponse ! +20 XP';
        await addXp(20, 'Quiz réussi');
      } else {
        feedback.textContent = 'Ce n’est pas la bonne réponse, réessaie.';
      }
    });
  }
}

function initAuth() {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      await ensureUserDoc(user);
      updateXpUI();
      setupArticleXpHandlers();
    } else {
      auth.signInAnonymously().catch((error) => {
        console.error('Erreur auth anonyme', error);
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    initAuth();
  } catch (e) {
    console.error(e);
  }
});
