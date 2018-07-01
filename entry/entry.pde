import moonlander.library.*;

import ddf.minim.*;

PShader reiska;

PFont titleFont;
PFont creditsFont;
PFont finePrint;

Moonlander moonlander;

int BPM = 128;

void setup() {
    //size(1280, 720, P3D);
    fullScreen(P3D);

    noCursor();

    titleFont = createFont("Exo-Light.ttf", 64);
    creditsFont = createFont("Exo-Light.ttf", 46);
    finePrint = createFont("Exo-Light.ttf", 26);

    reiska = loadShader("reiska.frag");
    reiska.set("resolution", float(width), float(height));

    moonlander = Moonlander.initWithSoundtrack(this,
        "Decktonic_-_05_-_Minimize_Me_feat_Daniel_Davis_final.mp3", BPM, 8);
    moonlander.start();
}

void draw() {
    moonlander.update();

    /* utility */

    float time = (float) moonlander.getCurrentTime();
    float camRotX = (float) moonlander.getValue("camRotX");
    float camRotY = (float) moonlander.getValue("camRotY");
    float camRotZ = (float) moonlander.getValue("camRotZ");
    float camPosX = (float) moonlander.getValue("camPosX");
    float camPosZ = (float) moonlander.getValue("camPosZ");
    float debugU = (float) moonlander.getValue("debug");
    float fovAdjust = (float) moonlander.getValue("fovAdjust");
    int showTitle = moonlander.getIntValue("showTitle");

    float beat = time * (BPM / 60.0);

    /* art */
    float tunnelDistance = (float) moonlander.getValue("tunnelDistance");
    float tunnelWidth = (float) moonlander.getValue("tunnelWidth");
    float fogDistance = (float) moonlander.getValue("fogDistance");
    float blobDisplace = (float) moonlander.getValue("blobDisplace");
    float blobRotationSpeed = (float) moonlander.getValue("blobRotationSpeed");
    float blobBlink = (float) moonlander.getValue("blobBlink");
    float blobSpread = (float) moonlander.getValue("blobSpread");
    float blobShake = (float) moonlander.getValue("blobShake");
    float tunnelBlink = (float) moonlander.getValue("tunnelBlink");
    float fadeout = (float) moonlander.getValue("fadeout");
    float blobZ = (float) moonlander.getValue("blobZ");

    reiska.set("U_TIME", time);
    reiska.set("U_BEAT", beat);
    reiska.set("U_CAMROT_X", camRotX);
    reiska.set("U_CAMROT_Y", camRotY);
    reiska.set("U_CAMROT_Z", camRotZ);
    reiska.set("U_CAMPOS_X", camPosX);
    reiska.set("U_CAMPOS_Z", camPosZ);
    reiska.set("U_FOVADJUST", fovAdjust);
    reiska.set("U_TUNNEL_DISTANCE", tunnelDistance);
    reiska.set("U_TUNNEL_WIDTH", tunnelWidth);
    reiska.set("U_TUNNEL_BLINK", tunnelBlink);
    reiska.set("U_FOG_DISTANCE", fogDistance);
    reiska.set("U_BLOB_DISPLACE", blobDisplace);
    reiska.set("U_BLOB_ROTSPEED", blobRotationSpeed);
    reiska.set("U_BLOB_BLINK", blobBlink);
    reiska.set("U_BLOB_SPREAD", blobSpread);
    reiska.set("U_BLOB_SHAKE", blobShake);
    reiska.set("U_FADEOUT", fadeout);
    reiska.set("U_BLOB_Z", blobZ);
    reiska.set("U_DEBUG", debugU);

    if (showTitle == 0) {
        background(0);
        shader(reiska);

        rect(0, 0, width, height);
    } else if (showTitle == 1) {
        background(255);
        resetShader();

        fill(16);
        textFont(titleFont);
        text("Infection", width * 0.15, height * 0.75);
        textFont(creditsFont);
        text("by Substandard", width * 0.15, height * 0.8);
        textFont(finePrint);
        text("music: Decktonic - Minimize Me (feat. Daniel Davis)",
            width * 0.15, height * 0.87);
    } else if (showTitle == 666) {
        exit();
    }
}
