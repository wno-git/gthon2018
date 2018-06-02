PShader reiska;

void setup() {
    size(1920, 1080, P3D);

    reiska = loadShader("reiska.frag");
    reiska.set("resolution", float(width), float(height));
}

void draw() {
    background(0);

    reiska.set("time", millis() / 1000.0);

    shader(reiska);
    rect(0, 0, width, height);
}
