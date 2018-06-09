import moonlander.library.*;

import ddf.minim.*;

PShader reiska;

Moonlander moonlander;

int BPM = 128;

void setup() {
    size(720, 480, P3D);

    reiska = loadShader("reiska.frag");
    reiska.set("resolution", float(width), float(height));

    moonlander = Moonlander.initWithSoundtrack(this,
        "Decktonic_-_05_-_Minimize_Me_feat_Daniel_Davis_start_at_beat.mp3", BPM, 8);
    moonlander.start();
}

void draw() {
    background(0);

    moonlander.update();

    /* utility */

    float time = (float) moonlander.getCurrentTime();
    float camRotX = (float) moonlander.getValue("camRotX");
    float camRotY = (float) moonlander.getValue("camRotY");
    float camRotZ = (float) moonlander.getValue("camRotZ");
    float debugU = (float) moonlander.getValue("debug");

    float beat = time * (BPM / 60.0);

    /* art */
    float tunnelDistance = (float) moonlander.getValue("tunnelDistance");
    float tunnelWidth = (float) moonlander.getValue("tunnelWidth");
    float fogDistance = (float) moonlander.getValue("fogDistance");
    float blobDisplace = (float) moonlander.getValue("blobDisplace");

    reiska.set("U_TIME", time);
    reiska.set("U_BEAT", beat);
    reiska.set("U_CAMROT_X", camRotX);
    reiska.set("U_CAMROT_Y", camRotY);
    reiska.set("U_CAMROT_Z", camRotZ);
    reiska.set("U_TUNNEL_DISTANCE", tunnelDistance);
    reiska.set("U_TUNNEL_WIDTH", tunnelWidth);
    reiska.set("U_FOG_DISTANCE", fogDistance);
    reiska.set("U_BLOB_DISPLACE", blobDisplace);
    reiska.set("U_DEBUG", debugU);

    shader(reiska);
    rect(0, 0, width, height);
}
