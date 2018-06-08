import moonlander.library.*;

import ddf.minim.*;

PShader reiska;

Moonlander moonlander;

int BPM = 128;

void setup() {
    size(1280, 720, P3D);

    reiska = loadShader("reiska.frag");
    reiska.set("resolution", float(width), float(height));

    moonlander = Moonlander.initWithSoundtrack(this, "Decktonic_-_05_-_Minimize_Me_feat_Daniel_Davis.mp3", 128, 8);
    moonlander.start();
}

void draw() {
    background(0);

    moonlander.update();

    float time = (float) moonlander.getCurrentTime();

    reiska.set("time", time);

    shader(reiska);
    rect(0, 0, width, height);
}
