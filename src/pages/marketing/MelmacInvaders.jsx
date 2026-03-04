import { useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

const ALF_ORANGE = '#C84B0A';
const ALF_DARK = '#1C1C1C';
const WHITE = '#FFFFFF';

const CANVAS_W = 480;
const CANVAS_H = 640;

const ENEMY_ROWS = 5;
const ENEMY_COLS = 8;
const ENEMY_SIZE = 32;
const ENEMY_PAD = 8;
const ENEMY_EMOJIS = ['📊', '🗄️', '📋', '📠', '📝'];

const PLAYER_W = 36;
const PLAYER_H = 24;
const BULLET_W = 4;
const BULLET_H = 12;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 7;
const ENEMY_BULLET_SPEED = 3;
const ENEMY_DROP = 16;
const INITIAL_ENEMY_SPEED = 1;
const ENEMY_SHOOT_CHANCE = 0.003; // per enemy per frame

function createEnemies(speedMultiplier = 1) {
  const enemies = [];
  const gridW = ENEMY_COLS * (ENEMY_SIZE + ENEMY_PAD) - ENEMY_PAD;
  const startX = (CANVAS_W - gridW) / 2;
  for (let row = 0; row < ENEMY_ROWS; row++) {
    for (let col = 0; col < ENEMY_COLS; col++) {
      enemies.push({
        x: startX + col * (ENEMY_SIZE + ENEMY_PAD),
        y: 60 + row * (ENEMY_SIZE + ENEMY_PAD),
        w: ENEMY_SIZE,
        h: ENEMY_SIZE,
        alive: true,
        emoji: ENEMY_EMOJIS[row],
      });
    }
  }
  return { enemies, dx: INITIAL_ENEMY_SPEED * speedMultiplier, direction: 1 };
}

function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export default function MelmacInvaders() {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const stateRef = useRef(null);
  const keysRef = useRef({});
  const touchRef = useRef({ left: false, right: false, shoot: false });

  const initGame = useCallback(() => {
    const { enemies, dx, direction } = createEnemies();
    stateRef.current = {
      phase: 'title', // title | playing | gameover
      player: { x: CANVAS_W / 2 - PLAYER_W / 2, y: CANVAS_H - 50, w: PLAYER_W, h: PLAYER_H },
      bullets: [],
      enemyBullets: [],
      enemies,
      enemyDx: dx,
      enemyDir: direction,
      score: 0,
      lives: 3,
      wave: 1,
      highScore: parseInt(localStorage.getItem('melmac_high') || '0', 10),
      shootCooldown: 0,
      lastTime: 0,
    };
  }, []);

  useEffect(() => {
    initGame();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // --- Input ---
    function onKeyDown(e) {
      keysRef.current[e.code] = true;
      if (e.code === 'Space') e.preventDefault();
    }
    function onKeyUp(e) { keysRef.current[e.code] = false; }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Touch handlers
    function handleTouchStart(e) {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        const rect = canvas.getBoundingClientRect();
        const tx = touch.clientX - rect.left;
        const ty = touch.clientY - rect.top;
        const relY = ty / rect.height;
        if (relY < 0.4) {
          touchRef.current.shoot = true;
        } else {
          if (tx < rect.width / 2) touchRef.current.left = true;
          else touchRef.current.right = true;
        }
      }
    }
    function handleTouchEnd(e) {
      e.preventDefault();
      // Simple: clear all on any touch end
      touchRef.current = { left: false, right: false, shoot: false };
    }
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    // --- Game loop ---
    function loop(time) {
      const s = stateRef.current;
      if (!s) return;

      // Delta time (cap at ~33ms to avoid huge jumps on tab switch)
      const dt = s.lastTime ? Math.min(time - s.lastTime, 33) : 16;
      s.lastTime = time;
      const dtScale = dt / 16.67; // normalize to 60fps

      const keys = keysRef.current;
      const touch = touchRef.current;

      // --- Title screen ---
      if (s.phase === 'title') {
        if (keys.Space || touch.shoot) {
          s.phase = 'playing';
          keys.Space = false;
          touch.shoot = false;
        }
        drawTitle(ctx, s);
        frameRef.current = requestAnimationFrame(loop);
        return;
      }

      // --- Game over ---
      if (s.phase === 'gameover') {
        drawGameOver(ctx, s);
        if (keys.Space || touch.shoot) {
          keys.Space = false;
          touch.shoot = false;
          const { enemies, dx, direction } = createEnemies();
          s.phase = 'playing';
          s.player.x = CANVAS_W / 2 - PLAYER_W / 2;
          s.bullets = [];
          s.enemyBullets = [];
          s.enemies = enemies;
          s.enemyDx = dx;
          s.enemyDir = direction;
          s.score = 0;
          s.lives = 3;
          s.wave = 1;
          s.shootCooldown = 0;
        }
        frameRef.current = requestAnimationFrame(loop);
        return;
      }

      // --- Playing ---
      // Player movement
      const moveLeft = keys.ArrowLeft || keys.KeyA || touch.left;
      const moveRight = keys.ArrowRight || keys.KeyD || touch.right;
      if (moveLeft) s.player.x -= PLAYER_SPEED * dtScale;
      if (moveRight) s.player.x += PLAYER_SPEED * dtScale;
      s.player.x = Math.max(0, Math.min(CANVAS_W - PLAYER_W, s.player.x));

      // Shooting
      if (s.shootCooldown > 0) s.shootCooldown -= dtScale;
      const wantsShoot = keys.Space || touch.shoot;
      if (wantsShoot && s.shootCooldown <= 0) {
        s.bullets.push({
          x: s.player.x + PLAYER_W / 2 - BULLET_W / 2,
          y: s.player.y - BULLET_H,
          w: BULLET_W,
          h: BULLET_H,
        });
        s.shootCooldown = 12;
      }

      // Move bullets
      s.bullets = s.bullets.filter(b => {
        b.y -= BULLET_SPEED * dtScale;
        return b.y + b.h > 0;
      });

      // Move enemy bullets
      s.enemyBullets = s.enemyBullets.filter(b => {
        b.y += ENEMY_BULLET_SPEED * dtScale;
        return b.y < CANVAS_H;
      });

      // Enemy movement
      let hitEdge = false;
      const alive = s.enemies.filter(e => e.alive);
      for (const e of alive) {
        e.x += s.enemyDx * s.enemyDir * dtScale;
        if (e.x <= 0 || e.x + e.w >= CANVAS_W) hitEdge = true;
      }
      if (hitEdge) {
        s.enemyDir *= -1;
        for (const e of alive) {
          e.y += ENEMY_DROP;
        }
      }

      // Enemy shooting
      for (const e of alive) {
        if (Math.random() < ENEMY_SHOOT_CHANCE * dtScale) {
          s.enemyBullets.push({
            x: e.x + e.w / 2 - BULLET_W / 2,
            y: e.y + e.h,
            w: BULLET_W,
            h: BULLET_H,
          });
        }
      }

      // Bullet-enemy collision
      for (const b of s.bullets) {
        for (const e of s.enemies) {
          if (e.alive && aabb(b, e)) {
            e.alive = false;
            b.y = -100; // remove
            s.score += 10;
          }
        }
      }

      // Enemy bullet-player collision
      for (const b of s.enemyBullets) {
        if (aabb(b, s.player)) {
          b.y = CANVAS_H + 100;
          s.lives--;
          if (s.lives <= 0) {
            s.phase = 'gameover';
            if (s.score > s.highScore) {
              s.highScore = s.score;
              localStorage.setItem('melmac_high', String(s.score));
            }
          }
        }
      }

      // Enemy reached player row
      for (const e of alive) {
        if (e.y + e.h >= s.player.y) {
          s.lives = 0;
          s.phase = 'gameover';
          if (s.score > s.highScore) {
            s.highScore = s.score;
            localStorage.setItem('melmac_high', String(s.score));
          }
          break;
        }
      }

      // Wave clear
      if (s.enemies.every(e => !e.alive)) {
        s.wave++;
        const speed = 1 + (s.wave - 1) * 0.1;
        const { enemies, dx, direction } = createEnemies(speed);
        s.enemies = enemies;
        s.enemyDx = dx;
        s.enemyDir = direction;
      }

      draw(ctx, s);
      frameRef.current = requestAnimationFrame(loop);
    }

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [initGame]);

  // --- Resize canvas CSS ---
  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scale = Math.min(vw / CANVAS_W, vh / CANVAS_H, 1);
      canvas.style.width = `${CANVAS_W * scale}px`;
      canvas.style.height = `${CANVAS_H * scale}px`;
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div
      style={{ background: ALF_DARK }}
      className="min-h-screen flex flex-col items-center justify-center select-none"
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="block touch-none"
      />
      {/* Overlay buttons for game over — rendered as HTML so Link works */}
      {stateRef.current?.phase === 'gameover' && (
        <div className="absolute bottom-[20%] flex flex-col items-center gap-3">
          {/* These are handled by the canvas + space/tap, but add a visible home link */}
        </div>
      )}
      <Link
        to="/"
        className="fixed bottom-4 text-white/30 text-xs hover:text-white/60 transition-colors"
        style={{ fontFamily: 'monospace' }}
      >
        ← Back to Alf
      </Link>
    </div>
  );
}

