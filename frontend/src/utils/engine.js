class Engine {
  constructor() {
    this.renderers = [];
    this.shaders = [];
    this.animId = null;
    this.running = false;
  }
  add(sys) {
    this.renderers.push(sys);
  }
  remove(sys) {
    this.renderers = this.renderers.filter((s) => s !== sys);
  }
  addShader(shader, canvas) {
    let ctx = canvas.getContext("webgl2");
    this.shaders.push(shader(ctx));
  }
  removeShader(shader) {
    this.shaders = this.shaders.filter((s) => s !== shader);
  }
  start() {
    if (this.running) return;

    this.running = true;
    const loop = (time) => {
      if (!this.running) return;
      for (const renderer of this.renderers) {
        renderer.update?.(time);
        renderer.render?.(time);
      }
      this.animId = requestAnimationFrame(loop);
    };
    loop()
  }
  stop() {
    this.running = false;
    cancelAnimationFrame(this.animId);
    for (const renderer of this.renderers) {
      renderer.stop();
    }
    for (const shader of this.shaders) {
      shader.stop();
    }
  }
}
export default Engine;
