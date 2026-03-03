(() => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const TWO_PI = Math.PI * 2;
  const keys = Object.create(null);

  let width = 800;
  let height = 600;
  let stars = [];

  // Spielobjekte und Spielzustand
  const ship = {
    x: width / 2,
    y: height / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: 14,
    invulnerableTime: 0
  };

  let lasers = [];
  let asteroids = [];
  let score = 0;
  let lives = 3;
  let gameOver = false;
  let asteroidTimer = 0;

  // Größenstufen: 3 = groß, 2 = mittel, 1 = klein
  const sizeConfig = {
    3: { radius: 48, points: 20, speedMin: 22, speedMax: 42 },
    2: { radius: 28, points: 50, speedMin: 38, speedMax: 70 },
    1: { radius: 16, points: 100, speedMin: 62, speedMax: 110 }
  };

  // Canvas auf Fullscreen (mindestens 800x600) setzen + Sternenhintergrund neu erzeugen
  function resizeCanvas() {
    width = Math.max(800, window.innerWidth);
    height = Math.max(600, window.innerHeight);

    canvas.width = width;
    canvas.height = height;

    // Mehr Sterne auf größeren Flächen
    const starCount = Math.floor((width * height) / 5500);
    stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + 0.2,
      a: Math.random() * 0.7 + 0.25
    }));
  }

  // Wrap-Around an den Bildschirmrändern
  function wrap(obj) {
    if (obj.x < 0) obj.x += width;
    if (obj.x >= width) obj.x -= width;
    if (obj.y < 0) obj.y += height;
    if (obj.y >= height) obj.y -= height;
  }

  function randRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  // Asteroid mit zufälliger Geschwindigkeit/Rotation erstellen
  function createAsteroid(size, x, y) {
    const cfg = sizeConfig[size];
    const speed = randRange(cfg.speedMin, cfg.speedMax);
    const angle = Math.random() * TWO_PI;

    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      radius: cfg.radius,
      points: cfg.points,
      spin: randRange(-1.2, 1.2),
      rotation: Math.random() * TWO_PI,
      jagged: Array.from({ length: 11 }, () => randRange(0.72, 1.18))
    };
  }

  // Asteroid zufällig am Rand spawnen
  function spawnEdgeAsteroid(size = 3) {
    const edge = Math.floor(Math.random() * 4);
    let x;
    let y;

    if (edge === 0) {
      x = randRange(0, width);
      y = -10;
    } else if (edge === 1) {
      x = width + 10;
      y = randRange(0, height);
    } else if (edge === 2) {
      x = randRange(0, width);
      y = height + 10;
    } else {
      x = -10;
      y = randRange(0, height);
    }

    asteroids.push(createAsteroid(size, x, y));
  }

  function spawnInitialWave() {
    asteroids.length = 0;
    for (let i = 0; i < 4; i += 1) spawnEdgeAsteroid(3);
  }

  function resetGame() {
    score = 0;
    lives = 3;
    gameOver = false;
    lasers = [];
    asteroidTimer = 0;

    ship.x = width / 2;
    ship.y = height / 2;
    ship.vx = 0;
    ship.vy = 0;
    ship.angle = -Math.PI / 2;
    ship.invulnerableTime = 1.5;

    spawnInitialWave();
  }

  function fireLaser() {
    if (gameOver || lasers.length > 7) return;

    const speed = 420;
    lasers.push({
      x: ship.x + Math.cos(ship.angle) * (ship.radius + 2),
      y: ship.y + Math.sin(ship.angle) * (ship.radius + 2),
      vx: Math.cos(ship.angle) * speed + ship.vx,
      vy: Math.sin(ship.angle) * speed + ship.vy,
      life: 0.85,
      radius: 2
    });
  }

  // Treffer auf Asteroid: Punkte + Split in zwei kleinere Asteroiden
  function splitAsteroid(index) {
    const hit = asteroids[index];
    score += hit.points;

    const nextSize = hit.size - 1;
    asteroids.splice(index, 1);

    if (nextSize >= 1) {
      for (let i = 0; i < 2; i += 1) {
        const child = createAsteroid(nextSize, hit.x, hit.y);
        child.vx += randRange(-25, 25);
        child.vy += randRange(-25, 25);
        asteroids.push(child);
      }
    }
  }

  // Schiff getroffen: Leben runter + kurze Unverwundbarkeit
  function hitShip() {
    if (ship.invulnerableTime > 0 || gameOver) return;

    lives -= 1;
    ship.x = width / 2;
    ship.y = height / 2;
    ship.vx = 0;
    ship.vy = 0;
    ship.invulnerableTime = 2.2;

    if (lives <= 0) gameOver = true;
  }

  function update(dt) {
    // Drehen
    if (keys.ArrowLeft) ship.angle -= 3.6 * dt;
    if (keys.ArrowRight) ship.angle += 3.6 * dt;

    // Schub
    if (!gameOver && keys.ArrowUp) {
      const thrust = 190;
      ship.vx += Math.cos(ship.angle) * thrust * dt;
      ship.vy += Math.sin(ship.angle) * thrust * dt;
    }

    // Reibung + Bewegung
    ship.vx *= 0.992;
    ship.vy *= 0.992;
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    wrap(ship);

    if (ship.invulnerableTime > 0) ship.invulnerableTime -= dt;

    // Laser updaten
    for (let i = lasers.length - 1; i >= 0; i -= 1) {
      const l = lasers[i];
      l.x += l.vx * dt;
      l.y += l.vy * dt;
      l.life -= dt;
      wrap(l);
      if (l.life <= 0) lasers.splice(i, 1);
    }

    // Asteroiden updaten
    for (let i = asteroids.length - 1; i >= 0; i -= 1) {
      const a = asteroids[i];
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.rotation += a.spin * dt;
      wrap(a);
    }

    // Laser-Asteroid-Kollision
    for (let li = lasers.length - 1; li >= 0; li -= 1) {
      const l = lasers[li];

      for (let ai = asteroids.length - 1; ai >= 0; ai -= 1) {
        const a = asteroids[ai];
        const dx = l.x - a.x;
        const dy = l.y - a.y;
        if (dx * dx + dy * dy <= (a.radius + l.radius) ** 2) {
          splitAsteroid(ai);
          lasers.splice(li, 1);
          break;
        }
      }
    }

    // Schiff-Asteroid-Kollision
    if (!gameOver) {
      for (let i = 0; i < asteroids.length; i += 1) {
        const a = asteroids[i];
        const dx = ship.x - a.x;
        const dy = ship.y - a.y;
        const hitRadius = ship.radius + a.radius * 0.86;
        if (dx * dx + dy * dy <= hitRadius * hitRadius) {
          hitShip();
          break;
        }
      }
    }

    // Nachschub an Asteroiden je nach Score
    asteroidTimer += dt;
    const targetCount = 4 + Math.floor(score / 400);
    if (!gameOver && asteroidTimer > 2.4 && asteroids.length < targetCount) {
      asteroidTimer = 0;
      spawnEdgeAsteroid(3);
    }
  }

  function drawStars() {
    for (const s of stars) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = "#d8e6ff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawShip() {
    // Blinken während Unverwundbarkeit
    const blink = ship.invulnerableTime > 0 && Math.floor(ship.invulnerableTime * 12) % 2 === 0;
    if (blink && !gameOver) return;

    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle + Math.PI / 2);

    ctx.strokeStyle = "#9de7ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -ship.radius);
    ctx.lineTo(ship.radius * 0.75, ship.radius);
    ctx.lineTo(0, ship.radius * 0.45);
    ctx.lineTo(-ship.radius * 0.75, ship.radius);
    ctx.closePath();
    ctx.stroke();

    // Schubflamme
    if (keys.ArrowUp && !gameOver) {
      ctx.strokeStyle = "#ffad66";
      ctx.beginPath();
      ctx.moveTo(-5, ship.radius - 1);
      ctx.lineTo(0, ship.radius + randRange(8, 14));
      ctx.lineTo(5, ship.radius - 1);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawAsteroid(a) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rotation);
    ctx.strokeStyle = "#b2bfd8";
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < a.jagged.length; i += 1) {
      const angle = (i / a.jagged.length) * TWO_PI;
      const r = a.radius * a.jagged[i];
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }

    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function drawLasers() {
    ctx.fillStyle = "#ff6d6d";
    for (const l of lasers) {
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.radius + 1, 0, TWO_PI);
      ctx.fill();
    }
  }

  function drawHud() {
    ctx.fillStyle = "#e8eefb";
    ctx.font = "600 22px system-ui, sans-serif";
    ctx.fillText(`Score: ${score}`, 18, 34);
    ctx.fillText(`Lives: ${Math.max(lives, 0)}`, 18, 64);

    ctx.font = "500 15px system-ui, sans-serif";
    ctx.fillStyle = "#a9b6d6";
    ctx.fillText("Controls: ←/→ drehen, ↑ Schub, Space schießen, R Neustart", 18, height - 20);

    if (gameOver) {
      ctx.textAlign = "center";
      ctx.fillStyle = "#ff9d9d";
      ctx.font = "700 56px system-ui, sans-serif";
      ctx.fillText("GAME OVER", width / 2, height / 2 - 12);
      ctx.fillStyle = "#f5f7ff";
      ctx.font = "500 24px system-ui, sans-serif";
      ctx.fillText("Press R to restart", width / 2, height / 2 + 28);
      ctx.textAlign = "start";
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    drawStars();
    for (const asteroid of asteroids) drawAsteroid(asteroid);
    drawLasers();
    drawShip();
    drawHud();
  }

  let lastTime = 0;
  function frame(ts) {
    const dt = Math.min((ts - lastTime) / 1000 || 0, 0.033);
    lastTime = ts;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  window.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(e.code)) {
      e.preventDefault();
    }

    if (e.code === "Space") fireLaser();
    if (e.code === "KeyR") resetGame();

    keys[e.code === "Space" ? "Space" : e.key] = true;
  });

  window.addEventListener("keyup", (e) => {
    keys[e.code === "Space" ? "Space" : e.key] = false;
  });

  // Bei Resize Spielobjekte proportional verschieben
  window.addEventListener("resize", () => {
    const oldW = width;
    const oldH = height;
    resizeCanvas();

    const sx = width / oldW;
    const sy = height / oldH;

    ship.x *= sx;
    ship.y *= sy;

    for (const asteroid of asteroids) {
      asteroid.x *= sx;
      asteroid.y *= sy;
    }
    for (const laser of lasers) {
      laser.x *= sx;
      laser.y *= sy;
    }
  });

  resizeCanvas();
  resetGame();
  requestAnimationFrame(frame);
})();
