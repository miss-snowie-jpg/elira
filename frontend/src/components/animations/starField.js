function starField(ctx, canvas, STAR_COUNT = 90, MAX_DISTANCE = 80) {
  let stars = [];

  function resize() {
    canvas.width = window.innerWidth;
  }

  function createStars() {
    stars = [];

    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,

        radius: Math.random() * 2 + 1,

        dx: (Math.random() - 0.5) * 0.05,
        dy: (Math.random() - 0.5) * 0.05,

        alpha: Math.random() * 0.5 + 0.5,
        twinkle: Math.random() * 0.01 + 0.003,
        direction: Math.random() > 0.5 ? 1 : -1,
      });
    }
  }

  function update() {
    for (const star of stars) {
      star.x += star.dx;
      star.y += star.dy;

      if (star.x <= 0 || star.x >= canvas.width) star.dx *= -1;

      if (star.y <= 0 || star.y >= canvas.height) star.dy *= -1;

      star.alpha += star.twinkle * star.direction;

      if (star.alpha > 1) star.direction = -1;
      if (star.alpha < 0.4) star.direction = 1;
    }
  }

  function connectStars() {
    for (const star of stars) {
      const neighbours = stars
        .filter((s) => s !== star)
        .map((s) => ({
          star: s,
          dist: Math.hypot(star.x - s.x, star.y - s.y),
        }))
        .filter((n) => n.dist < MAX_DISTANCE)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 2);

      for (const n of neighbours) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255,255,255,${
          (1 - n.dist / MAX_DISTANCE) * 0.18
        }`;
        ctx.lineWidth = 0.5;
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(n.star.x, n.star.y);
        ctx.stroke();
      }
    }
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    connectStars();

    for (const star of stars) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = "white";

      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${star.alpha})`;
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
    }
  }

  resize();
  createStars();

  function handleResize() {
    resize();
    createStars();
  }

  window.addEventListener("resize", handleResize);

  return {update, render}
}

export default starField