// --- Drawing functions ---

function drawTitle(ctx, s) {
  ctx.fillStyle = ALF_DARK;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Title
  ctx.fillStyle = ALF_ORANGE;
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MELMAC INVADERS', CANVAS_W / 2, CANVAS_H / 2 - 80);

  // Subtitle
  ctx.fillStyle = WHITE;
  ctx.font = '14px monospace';
  ctx.fillText('Defend your operations', CANVAS_W / 2, CANVAS_H / 2 - 40);
  ctx.fillText('from manual processes', CANVAS_W / 2, CANVAS_H / 2 - 20);

  // Enemies preview
  const previewEmojis = ENEMY_EMOJIS;
  ctx.font = '24px serif';
  const previewY = CANVAS_H / 2 + 30;
  const spacing = 48;
  const startX = CANVAS_W / 2 - ((previewEmojis.length - 1) * spacing) / 2;
  for (let i = 0; i < previewEmojis.length; i++) {
    ctx.fillText(previewEmojis[i], startX + i * spacing, previewY);
  }

  // Points
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '11px monospace';
  ctx.fillText('10 PTS EACH', CANVAS_W / 2, previewY + 30);

  // Start prompt
  ctx.fillStyle = ALF_ORANGE;
  ctx.font = '16px monospace';
  const blink = Math.sin(Date.now() / 400) > 0;
  if (blink) {
    ctx.fillText('PRESS SPACE TO START', CANVAS_W / 2, CANVAS_H / 2 + 100);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '12px monospace';
    ctx.fillText('or tap to start', CANVAS_W / 2, CANVAS_H / 2 + 125);
  }

  // Controls
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '10px monospace';
  ctx.fillText('← → or A/D to move  ·  SPACE to fire', CANVAS_W / 2, CANVAS_H - 60);
  ctx.fillText('Mobile: tap sides to move, top to shoot', CANVAS_W / 2, CANVAS_H - 40);

  ctx.textAlign = 'left';
}

