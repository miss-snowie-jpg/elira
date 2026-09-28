export default function matrixRain(canvas, ctx) {
  const drops = [];
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  let fontSize = 10,
    columns = canvas.width / fontSize;
  for (let i = 0; i < columns; i++) {
    drops[i] = 1;
  }
  const update = () => {};
  const render = () => {
    ctx.fillStyle = "rgba(0, 0, 0, .1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < drops.length; i++) {
      let text = letters[Math.floor(Math.random() * letters.length)];
      ctx.fillStyle = "#0f0";
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);
      drops[i]++;
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.95) {
        drops[i] = 0;
      }
    }
  };
  return { update, render };
}