function drawGameOver(ctx, s) {
  ctx.fillStyle = ALF_DARK;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.textAlign = 'center';

  ctx.fillStyle = ALF_ORANGE;
  ctx.font = 'bold 32px monospace';
  ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 80);

  ctx.fillStyle = WHITE;
  ctx.font = '20px monospace';
  ctx.fillText(`SCORE: ${s.score}`, CANVAS_W / 2, CANVAS_H / 2 - 30);

  if (s.highScore > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '14px monospace';
    ctx.fillText(`HIGH SCORE: ${s.highScore}`, CANVAS_W / 2, CANVAS_H / 2);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '13px monospace';
  ctx.fillText('Or... just let Alf automate this.', CANVAS_W / 2, CANVAS_H / 2 + 50);

  ctx.fillStyle = ALF_ORANGE;
  ctx.font = '16px monospace';
  const blink = Math.sin(Date.now() / 400) > 0;
  if (blink) {
    ctx.fillText('PRESS SPACE TO PLAY AGAIN', CANVAS_W / 2, CANVAS_H / 2 + 100);
  }

  ctx.textAlign = 'left';
}

function draw(ctx, s) {
  // Background
  ctx.fillStyle = ALF_DARK;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Score
  ctx.fillStyle = WHITE;
  ctx.font = '14px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`SCORE: ${s.score}`, CANVAS_W - 16, 28);

  // Wave
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '11px monospace';
  ctx.fillText(`WAVE ${s.wave}`, CANVAS_W / 2, 28);

  // Lives
  ctx.textAlign = 'left';
  ctx.fillStyle = ALF_ORANGE;
  for (let i = 0; i < s.lives; i++) {
    const lx = 16 + i * 28;
    const ly = 16;
    drawShip(ctx, lx, ly, 16, 12);
  }

  // Player
  ctx.fillStyle = ALF_ORANGE;
  drawShip(ctx, s.player.x, s.player.y, PLAYER_W, PLAYER_H);

  // Player bullets
  ctx.fillStyle = ALF_ORANGE;
  for (const b of s.bullets) {
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }

  // Enemy bullets
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (const b of s.enemyBullets) {
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }

  // Enemies
  ctx.font = `${ENEMY_SIZE - 4}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const e of s.enemies) {
    if (!e.alive) continue;
    ctx.fillText(e.emoji, e.x + e.w / 2, e.y + e.h / 2);
  }
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
}

function drawShip(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);          // top center
  ctx.lineTo(x + w, y + h);          // bottom right
  ctx.lineTo(x, y + h);              // bottom left
  ctx.closePath();
  ctx.fill();
}
